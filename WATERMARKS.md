# 🎨 Watermark Configuration

## Custom Watermark Images

Your API now uses **three custom watermark images** positioned at different corners of each image.

---

## 📍 Watermark Positions

```
┌─────────────────────────────┐
│ image1.png        image2.png│  ← Top corners
│ (Top Left)       (Top Right)│
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│                 image3.png  │  ← Bottom Right
└─────────────────────────────┘
```

### Position Details:

| File | Position | Gravity |
|------|----------|---------|
| `watermarks/image1.png` | Top Left | `northwest` |
| `watermarks/image2.png` | Top Right | `northeast` |
| `watermarks/image3.png` | Bottom Right | `southeast` |

---

## 📁 File Structure

```
QC API/
├── watermarks/
│   ├── image1.png          ← Top Left watermark
│   ├── image2.png          ← Top Right watermark
│   └── image3.png          ← Bottom Right watermark
└── api/
    └── index.js            ← Applies watermarks
```

---

## 🎯 How It Works

1. **Image is fetched** from Doppel API (5000px, quality 100)
2. **Watermarks are applied** in order:
   - `image1.png` → Top Left
   - `image2.png` → Top Right
   - `image3.png` → Bottom Right
3. **Final image** is served to user with all watermarks

---

## 🔧 Customization

### Change Watermark Images

Simply replace the files in the `watermarks/` folder:
- `image1.png` - Top Left
- `image2.png` - Top Right
- `image3.png` - Bottom Right

**Supported formats:** PNG, JPEG, WebP (PNG recommended for transparency)

### Recommended Image Sizes

For best results:
- **Small logos:** 100-300px wide
- **Medium logos:** 300-500px wide
- **Large logos:** 500-800px wide

The watermarks will be applied at their original size.

### Change Positions

Edit `api/index.js` and modify the `gravity` property:

```javascript
// Available positions:
'center'      // Center
'north'       // Top center
'northeast'   // Top right
'east'        // Right center
'southeast'   // Bottom right
'south'       // Bottom center
'southwest'   // Bottom left
'west'        // Left center
'northwest'   // Top left
```

---

## 📊 Watermark Properties

### Current Configuration:

```javascript
// Image 1 - Top Left
{
  input: 'watermarks/image1.png',
  gravity: 'northwest'
}

// Image 2 - Top Right
{
  input: 'watermarks/image2.png',
  gravity: 'northeast'
}

// Image 3 - Bottom Right
{
  input: 'watermarks/image3.png',
  gravity: 'southeast'
}
```

---

## 🎨 Advanced Customization

### Add Offset

To add padding from edges:

```javascript
{
  input: 'watermarks/image1.png',
  gravity: 'northwest',
  top: 10,      // 10px from top
  left: 10      // 10px from left
}
```

### Resize Watermarks

To automatically resize watermarks:

```javascript
const watermark1 = await sharp('watermarks/image1.png')
  .resize(200)  // Resize to 200px width
  .toBuffer();

watermarkComposites.push({
  input: watermark1,
  gravity: 'northwest'
});
```

### Adjust Opacity

To make watermarks semi-transparent:

```javascript
const watermark1 = await sharp('watermarks/image1.png')
  .composite([{
    input: Buffer.from(`<svg><rect width="100%" height="100%" fill="white" fill-opacity="0.5"/></svg>`),
    blend: 'dest-in'
  }])
  .toBuffer();
```

---

## 🧪 Testing Watermarks

### Test Locally:

```bash
# Start server
npm run dev:watermark

# Test image with watermarks
curl "http://localhost:3000/api/image?url=n4EYdIoE" -o test-watermarked.png

# Open the image
start test-watermarked.png  # Windows
open test-watermarked.png   # Mac
xdg-open test-watermarked.png  # Linux
```

### Test on Vercel:

```bash
curl "https://qc-api-seven.vercel.app/api/image?url=n4EYdIoE" -o test-vercel.png
```

---

## 🚀 Deployment

### Watermarks are Automatically Included

The `vercel.json` is configured to include watermarks:

```json
{
  "builds": [
    {
      "src": "watermarks/**",
      "use": "@vercel/static"
    }
  ]
}
```

### Push Changes:

```bash
git add watermarks/
git add api/index.js vercel.json
git commit -m "Add custom watermark images"
git push origin main
```

Vercel will automatically redeploy with the new watermarks.

---

## 📝 Notes

### File Requirements:
- ✅ PNG format recommended (supports transparency)
- ✅ Any size (will be applied at original size)
- ✅ Can use JPEG, WebP, or other formats
- ✅ Transparent backgrounds work best

### Performance:
- Watermarks are cached with images (24-hour cache)
- Multiple watermarks add ~100-200ms processing time
- Original images are still fetched at maximum quality

### Troubleshooting:
- If watermarks don't appear, check file names exactly match: `image1.png`, `image2.png`, `image3.png`
- Check files are in `watermarks/` folder (not subfolder)
- Verify files are pushed to GitHub
- Check Vercel deployment includes watermarks folder

---

## 🎯 Example Usage

### API Request:
```
https://qc-api-seven.vercel.app/api/qc-images?id=7494645791
```

### Response:
```json
{
  "images": [
    {
      "original": "n4EYdIoE",
      "watermarked": "https://qc-api-seven.vercel.app/api/image?url=n4EYdIoE&quality=90&format=png&width=960"
    }
  ]
}
```

### Watermarked Image:
The URL `https://qc-api-seven.vercel.app/api/image?url=n4EYdIoE` will return the image with:
- ✅ image1.png at Top Left
- ✅ image2.png at Top Right
- ✅ image3.png at Bottom Right

---

## 🔄 Disable Watermarks

To serve images without watermarks, add `&watermark=false`:

```
https://qc-api-seven.vercel.app/api/image?url=n4EYdIoE&watermark=false
```

---

**Your watermarks are ready! Push to deploy! 🎨**
