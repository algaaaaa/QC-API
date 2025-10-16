# Multi-Platform Support

The QC Image API supports three major Chinese e-commerce platforms:

## Supported Platforms

### 1. WEIDIAN (微店)
- Platform code: `WEIDIAN`
- Example ID: `7494645791`
- Example URL: `/api/qc-images?id=7494645791&storePlatform=WEIDIAN`

### 2. TAOBAO (淘宝)
- Platform code: `TAOBAO`
- Example ID: `979055701113`
- Example URL: `/api/qc-images?id=979055701113&storePlatform=TAOBAO`

### 3. 1688 (阿里巴巴)
- Platform code: `1688`
- Example ID: `829737172123`
- Example URL: `/api/qc-images?id=829737172123&storePlatform=1688`

## How It Works

The API automatically fetches product images from Doppel.fit API based on the platform and product ID:

```
https://doppel.fit/api/v1/products/qcMedia?id={PRODUCT_ID}&storePlatform={PLATFORM}
```

## Usage Examples

### Local Development

#### WEIDIAN
```bash
curl "http://localhost:3000/api/qc-images?id=7494645791&storePlatform=WEIDIAN"
```

#### TAOBAO
```bash
curl "http://localhost:3000/api/qc-images?id=979055701113&storePlatform=TAOBAO"
```

#### 1688
```bash
curl "http://localhost:3000/api/qc-images?id=829737172123&storePlatform=1688"
```

### Vercel Production (with API Key)

#### WEIDIAN
```bash
curl "https://qc-api-seven.vercel.app/api/qc-images?id=7494645791&storePlatform=WEIDIAN&apiKey=YOUR_API_KEY"
```

#### TAOBAO
```bash
curl "https://qc-api-seven.vercel.app/api/qc-images?id=979055701113&storePlatform=TAOBAO&apiKey=YOUR_API_KEY"
```

#### 1688
```bash
curl "https://qc-api-seven.vercel.app/api/qc-images?id=829737172123&storePlatform=1688&apiKey=YOUR_API_KEY"
```

## Response Format

All platforms return the same JSON structure:

```json
{
  "success": true,
  "productId": "7494645791",
  "storePlatform": "WEIDIAN",
  "totalImages": 3,
  "images": [
    {
      "original": "5DLLi5dI",
      "watermarked": "https://your-api.com/api/image?url=5DLLi5dI&quality=90&format=png&width=960"
    },
    {
      "original": "JXInfYz9",
      "watermarked": "https://your-api.com/api/image?url=JXInfYz9&quality=90&format=png&width=960"
    }
  ]
}
```

## Default Platform

If no `storePlatform` parameter is provided, the API defaults to **WEIDIAN**.

## Image Processing

Regardless of the platform, all images go through the same processing pipeline:

1. **Fetched from Doppel** at maximum quality (quality=100, format=png, width=5000)
2. **Watermarks applied** (3 custom watermarks at top-left, top-right, and bottom-right)
3. **Optimized and served** (default: quality=90, format=png, width=960)

## Additional Parameters

You can customize the output for any platform:

- `quality`: Image quality 1-100 (default: 90)
- `format`: Output format - png, webp, jpeg (default: png)
- `width`: Image width in pixels (default: 960)
- `watermark`: Enable/disable watermarks - true/false (default: true)

### Example with custom parameters:
```
/api/qc-images?id=7494645791&storePlatform=TAOBAO&quality=80&format=jpeg&width=1200
```

## Testing

Test all platforms with the included script:

```bash
# Test WEIDIAN
curl "http://localhost:3000/api/qc-images?id=7494645791&storePlatform=WEIDIAN"

# Test TAOBAO
curl "http://localhost:3000/api/qc-images?id=979055701113&storePlatform=TAOBAO"

# Test 1688
curl "http://localhost:3000/api/qc-images?id=829737172123&storePlatform=1688"

# Test individual image
curl "http://localhost:3000/api/image?url=5DLLi5dI" -o test.png
```
