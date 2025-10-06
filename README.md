# QC Image API

A secure, production-ready API service that fetches product images from Doppel's QC Media API, adds watermarks, and transforms them into optimized web-ready formats.

## Features

- 🔒 **Secure**: API key authentication, rate limiting, input validation
- 🖼️ **Watermarking**: Automatic watermark overlay on all images
- 🚀 **Performance**: Compression, caching, and optimized image processing
- 📊 **Production-Ready**: Error handling, logging, and monitoring
- 🛡️ **Security Headers**: Helmet.js for enhanced security
- ⚡ **Fast**: Image optimization with Sharp library

## Quick Start

### 1. Install dependencies:
```bash
npm install
```

### 2. Generate API Key (Production):
```bash
npm run generate-key
```

### 3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your generated API key and settings
```

### 4. Start the server:

**Development (no authentication):**
```bash
npm run dev:watermark
```

**Production (with authentication):**
```bash
npm run start:production
```

## Usage

### Start the server

**Basic version (without watermark):**
```bash
npm start
```

**With watermark support:**
```bash
npm run start:watermark
```

Development mode with auto-reload:
```bash
npm run dev              # Basic version
npm run dev:watermark    # With watermark
```

The server will start on port 3000 by default (or the PORT environment variable if set).

### API Endpoints

#### GET /api/qc-images

Fetches product images and returns transformed URLs.

**Authentication:** Required (API Key)

**Required Parameters:**
- `id` - Product ID (e.g., 7494645791)

**Optional Parameters:**
- `storePlatform` - Store platform (default: WEIDIAN)
- `quality` - Image quality 1-100 (default: 90)
- `format` - Image format (default: png)
- `width` - Image width in pixels (default: 960)

**Authentication Methods:**

1. Using Header (Recommended):
```bash
curl -H "X-API-Key: your_api_key" \
  "http://localhost:3000/api/qc-images?id=7494645791"
```

2. Using Query Parameter:
```bash
curl "http://localhost:3000/api/qc-images?id=7494645791&apiKey=your_api_key"
```

**Example Response:**
```json
{
  "success": true,
  "productId": "7494645791",
  "storePlatform": "WEIDIAN",
  "totalImages": 4,
  "images": [
    {
      "original": "n4EYdIoE",
      "watermarked": "http://localhost:3000/api/image?url=n4EYdIoE&quality=90&format=png&width=960"
    },
    {
      "original": "QdgC1ARB",
      "watermarked": "http://localhost:3000/api/image?url=QdgC1ARB&quality=90&format=png&width=960"
    },
    {
      "original": "wpddooRU",
      "watermarked": "http://localhost:3000/api/image?url=wpddooRU&quality=90&format=png&width=960"
    },
    {
      "original": "cR-eVGrQ",
      "watermarked": "http://localhost:3000/api/image?url=cR-eVGrQ&quality=90&format=png&width=960"
    }
  ]
}
```

**Note:** The `watermarked` URLs point to YOUR server, which will add a watermark before serving the image.

#### GET /api/image

Serves an individual image with watermark applied (used internally by the transformed URLs).

**Parameters:**
- `url` - The original image URL from Doppel
- `quality` - Image quality (default: 60)
- `format` - Image format (default: webp)
- `width` - Image width (default: 960)
- `watermark` - Enable/disable watermark: 'true' or 'false' (default: true)

**Example:**
```bash
curl "http://localhost:3000/api/image?url=n4EYdIoE&quality=90&format=png&width=960"
```

This endpoint returns the actual image file with watermark applied.

#### GET /health

Health check endpoint.

**Example:**
```bash
curl "http://localhost:3000/health"
```

#### GET /

Returns API usage information.

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing required parameters)
- `404` - No images found
- `500` - Internal Server Error
- `503` - Service Unavailable (cannot reach Doppel API)

## Example Usage in Your Application

### JavaScript/Fetch
```javascript
fetch('http://localhost:3000/api/qc-images?id=7494645791')
  .then(response => response.json())
  .then(data => {
    console.log(`Found ${data.totalImages} images`);
    data.images.forEach(img => {
      console.log('Transformed URL:', img.transformed);
    });
  });
```

### Python
```python
import requests

response = requests.get('http://localhost:3000/api/qc-images', params={'id': '7494645791'})
data = response.json()

for img in data['images']:
    print(f"Transformed URL: {img['transformed']}")
```

## Customizing the Watermark

To customize your watermark, edit the `server-with-watermark.js` file:

```javascript
// Line ~150 - Change the watermark text
const watermarkText = 'YOUR WATERMARK'; // Change this to your desired watermark

// Customize the SVG styling
const svgWatermark = `
  <svg width="${metadata.width}" height="${metadata.height}">
    <style>
      .watermark { 
        fill: rgba(255, 255, 255, 0.5);  // Change color and opacity
        font-size: 48px;                  // Change size
        font-weight: bold;                // Change weight
        font-family: Arial, sans-serif;   // Change font
      }
    </style>
    <text x="50%" y="50%" text-anchor="middle" class="watermark">${watermarkText}</text>
  </svg>
`;
```

You can also use an image watermark instead:
- Place your watermark image (e.g., `watermark.png`) in the project folder
- Replace the SVG composite with: `{ input: 'watermark.png', gravity: 'southeast' }`

## 🔒 Security Features

### Authentication
- API key-based authentication
- Multiple API keys support
- Header or query parameter authentication

### Rate Limiting
- General API: 100 requests per 15 minutes
- Image API: 300 requests per 15 minutes
- Configurable per endpoint

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Content Security Policy
- XSS Protection

### Input Validation
- Request parameter validation
- Input sanitization
- Error handling

## 📋 Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000
BASE_URL=https://api.yourdomain.com

# Security
API_KEYS=your_api_key_1,your_api_key_2

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Watermark
WATERMARK_TEXT=© Your Company
WATERMARK_OPACITY=0.5
```

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production deployment instructions including:
- VPS deployment with PM2
- Heroku deployment
- Nginx reverse proxy setup
- SSL configuration
- Monitoring and logging

## 📚 Project Structure

```
qc-api/
├── production-server.js    # Production server with security
├── server-with-watermark.js # Development server with watermark
├── server.js               # Basic server
├── middleware/
│   ├── auth.js            # API key authentication
│   ├── rateLimiter.js     # Rate limiting rules
│   └── validator.js       # Input validation
├── scripts/
│   └── generate-api-key.js # API key generator
├── ecosystem.config.js     # PM2 configuration
├── Procfile               # Heroku configuration
├── .env                   # Environment variables (not in git)
├── .env.example           # Example environment file
└── DEPLOYMENT.md          # Deployment guide
```

## License

ISC
# QC-API
