require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const sharp = require('sharp');

// Import middleware
const validateApiKey = require('./middleware/auth');
const { generalLimiter, imageLimiter } = require('./middleware/rateLimiter');
const { 
  validateQcImagesRequest, 
  validateImageRequest, 
  handleValidationErrors 
} = require('./middleware/validator');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy (important for rate limiting behind reverse proxy)
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
  maxAge: 86400, // 24 hours
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
  return `${BASE_URL}/api/image?url=${encodeURIComponent(originalUrl)}&quality=${quality}&format=${format}&width=${width}`;
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'QC Image API - Production',
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
      example: `${BASE_URL}/api/qc-images?id=7494645791&apiKey=YOUR_API_KEY`
    }
  });
});

// Main API endpoint - Protected with authentication and rate limiting
app.get('/api/qc-images', 
  validateApiKey,
  generalLimiter,
  validateQcImagesRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id, storePlatform = 'WEIDIAN', quality = 90, format = 'png', width = 960 } = req.query;

      // Fetch data from Doppel API
      const doppelUrl = `https://doppel.fit/api/v1/products/qcMedia?id=${id}&storePlatform=${storePlatform}`;
      console.log(`Fetching from: ${doppelUrl}`);
      
      const response = await axios.get(doppelUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'QC-Image-API/1.0'
        }
      });
      
      // Extract image URLs from response
      const imageUrls = extractImageUrls(response.data);

      if (imageUrls.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No images found in the response'
        });
      }

      // Transform all image URLs to point to our local server
      const transformedImages = imageUrls.map(url => ({
        original: url,
        watermarked: createLocalImageUrl(url, quality, format, width)
      }));

      // Return the result
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

// Image proxy endpoint with watermark - Protected with rate limiting
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

      // Fetch the image from Doppel
      const response = await axios.get(doppelImageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000, // 15 second timeout for images
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'QC-Image-API/1.0'
        }
      });

      let imageBuffer = Buffer.from(response.data);

      // Add watermark if requested (enabled by default)
      if (watermark !== 'false') {
        try {
          const watermarkText = process.env.WATERMARK_TEXT || 'WATERMARK';
          const watermarkOpacity = parseFloat(process.env.WATERMARK_OPACITY || '0.5');
          
          // Get image metadata
          const metadata = await sharp(imageBuffer).metadata();
          
          // Calculate responsive font size based on image width
          const fontSize = Math.max(24, Math.min(72, metadata.width / 15));
          
          // Create an SVG watermark
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

          // Composite the watermark onto the image
          imageBuffer = await sharp(imageBuffer)
            .composite([{
              input: Buffer.from(svgWatermark),
              gravity: 'center'
            }])
            .toBuffer();

        } catch (watermarkError) {
          console.error('Error adding watermark:', watermarkError.message);
          // Continue without watermark if there's an error
        }
      }

      // Set appropriate headers
      const contentType = response.headers['content-type'] || `image/${format}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Send the image
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

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
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

// Start server
app.listen(PORT, () => {
  console.log('==============================================');
  console.log(`🚀 QC Image API Server`);
  console.log('==============================================');
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('==============================================');
  
  if (!process.env.API_KEYS && NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: No API keys configured in production!');
    console.warn('⚠️  Run: npm run generate-key');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
