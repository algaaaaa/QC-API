# 🚀 Quick Reference Guide

## API Key
```
065700661eceb51e8189deee2712e0631bbe508009679abe86cc3a0992e9c998
```
**⚠️ Keep this secure! Change it before production deployment.**

---

## Start Commands

### Development (No Auth)
```bash
npm run dev:watermark
```

### Production (Secured)
```bash
npm run start:production
```

Or with PM2:
```bash
pm2 start ecosystem.config.js
```

---

## API Usage Examples

### 1. Get Product Images

**With Header (Recommended):**
```bash
curl -H "X-API-Key: 065700661eceb51e8189deee2712e0631bbe508009679abe86cc3a0992e9c998" \
  "http://localhost:3000/api/qc-images?id=7494645791"
```

**With Query Parameter:**
```bash
curl "http://localhost:3000/api/qc-images?id=7494645791&apiKey=065700661eceb51e8189deee2712e0631bbe508009679abe86cc3a0992e9c998"
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3000/api/qc-images?id=7494645791', {
  headers: {
    'X-API-Key': '065700661eceb51e8189deee2712e0631bbe508009679abe86cc3a0992e9c998'
  }
});
const data = await response.json();
console.log(data.images);
```

**Python:**
```python
import requests

headers = {'X-API-Key': '065700661eceb51e8189deee2712e0631bbe508009679abe86cc3a0992e9c998'}
response = requests.get(
    'http://localhost:3000/api/qc-images',
    params={'id': '7494645791'},
    headers=headers
)
data = response.json()
print(data['images'])
```

### 2. View Watermarked Image

Copy any `watermarked` URL from the response and paste in your browser, or:

```bash
curl "http://localhost:3000/api/image?url=n4EYdIoE&quality=90&format=png&width=960" \
  --output image.png
```

---

## Response Format

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
    }
  ]
}
```

---

## Customize Watermark

Edit `production-server.js` around line 170:

```javascript
const watermarkText = process.env.WATERMARK_TEXT || 'YOUR TEXT HERE';
const watermarkOpacity = parseFloat(process.env.WATERMARK_OPACITY || '0.5');
```

Or set in `.env`:
```env
WATERMARK_TEXT=© My Company 2025
WATERMARK_OPACITY=0.5
```

---

## Troubleshooting

### 401 Unauthorized
- Check if API key is correct
- Verify key is sent in `X-API-Key` header or `apiKey` query param
- Check `.env` file has `API_KEYS` set

### 429 Too Many Requests
- You've hit the rate limit
- Wait 15 minutes or adjust limits in `middleware/rateLimiter.js`

### 400 Bad Request
- Check required parameters (id is required)
- Verify parameter values are valid

### Port 3000 Already in Use
```bash
# Windows
netstat -ano | grep :3000
taskkill //PID [PID_NUMBER] //F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

---

## Generate New API Key

```bash
npm run generate-key
```

Then update `.env` with the new key.

---

## Deploy to Production

See [DEPLOYMENT.md](DEPLOYMENT.md) for full guide.

**Quick Deploy to Heroku:**
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set API_KEYS=your_generated_key
heroku config:set WATERMARK_TEXT="Your Watermark"
git push heroku main
```

---

## Project Files

| File | Purpose |
|------|---------|
| `production-server.js` | Secured production server |
| `server-with-watermark.js` | Dev server with watermark |
| `middleware/auth.js` | API key authentication |
| `middleware/rateLimiter.js` | Rate limiting config |
| `middleware/validator.js` | Input validation |
| `.env` | Environment variables (not in git) |
| `DEPLOYMENT.md` | Full deployment guide |
| `SECURITY.md` | Security documentation |

---

## Security Checklist

- [x] API key authentication
- [x] Rate limiting
- [x] Input validation
- [x] Security headers (Helmet)
- [x] CORS configuration
- [x] Compression
- [x] Error handling
- [x] Logging
- [ ] HTTPS (set up on your server)
- [ ] Change default API key
- [ ] Configure allowed origins
- [ ] Set up monitoring

---

## Support

- **Documentation**: See README.md, DEPLOYMENT.md, SECURITY.md
- **Issues**: Check logs with `pm2 logs` or console output
- **Updates**: `npm update` to update dependencies

---

**🎉 Your API is ready for production!**
