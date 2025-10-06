# 🔄 API URL Structure Update

## How It Works Now

### Your API URLs (What users see)
**Remain the same and customizable:**
```
http://localhost:3000/api/image?url=IMAGE_ID&quality=90&format=png&width=960
```

Users can still pass their own parameters: `quality`, `format`, `width`

---

### Doppel API Calls (Behind the scenes)
**Always uses maximum quality settings:**
```
https://doppel.fit/img?url=IMAGE_ID&quality=100&format=png&width=5000
```

**Fixed parameters sent to Doppel:**
- `quality=100` (maximum quality)
- `format=png` (lossless)
- `width=5000` (maximum size)

---

## What Changed

### Before:
```javascript
// Your API parameters were passed directly to Doppel
User requests: quality=90, format=webp, width=960
Doppel receives: quality=90, format=webp, width=960
```

### After:
```javascript
// Your API accepts parameters but Doppel always gets maximum quality
User requests: quality=90, format=png, width=960
Doppel receives: quality=100, format=png, width=5000 (ALWAYS)
```

---

## Why This Approach?

✅ **Maximum Source Quality**: Always fetch highest quality from Doppel  
✅ **Your Control**: You can still process/resize on your server  
✅ **Future-Proof**: Have high-quality source for any use case  
✅ **Flexibility**: Can resize down later without quality loss  

---

## Example Flow

### User makes request:
```bash
curl -H "X-API-Key: YOUR_KEY" \
  "http://localhost:3000/api/qc-images?id=7494645791"
```

### Your API returns:
```json
{
  "images": [
    {
      "original": "8AjbL7MT",
      "watermarked": "http://localhost:3000/api/image?url=8AjbL7MT&quality=90&format=png&width=960"
    }
  ]
}
```

### When image is requested:
1. User browser loads: `http://localhost:3000/api/image?url=8AjbL7MT&quality=90&format=png&width=960`
2. **Your server fetches from Doppel**: `https://doppel.fit/img?url=8AjbL7MT&quality=100&format=png&width=5000`
3. Your server adds watermark to the high-quality image
4. Your server serves the watermarked image to user

---

## Benefits

### 🎯 High Quality Source
- Always get the best possible image from Doppel
- No quality loss from multiple conversions
- Large source for any processing needs

### 🎨 Your Processing
- Watermark applied to high-quality image
- Can resize down if needed
- Better watermark quality

### 💾 Larger Files
⚠️ **Note**: Images from Doppel will be much larger now
- PNG at quality 100, width 5000 = potentially 5-10MB per image
- Consider caching strategy
- May need larger timeouts

---

## Configuration

### Current Setup:
```javascript
// In production-server.js and server-with-watermark.js
const doppelImageUrl = `https://doppel.fit/img?url=${encodeURIComponent(url)}&quality=100&format=png&width=5000`;
```

### To Change Doppel Parameters:
Edit both server files and modify:
```javascript
quality=100  // Change to desired quality (1-100)
format=png   // Change to: png, webp, jpeg
width=5000   // Change to desired max width
```

---

## Performance Considerations

### Timeout Settings
You may want to increase timeouts due to larger files:

**Current:**
```javascript
timeout: 15000 // 15 seconds
```

**Recommended for 5000px PNG:**
```javascript
timeout: 30000 // 30 seconds for large files
```

### Caching
Very important with large files:
```javascript
res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
```

Already set ✅

### Bandwidth Usage
- Expect 5-10MB per image download from Doppel
- Your watermarked output can be smaller if you resize
- Monitor bandwidth costs

---

## Optional: Resize After Watermark

If you want to serve smaller images to users while fetching large from Doppel:

```javascript
// After watermarking, before sending
imageBuffer = await sharp(imageBuffer)
  .resize(parseInt(width), null, { // Use user's requested width
    fit: 'inside',
    withoutEnlargement: true
  })
  .toBuffer();
```

This way:
- Fetch: 5000px PNG from Doppel
- Process: Add watermark to full quality
- Serve: Resize to user's requested size (960px default)

---

## Testing

### Test the changes:
```bash
# Your API URL (stays the same)
curl -H "X-API-Key: YOUR_KEY" \
  "http://localhost:3000/api/qc-images?id=7494645791"

# Get an image
curl "http://localhost:3000/api/image?url=8AjbL7MT" -o test.png

# Check file size
ls -lh test.png
```

### Check logs to see Doppel URL:
You'll see in server logs:
```
Fetching image from: https://doppel.fit/img?url=8AjbL7MT&quality=100&format=png&width=5000
```

---

## Summary

✅ **Your API URLs**: Unchanged, still customizable  
✅ **Doppel API calls**: Fixed to quality=100, format=png, width=5000  
✅ **Maximum quality**: Always fetch best quality from source  
✅ **Server restarted**: Changes active now  
⚠️ **Larger files**: Be aware of bandwidth and timeout needs  

**Your API now always fetches maximum quality images from Doppel!** 🚀
