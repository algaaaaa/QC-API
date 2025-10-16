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
    message: 'QC Image API - Multi-Platform Support',
    version: '1.0.0',
    environment: NODE_ENV,
    status: 'active',
    features: [
      'Supports WEIDIAN, TAOBAO, and 1688 platforms',
      'Automatic watermark application',
      'Custom image quality and format',
      'PNG output at 90% quality by default',
      'API key authentication',
      'Rate limiting protection'
    ],
    authentication: {
      method: 'API key required via X-API-Key header or apiKey query parameter',
      note: 'Not required for root and health endpoints'
    },
    endpoints: {
      products: {
        endpoint: '/api/qc-images',
        method: 'GET',
        description: 'Get product images with watermarks',
        required_params: {
          id: 'Product ID',
          apiKey: 'Your API key'
        },
        optional_params: {
          storePlatform: 'WEIDIAN, TAOBAO, or 1688 (default: WEIDIAN)',
          quality: 'Image quality 1-100 (default: 90)',
          format: 'Image format: png, webp, jpeg (default: png)',
          width: 'Image width in pixels (default: 960)',
          watermark: 'Enable watermarks: true or false (default: true)'
        },
        examples: [
          {
            platform: 'WEIDIAN',
            url: `/api/qc-images?id=7494645791&storePlatform=WEIDIAN&apiKey=YOUR_API_KEY`
          },
          {
            platform: 'TAOBAO',
            url: `/api/qc-images?id=979055701113&storePlatform=TAOBAO&apiKey=YOUR_API_KEY`
          },
          {
            platform: '1688',
            url: `/api/qc-images?id=829737172123&storePlatform=1688&apiKey=YOUR_API_KEY`
          }
        ]
      },
      image: {
        endpoint: '/api/image',
        method: 'GET',
        description: 'Get individual watermarked image',
        required_params: {
          url: 'Image URL code from Doppel (e.g., 5DLLi5dI)'
        },
        optional_params: {
          watermark: 'Enable watermarks: true or false (default: true)'
        },
        example: `/api/image?url=5DLLi5dI`
      },
      health: {
        endpoint: '/health',
        method: 'GET',
        description: 'Health check endpoint',
        authentication: 'Not required'
      }
    },
    watermarks: {
      positions: {
        image1: 'Top left corner',
        image2: 'Top right corner',
        image3: 'Bottom right corner'
      },
      size: '15% of image width'
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
          const fs = require('fs');
          const path = require('path');
          
          const metadata = await sharp(imageBuffer).metadata();
          console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);
          
          // Prepare watermark images with positioning
          const watermarkComposites = [];
          
          // Try different path strategies for Vercel compatibility
          const possiblePaths = [
            process.cwd(),
            path.join(process.cwd(), '..'),
            '/var/task',
            __dirname,
            path.join(__dirname, '..')
          ];
          
          let watermarksDir = null;
          for (const basePath of possiblePaths) {
            const testPath = path.join(basePath, 'watermarks');
            if (fs.existsSync(testPath)) {
              watermarksDir = testPath;
              console.log(`Found watermarks directory at: ${testPath}`);
              break;
            }
          }
          
          if (watermarksDir) {
            // Image 1 - Top Left
            const image1Path = path.join(watermarksDir, 'image1.png');
            if (fs.existsSync(image1Path)) {
              console.log('Adding image1.png to top-left');
              const watermark1Buffer = await sharp(image1Path)
                .resize({ width: Math.floor(metadata.width * 0.15) }) // 15% of image width
                .toBuffer();
              const watermark1Meta = await sharp(watermark1Buffer).metadata();
              watermarkComposites.push({
                input: watermark1Buffer,
                top: 10,
                left: 10
              });
            } else {
              console.warn(`image1.png not found at: ${image1Path}`);
            }
            
            // Image 2 - Top Right
            const image2Path = path.join(watermarksDir, 'image2.png');
            if (fs.existsSync(image2Path)) {
              console.log('Adding image2.png to top-right');
              const watermark2Buffer = await sharp(image2Path)
                .resize({ width: Math.floor(metadata.width * 0.15) })
                .toBuffer();
              const watermark2Meta = await sharp(watermark2Buffer).metadata();
              watermarkComposites.push({
                input: watermark2Buffer,
                top: 10,
                left: metadata.width - watermark2Meta.width - 10
              });
            } else {
              console.warn(`image2.png not found at: ${image2Path}`);
            }
            
            // Image 3 - Bottom Right
            const image3Path = path.join(watermarksDir, 'image3.png');
            if (fs.existsSync(image3Path)) {
              console.log('Adding image3.png to bottom-right');
              const watermark3Buffer = await sharp(image3Path)
                .resize({ width: Math.floor(metadata.width * 0.15) })
                .toBuffer();
              const watermark3Meta = await sharp(watermark3Buffer).metadata();
              watermarkComposites.push({
                input: watermark3Buffer,
                top: metadata.height - watermark3Meta.height - 10,
                left: metadata.width - watermark3Meta.width - 10
              });
            } else {
              console.warn(`image3.png not found at: ${image3Path}`);
            }
          } else {
            console.error('Watermarks directory not found. Searched paths:', possiblePaths);
          }
          
          // Apply all watermarks if any exist
          if (watermarkComposites.length > 0) {
            console.log(`Applying ${watermarkComposites.length} watermarks`);
            imageBuffer = await sharp(imageBuffer)
              .composite(watermarkComposites)
              .toBuffer();
            console.log('Watermarks applied successfully');
          } else {
            console.warn('No watermark images found or loaded');
          }

        } catch (watermarkError) {
          console.error('Error adding watermark:', watermarkError.message);
          console.error('Stack trace:', watermarkError.stack);
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
