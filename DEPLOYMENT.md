# 🚀 Production Deployment Guide

Complete guide for deploying your QC Image API to production with security best practices.

---

## 📋 Pre-Deployment Checklist

- [ ] Generate secure API keys
- [ ] Configure environment variables
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure CORS for your domains
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

---

## 🔐 Security Setup

### 1. Generate API Keys

```bash
npm run generate-key
```

This will generate a secure 64-character API key. Add it to your `.env` file:

```env
API_KEYS=your_generated_api_key_here
```

**For multiple API keys** (different clients/services):
```env
API_KEYS=key1,key2,key3
```

### 2. Configure Environment Variables

Copy `.env.example` and create `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your production settings:

```env
# Production Settings
NODE_ENV=production
PORT=3000
BASE_URL=https://api.yourdomain.com

# Security
API_KEYS=your_secure_api_key_1,your_secure_api_key_2

# CORS - Only allow your domains
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Watermark
WATERMARK_TEXT=© Your Company
WATERMARK_OPACITY=0.5
```

**⚠️ IMPORTANT:** Never commit `.env` to version control!

---

## 🌐 Deployment Options

### Option 1: Deploy to VPS (Ubuntu/Debian)

#### 1. Install Node.js and PM2

```bash
# Install Node.js (v18 or higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

#### 2. Upload Your Code

```bash
# On your local machine
scp -r . user@your-server:/var/www/qc-api

# Or use Git
ssh user@your-server
cd /var/www
git clone your-repo-url qc-api
cd qc-api
```

#### 3. Install Dependencies

```bash
npm install --production
```

#### 4. Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'qc-api',
    script: './production-server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

#### 5. Start with PM2

```bash
# Create logs directory
mkdir logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

#### 6. Set Up Nginx Reverse Proxy

Install Nginx:
```bash
sudo apt-get install nginx
```

Create Nginx configuration (`/etc/nginx/sites-available/qc-api`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for image processing
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/qc-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Certbot will automatically configure HTTPS and set up auto-renewal
```

---

### Option 2: Deploy to Heroku

#### 1. Install Heroku CLI

```bash
npm install -g heroku
heroku login
```

#### 2. Create Heroku App

```bash
heroku create your-app-name
```

#### 3. Add Procfile

Create `Procfile` in your project root:

```
web: node production-server.js
```

#### 4. Set Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set API_KEYS=your_generated_api_key
heroku config:set WATERMARK_TEXT="Your Watermark"
heroku config:set ALLOWED_ORIGINS=https://yourdomain.com
```

#### 5. Deploy

```bash
git add .
git commit -m "Ready for deployment"
git push heroku main
```

---

### Option 3: Deploy to Railway/Render

#### Railway:

1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on git push

#### Render:

1. Create new Web Service
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `node production-server.js`
5. Add environment variables

---

## 🔒 Security Best Practices

### 1. API Key Management

- **Never expose API keys** in client-side code
- **Rotate keys regularly** (every 90 days)
- **Use different keys** for different environments
- **Monitor key usage** and revoke compromised keys

### 2. Rate Limiting

Current limits (configurable in `middleware/rateLimiter.js`):
- General API: 100 requests per 15 minutes
- Image API: 300 requests per 15 minutes

Adjust based on your needs:
```javascript
// middleware/rateLimiter.js
max: 200, // Increase limit
windowMs: 10 * 60 * 1000, // Change window to 10 minutes
```

### 3. CORS Configuration

Always specify allowed origins in production:
```env
# Good (specific domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Bad (allows all origins)
ALLOWED_ORIGINS=*
```

### 4. HTTPS Only

Always use HTTPS in production. Update your `.env`:
```env
BASE_URL=https://api.yourdomain.com
```

---

## 📊 Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs qc-api

# Monitor CPU/Memory
pm2 monit

# Show application status
pm2 status
```

### Log Files

Logs are stored in `./logs/`:
- `err.log` - Error logs
- `out.log` - Standard output logs

### Set Up Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## 🧪 Testing Production Deployment

### 1. Test Health Endpoint

```bash
curl https://api.yourdomain.com/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-04T...",
  "environment": "production",
  "uptime": 123.45
}
```

### 2. Test API with Authentication

```bash
curl -H "X-API-Key: your_api_key" \
  "https://api.yourdomain.com/api/qc-images?id=7494645791"
```

### 3. Test Rate Limiting

Make multiple rapid requests to verify rate limiting works.

### 4. Test Watermarked Images

Visit a watermarked image URL in your browser to verify watermark appears.

---

## 🔄 Updating Your Deployment

### VPS Deployment

```bash
ssh user@your-server
cd /var/www/qc-api
git pull origin main
npm install --production
pm2 restart qc-api
```

### Heroku

```bash
git push heroku main
```

---

## 📈 Performance Optimization

### 1. Enable Caching

Already configured in production server:
- Image responses cached for 24 hours
- Appropriate Cache-Control headers set

### 2. Use CDN (Optional)

For better global performance, put a CDN in front:
- Cloudflare (free tier available)
- AWS CloudFront
- Fastly

### 3. Database for API Keys (Optional)

For better scalability, store API keys in a database:
- PostgreSQL
- MongoDB
- Redis

---

## 🚨 Troubleshooting

### API Returns 401 Unauthorized

- Check if API key is set in `.env`
- Verify API key is sent in `X-API-Key` header or `apiKey` query param
- Ensure no extra spaces in API key

### Rate Limit Errors

- Adjust limits in `middleware/rateLimiter.js`
- Check if multiple services are using same IP
- Consider implementing per-API-key rate limiting

### Images Not Loading

- Check if Doppel API is accessible from your server
- Verify firewall isn't blocking outbound requests
- Check timeout settings (increase if needed)

### PM2 Process Crashes

```bash
pm2 logs qc-api --err --lines 100
```

Common causes:
- Out of memory (increase `max_memory_restart`)
- Unhandled promise rejection
- Port already in use

---

## 📱 Using Your API

### Example: Fetch Product Images

```javascript
// JavaScript
const response = await fetch(
  'https://api.yourdomain.com/api/qc-images?id=7494645791',
  {
    headers: {
      'X-API-Key': 'your_api_key'
    }
  }
);
const data = await response.json();
console.log(data.images);
```

```python
# Python
import requests

headers = {'X-API-Key': 'your_api_key'}
response = requests.get(
    'https://api.yourdomain.com/api/qc-images',
    params={'id': '7494645791'},
    headers=headers
)
data = response.json()
print(data['images'])
```

---

## 🛡️ Backup & Disaster Recovery

### Regular Backups

1. **Code:** Use Git version control
2. **Environment variables:** Keep secure backup of `.env`
3. **API keys:** Store securely (password manager)

### Rollback Plan

```bash
# VPS
cd /var/www/qc-api
git log  # Find commit to rollback to
git checkout [commit-hash]
pm2 restart qc-api
```

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

- [ ] Update dependencies monthly: `npm update`
- [ ] Review logs weekly
- [ ] Monitor API usage and costs
- [ ] Rotate API keys quarterly
- [ ] Update SSL certificates (auto with Let's Encrypt)
- [ ] Review and adjust rate limits based on usage

---

## 🎉 You're Ready!

Your API is now secured and ready for production deployment with:

✅ API Key Authentication  
✅ Rate Limiting  
✅ Input Validation  
✅ Security Headers (Helmet)  
✅ CORS Protection  
✅ Compression  
✅ Error Handling  
✅ Logging  
✅ Watermarking  

Happy deploying! 🚀
