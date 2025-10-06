const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sharp = require('sharp');

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
function createLocalImageUrl(originalUrl, quality = 90, format = 'png', width = 960) {
  return `${BASE_URL}/api/image?url=${encodeURIComponent(originalUrl)}&quality=${quality}&format=${format}&width=${width}`;
}

// Main API endpoint
app.get('/api/qc-images', async (req, res) => {
  try {
    const { id, storePlatform = 'WEIDIAN', quality = 90, format = 'png', width = 960 } = req.query;

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
    const { url, quality = 90, format = 'png', width = 960, watermark = 'true' } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: url'
      });
    }

    // Build the Doppel image transformation URL with fixed high-quality parameters
    const doppelImageUrl = `https://doppel.fit/img?url=${encodeURIComponent(url)}&quality=100&format=png&width=5000`;
    
    console.log(`Fetching image from: ${doppelImageUrl}`);

    // Fetch the image from Doppel
    const response = await axios.get(doppelImageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'image/*'
      }
    });

    let imageBuffer = Buffer.from(response.data);

    // Add watermark if requested (enabled by default)
    if (watermark !== 'false') {
      try {
        // Create watermark text overlay
        const watermarkText = 'YOUR WATERMARK'; // Change this to your desired watermark
        
        // Get image metadata
        const metadata = await sharp(imageBuffer).metadata();
        
        // Create an SVG watermark
        const svgWatermark = `
          <svg width="${metadata.width}" height="${metadata.height}">
            <style>
              .watermark { 
                fill: rgba(255, 255, 255, 0.5); 
                font-size: 48px; 
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
    message: 'QC Image API',
    usage: {
      endpoint: '/api/qc-images',
      method: 'GET',
      required_params: {
        id: 'Product ID (e.g., 7494645791)'
      },
      optional_params: {
        storePlatform: 'Store platform (default: WEIDIAN)',
        quality: 'Image quality 1-100 (default: 60)',
        format: 'Image format (default: webp)',
        width: 'Image width in pixels (default: 960)'
      },
      example: `/api/qc-images?id=7494645791&storePlatform=WEIDIAN&quality=60&format=webp&width=960`
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} for usage instructions`);
});
