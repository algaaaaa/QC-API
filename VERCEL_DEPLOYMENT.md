# 🚀 Vercel Deployment Guide

## ✅ Ready for Vercel Deployment

Your QC Image API is now configured for Vercel deployment with all necessary files in place.

---

## 📋 Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com (free tier available)
2. **GitHub Repository**: Your code is already pushed to GitHub ✅
3. **Vercel CLI** (Optional): `npm i -g vercel`

---

## 🚀 Deploy to Vercel (Web Dashboard)

### Method 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Import Project
1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository: `algaaaaa/QC-API`
5. Click **"Import"**

#### Step 2: Configure Project
Vercel will auto-detect the settings, but verify:

**Framework Preset**: `Other`  
**Root Directory**: `./`  
**Build Command**: (leave empty)  
**Output Directory**: (leave empty)  

#### Step 3: Add Environment Variables
Click **"Environment Variables"** and add:

```env
NODE_ENV=production
API_KEYS=your_generated_api_key_here
BASE_URL=https://your-project.vercel.app
ALLOWED_ORIGINS=*
WATERMARK_TEXT=YOUR WATERMARK
WATERMARK_OPACITY=0.5
```

**⚠️ Important**: Replace `your_generated_api_key_here` with your actual API key!

#### Step 4: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for deployment
3. Your API will be live at: `https://your-project.vercel.app`

---

## 🔧 Deploy via Vercel CLI

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
# From your project directory
cd "C:/Users/kicky/Documents/QC API"

# Deploy to production
vercel --prod
```

### Step 4: Add Environment Variables
```bash
vercel env add API_KEYS
# Enter your API key when prompted

vercel env add WATERMARK_TEXT
# Enter your watermark text

vercel env add BASE_URL
# Enter your Vercel URL (e.g., https://your-project.vercel.app)
```

### Step 5: Redeploy with Environment Variables
```bash
vercel --prod
```

---

## 🔐 Environment Variables Setup

### Required Variables:
```env
API_KEYS=your_64_character_api_key
```

### Optional Variables:
```env
BASE_URL=https://your-project.vercel.app
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
WATERMARK_TEXT=© Your Company
WATERMARK_OPACITY=0.5
```

### How to Add via Dashboard:
1. Go to your project in Vercel
2. Click **"Settings"** → **"Environment Variables"**
3. Add each variable
4. Click **"Save"**
5. Redeploy for changes to take effect

---

## 📁 Vercel Project Structure

```
qc-api/
├── api/
│   └── index.js          ← Vercel serverless function
├── middleware/
│   ├── auth.js
│   ├── rateLimiter.js
│   └── validator.js
├── vercel.json           ← Vercel configuration
├── package.json
└── .env.example
```

---

## 🧪 Testing Your Deployment

### 1. Health Check (No Auth)
```bash
curl https://your-project.vercel.app/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-06T...",
  "environment": "production",
  "platform": "Vercel"
}
```

### 2. Test API with Authentication
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  "https://your-project.vercel.app/api/qc-images?id=7494645791"
```

### 3. Test Image Endpoint
```bash
curl "https://your-project.vercel.app/api/image?url=n4EYdIoE" -o test.png
```

---

## ⚙️ Vercel Configuration Explained

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ]
}
```

- **builds**: Tells Vercel to build the Node.js function
- **routes**: Routes all requests to the API function
- **@vercel/node**: Vercel's Node.js runtime

---

## 🌐 Custom Domain (Optional)

### Add Your Domain:
1. Go to **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (5-60 minutes)

### Update BASE_URL:
```env
BASE_URL=https://api.yourdomain.com
```

---

## 📊 Vercel Limits (Free Tier)

| Resource | Free Tier Limit |
|----------|----------------|
| Bandwidth | 100 GB/month |
| Function Invocations | 100 GB-Hours/month |
| Function Duration | 10 seconds max |
| Deployments | Unlimited |
| Team Members | 1 |

**Note**: Image processing may hit function duration limits for very large images.

---

## ⚡ Performance Optimization

### 1. Enable Edge Caching
Already configured with:
```javascript
res.setHeader('Cache-Control', 'public, max-age=86400');
```

### 2. Reduce Image Processing Time
If functions timeout, consider:
- Reducing source image size from Doppel
- Using CDN for caching
- Upgrading to Pro plan (60s timeout)

### 3. Use Vercel Edge Network
Vercel automatically deploys to global edge network for fast responses worldwide.

---

## 🔄 Continuous Deployment

### Automatic Deployments:
Once connected to GitHub, Vercel automatically deploys on:
- ✅ Every push to `main` branch
- ✅ Every pull request (preview deployment)
- ✅ Every commit

### Preview Deployments:
- Each PR gets a unique preview URL
- Test changes before merging
- Safe to experiment

---

## 📝 Post-Deployment Checklist

- [ ] Deployment successful (green checkmark)
- [ ] Environment variables configured
- [ ] Health check returns 200 OK
- [ ] API key authentication works
- [ ] Images load with watermark
- [ ] Rate limiting is active
- [ ] Custom domain configured (if applicable)
- [ ] BASE_URL environment variable updated
- [ ] Test all endpoints

---

## 🐛 Troubleshooting

### Function Timeout (Error 504)
**Problem**: Image processing takes too long  
**Solution**: 
- Reduce Doppel image size parameters
- Upgrade to Vercel Pro (60s timeout)
- Use external image processing service

### Module Not Found
**Problem**: Dependencies not installed  
**Solution**: 
- Check `package.json` includes all dependencies
- Redeploy with `vercel --prod --force`

### API Key Not Working
**Problem**: 401 Unauthorized  
**Solution**:
- Verify `API_KEYS` environment variable is set
- Redeploy after adding env variables
- Check for extra spaces in API key

### Sharp Library Error
**Problem**: Sharp fails on Vercel  
**Solution**: 
- Sharp should work on Vercel automatically
- If issues persist, may need to use `@vercel/ncc` to bundle

---

## 💰 Cost Estimation

### Free Tier:
- Good for: Development, testing, low traffic
- Supports: ~10,000-50,000 requests/month (depending on image sizes)

### Pro Tier ($20/month):
- Better for: Production use, moderate traffic
- Includes: 
  - 1 TB bandwidth
  - 1,000 GB-Hours compute
  - 60s function timeout
  - Priority support

---

## 🔒 Security on Vercel

### Already Configured:
✅ HTTPS by default (automatic SSL)  
✅ API key authentication  
✅ Rate limiting  
✅ Security headers (Helmet)  
✅ Input validation  
✅ CORS protection  

### Additional Recommendations:
- Rotate API keys regularly
- Monitor usage via Vercel dashboard
- Set up alerts for high usage
- Use Vercel Analytics (optional)

---

## 📈 Monitoring

### Vercel Dashboard:
- Real-time function logs
- Error tracking
- Performance metrics
- Bandwidth usage
- Function invocation count

### Access Logs:
1. Go to your project
2. Click **"Deployments"**
3. Select a deployment
4. Click **"Functions"** tab
5. View real-time logs

---

## 🔄 Update Deployment

### Via Git Push:
```bash
# Make changes
git add .
git commit -m "Update API"
git push origin main
# Vercel auto-deploys
```

### Via Vercel CLI:
```bash
vercel --prod
```

### Via Dashboard:
1. Go to **"Deployments"**
2. Find previous deployment
3. Click **"..."** → **"Redeploy"**

---

## 🎉 You're Ready!

Your API is now:
- ✅ Configured for Vercel
- ✅ Ready to deploy in 1 click
- ✅ Fully secured
- ✅ Production-ready

### Quick Deploy Steps:
1. Go to https://vercel.com
2. Import `algaaaaa/QC-API`
3. Add `API_KEYS` environment variable
4. Click Deploy
5. Done! 🚀

---

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Your Project Docs**: See `DEPLOYMENT.md` for general deployment info

---

**Your API is Vercel-ready! Deploy now! 🎊**
