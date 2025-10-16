const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to extract image URLs from the response
function extractImageUrls(data) {
  const imageUrls = [];
  
  if (!data || !data.data) {
    return imageUrls;
  }

  // Recursively search for "image" properties in the data
  function searchForImages(obj) {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // If current object has an "image" property, add it
    if (obj.image && typeof obj.image === 'string') {
      imageUrls.push(obj.image);
    }

    // Recursively search in nested objects and arrays
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

// Helper function to create local image URLs (that will go through watermark)
function createLocalImageUrl(originalUrl, quality = 60, format = 'webp', width = 960) {
  return `${BASE_URL}/api/image?url=${encodeURIComponent(originalUrl)}&quality=${quality}&format=${format}&width=${width}`;
}

// Main API endpoint
app.get('/api/qc-images', async (req, res) => {
  try {
    const { id, storePlatform = 'WEIDIAN', quality = 60, format = 'webp', width = 960 } = req.query;

    // Validate required parameter
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: id'
      });
    }

    // Fetch data from Doppel API
    const doppelUrl = `https://doppel.fit/api/v1/products/qcMedia?id=${id}&storePlatform=${storePlatform}`;
    console.log(`Fetching from: ${doppelUrl}`);
    
    const response = await axios.get(doppelUrl);
    
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
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return res.status(error.response.status).json({
        success: false,
        error: 'Error fetching data from Doppel API',
        details: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        success: false,
        error: 'No response received from Doppel API'
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// Image proxy endpoint with watermark capability
app.get('/api/image', async (req, res) => {
  try {
    const { url, quality = 60, format = 'webp', width = 960 } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: url'
      });
    }

    // Build the Doppel image transformation URL
    const doppelImageUrl = `https://doppel.fit/img?url=${encodeURIComponent(url)}&quality=${quality}&format=${format}&width=${width}`;
    
    console.log(`Fetching image from: ${doppelImageUrl}`);

    // Fetch the image from Doppel
    const response = await axios.get(doppelImageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'image/*'
      }
    });

    let imageBuffer = response.data;

    // Add watermark if requested
    const watermark = req.query.watermark;
    if (watermark !== 'false') {
      try {
        const fs = require('fs');
        const path = require('path');
        const sharp = require('sharp');
        
        const metadata = await sharp(imageBuffer).metadata();
        console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);
        
        // Prepare watermark images with positioning
        const watermarkComposites = [];
        
        // Try different path strategies
        const possiblePaths = [
          process.cwd(),
          path.join(process.cwd(), '..'),
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
    
    // Set appropriate headers
    const contentType = response.headers['content-type'] || `image/${format}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Send the image
    res.send(imageBuffer);

  } catch (error) {
    console.error('Error fetching image:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: 'Error fetching image from source'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint with usage instructions
app.get('/', (req, res) => {
  res.json({
    message: 'QC Image API - Multi-Platform Support',
    version: '1.0.0',
    features: [
      'Supports WEIDIAN, TAOBAO, and 1688 platforms',
      'Automatic watermark application',
      'Custom image quality and format',
      'PNG output at 90% quality by default'
    ],
    endpoints: {
      products: {
        endpoint: '/api/qc-images',
        method: 'GET',
        description: 'Get product images with watermarks',
        required_params: {
          id: 'Product ID'
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
            url: `/api/qc-images?id=7494645791&storePlatform=WEIDIAN`
          },
          {
            platform: 'TAOBAO',
            url: `/api/qc-images?id=979055701113&storePlatform=TAOBAO`
          },
          {
            platform: '1688',
            url: `/api/qc-images?id=829737172123&storePlatform=1688`
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} for usage instructions`);
});
