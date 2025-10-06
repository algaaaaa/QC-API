require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const { query, validationResult } = require('express-validator');

// Inline middleware - API Key Authentication
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
  
  if (validApiKeys.length === 0 && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Warning: No API keys configured. Running in insecure mode.');
    return next();
  }
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key is required. Include it in the X-API-Key header or apiKey query parameter.'
    });
  }
  
  if (!validApiKeys.includes(apiKey.trim())) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }
  
  next();
}

// Inline middleware - Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const imageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: 'Too many image requests',
    message: 'You have exceeded the image request limit. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Inline middleware - Validators
const validateQcImagesRequest = [
  query('id')
    .notEmpty()
    .withMessage('Product ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Product ID must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Product ID contains invalid characters'),
  query('storePlatform')
    .optional()
    .isIn(['WEIDIAN', 'TAOBAO', '1688', 'TMALL'])
    .withMessage('Invalid store platform'),
  query('quality')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Quality must be between 1 and 100'),
  query('format')
    .optional()
    .isIn(['webp', 'jpeg', 'jpg', 'png'])
    .withMessage('Invalid image format'),
  query('width')
    .optional()
    .isInt({ min: 100, max: 2000 })
    .withMessage('Width must be between 100 and 2000 pixels'),
];

const validateImageRequest = [
  query('url')
    .notEmpty()
    .withMessage('Image URL is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('URL is too long'),
  query('quality')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Quality must be between 1 and 100'),
  query('format')
    .optional()
    .isIn(['webp', 'jpeg', 'jpg', 'png'])
    .withMessage('Invalid image format'),
  query('width')
    .optional()
    .isInt({ min: 100, max: 2000 })
    .withMessage('Width must be between 100 and 2000 pixels'),
  query('watermark')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Watermark must be true or false'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const app = express();
const BASE_URL = process.env.BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'production';

// Trust proxy (important for Vercel)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
  maxAge: 86400,
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Parse JSON
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Helper function to extract image URLs from the response
function extractImageUrls(data) {
  const imageUrls = [];
  
  if (!data || !data.data) {
    return imageUrls;
  }

  function searchForImages(obj) {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    if (obj.image && typeof obj.image === 'string') {
      imageUrls.push(obj.image);
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (Array.isArray(obj[key])) {
          obj[key].forEach(item => searchForImages(item));
        } else if (typeof obj[key] === 'object') {
          searchForImages(obj[key]);
        }
      }
    }
  }

  searchForImages(data.data);
  return imageUrls;
}

// Helper function to create local image URLs
function createLocalImageUrl(originalUrl, quality = 90, format = 'png', width = 960) {
  const baseUrl = BASE_URL.startsWith('http') ? BASE_URL : `https://${BASE_URL}`;
  return `${baseUrl}/api/image?url=${encodeURIComponent(originalUrl)}&quality=${quality}&format=${format}&width=${width}`;
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'QC Image API - Vercel Deployment',
    version: '1.0.0',
    environment: NODE_ENV,
    status: 'active',
    documentation: {
      authentication: 'API key required via X-API-Key header or apiKey query parameter',
      endpoints: {
        '/api/qc-images': 'Fetch product images',
        '/api/image': 'Serve watermarked images',
        '/health': 'Health check'
      },
      example: `/api/qc-images?id=7494645791&apiKey=YOUR_API_KEY`
    }
  });
});

// Main API endpoint
app.get('/api/qc-images', 
  validateApiKey,
  generalLimiter,
  validateQcImagesRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id, storePlatform = 'WEIDIAN', quality = 90, format = 'png', width = 960 } = req.query;

      const doppelUrl = `https://doppel.fit/api/v1/products/qcMedia?id=${id}&storePlatform=${storePlatform}`;
      console.log(`Fetching from: ${doppelUrl}`);
      
      const response = await axios.get(doppelUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'QC-Image-API/1.0'
        }
      });
      
      const imageUrls = extractImageUrls(response.data);

      if (imageUrls.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No images found in the response'
        });
      }

      const transformedImages = imageUrls.map(url => ({
        original: url,
        watermarked: createLocalImageUrl(url, quality, format, width)
      }));

      res.json({
        success: true,
        productId: id,
        storePlatform: storePlatform,
        totalImages: transformedImages.length,
        images: transformedImages
      });

    } catch (error) {
      console.error('Error:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          error: 'Error fetching data from Doppel API',
          message: 'Unable to retrieve product data'
        });
      } else if (error.request) {
        return res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable',
          message: 'No response received from external API'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }
);

// Image proxy endpoint with watermark
app.get('/api/image',
  imageLimiter,
  validateImageRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { url, quality = 90, format = 'png', width = 960, watermark = 'true' } = req.query;

      // Build the Doppel image transformation URL with fixed high-quality parameters
      const doppelImageUrl = `https://doppel.fit/img?url=${encodeURIComponent(url)}&quality=100&format=png&width=5000`;
      
      console.log(`Fetching image from: ${doppelImageUrl}`);

      const response = await axios.get(doppelImageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // Increased for large images
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'QC-Image-API/1.0'
        }
      });

      let imageBuffer = Buffer.from(response.data);

      // Add watermark if requested
      if (watermark !== 'false') {
        try {
          const watermarkText = process.env.WATERMARK_TEXT || 'WATERMARK';
          const watermarkOpacity = parseFloat(process.env.WATERMARK_OPACITY || '0.5');
          
          const metadata = await sharp(imageBuffer).metadata();
          const fontSize = Math.max(24, Math.min(72, metadata.width / 15));
          
          const svgWatermark = `
            <svg width="${metadata.width}" height="${metadata.height}">
              <style>
                .watermark { 
                  fill: rgba(255, 255, 255, ${watermarkOpacity}); 
                  font-size: ${fontSize}px; 
                  font-weight: bold; 
                  font-family: Arial, sans-serif;
                }
              </style>
              <text x="50%" y="50%" text-anchor="middle" class="watermark">${watermarkText}</text>
            </svg>
          `;

          imageBuffer = await sharp(imageBuffer)
            .composite([{
              input: Buffer.from(svgWatermark),
              gravity: 'center'
            }])
            .toBuffer();

        } catch (watermarkError) {
          console.error('Error adding watermark:', watermarkError.message);
        }
      }

      const contentType = response.headers['content-type'] || `image/${format}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      res.send(imageBuffer);

    } catch (error) {
      console.error('Error fetching image:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          error: 'Error fetching image from source'
        });
      } else if (error.code === 'ECONNABORTED') {
        return res.status(504).json({
          success: false,
          error: 'Request timeout',
          message: 'Image request took too long'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    platform: 'Vercel'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Export for Vercel
module.exports = app;
