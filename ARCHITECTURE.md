# 🏗️ API Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                          │
│              (Browser, Mobile App, Server, etc.)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         HTTPS/SSL Layer                         │
│                    (Nginx/Let's Encrypt)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Your QC Image API Server                     │
│                     (Node.js + Express)                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Security Middleware Layer                     │ │
│  │  1. Helmet (Security Headers)                             │ │
│  │  2. CORS (Origin Validation)                              │ │
│  │  3. Rate Limiter (DDoS Protection)                        │ │
│  │  4. API Key Auth (Authentication)                         │ │
│  │  5. Input Validator (Sanitization)                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                             │                                   │
│                             ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  API Endpoints                             │ │
│  │                                                            │ │
│  │  GET /api/qc-images                                       │ │
│  │  ├─ Fetch product data from Doppel API                   │ │
│  │  ├─ Extract image URLs                                    │ │
│  │  └─ Return watermarked URLs                               │ │
│  │                                                            │ │
│  │  GET /api/image                                           │ │
│  │  ├─ Fetch original image from Doppel                     │ │
│  │  ├─ Apply watermark (Sharp.js)                           │ │
│  │  ├─ Optimize & compress                                  │ │
│  │  └─ Return processed image                                │ │
│  │                                                            │ │
│  │  GET /health                                              │ │
│  │  └─ Return server status                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Doppel API                          │
│           https://doppel.fit/api/v1/products/qcMedia           │
│              https://doppel.fit/img?url=...                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### 1. Product Images Request

```
Client
  │
  │ GET /api/qc-images?id=7494645791
  │ Header: X-API-Key: your_key
  │
  ▼
Security Checks
  ├─ Rate Limit Check (100/15min)
  ├─ API Key Validation
  ├─ Input Validation (id format)
  └─ CORS Check
  │
  ▼
API Handler
  ├─ Fetch from Doppel API
  ├─ Extract image URLs
  ├─ Generate watermarked URLs
  └─ Return JSON response
  │
  ▼
Client Receives:
{
  "images": [
    {
      "original": "n4EYdIoE",
      "watermarked": "http://your-api.com/api/image?url=n4EYdIoE&..."
    }
  ]
}
```

### 2. Image Request

```
Client/Browser
  │
  │ GET /api/image?url=n4EYdIoE&quality=60&format=webp&width=960
  │
  ▼
Security Checks
  ├─ Rate Limit Check (300/15min)
  ├─ Input Validation
  └─ CORS Check
  │
  ▼
Image Processing
  ├─ Fetch from Doppel Image API
  ├─ Apply Watermark (Sharp)
  │   ├─ Load image buffer
  │   ├─ Create SVG overlay
  │   └─ Composite watermark
  ├─ Optimize & Compress
  └─ Set Cache Headers (24h)
  │
  ▼
Client Receives: Binary Image with Watermark
```

---

## 🛡️ Security Layers

```
┌─────────────────────────────────────────┐
│         Layer 1: Network                │
│  • HTTPS/TLS Encryption                 │
│  • Nginx Reverse Proxy                  │
│  • Firewall Rules                       │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         Layer 2: Application            │
│  • Helmet Security Headers              │
│  • CORS Policy                          │
│  • Rate Limiting                        │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         Layer 3: Authentication         │
│  • API Key Validation                   │
│  • Request Signing                      │
│  • Token Verification                   │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         Layer 4: Input Validation       │
│  • Parameter Type Checking              │
│  • Range Validation                     │
│  • SQL Injection Prevention             │
│  • XSS Prevention                       │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         Layer 5: Error Handling         │
│  • Sanitized Error Messages             │
│  • No Stack Traces                      │
│  • Logging & Monitoring                 │
└─────────────────────────────────────────┘
```

---

## 📊 Data Flow

```
┌──────────────┐
│   Client     │
│  (Browser)   │
└──────┬───────┘
       │
       │ 1. Request Product Images
       │    + API Key
       ▼
┌──────────────────┐
│   Your API       │
│   (Secured)      │
└──────┬───────────┘
       │
       │ 2. Fetch Product Data
       ▼
┌──────────────────┐
│   Doppel API     │
│   (External)     │
└──────┬───────────┘
       │
       │ 3. Return Product Data
       │    {images: [...]}
       ▼
┌──────────────────┐
│   Your API       │
│   Extract URLs   │
│   Generate Links │
└──────┬───────────┘
       │
       │ 4. Return Watermarked URLs
       │    {watermarked: "your-api/image?..."}
       ▼
┌──────────────────┐
│   Client         │
│   Displays List  │
└──────┬───────────┘
       │
       │ 5. Request Each Image
       ▼
┌──────────────────┐
│   Your API       │
│   /api/image     │
└──────┬───────────┘
       │
       │ 6. Fetch Original Image
       ▼
┌──────────────────┐
│   Doppel CDN     │
└──────┬───────────┘
       │
       │ 7. Return Original Image
       ▼
┌──────────────────┐
│   Your API       │
│   + Watermark    │
│   + Optimize     │
└──────┬───────────┘
       │
       │ 8. Return Watermarked Image
       ▼
┌──────────────────┐
│   Client         │
│   Displays Image │
└──────────────────┘
```

---

## ⚡ Performance Optimizations

```
┌─────────────────────────────────────────┐
│          Client Request                 │
└───────────────┬─────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │  CDN Cache    │ ← Optional: CloudFlare, etc.
        │  (24h TTL)    │
        └───────┬───────┘
                │ Cache Miss
                ▼
        ┌───────────────┐
        │ Nginx Cache   │ ← Reverse Proxy Cache
        │  (Optional)   │
        └───────┬───────┘
                │ Cache Miss
                ▼
        ┌───────────────┐
        │  Your API     │
        │  - Gzip       │ ← Compression
        │  - Brotli     │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Sharp.js      │ ← Fast Image Processing
        │ - Resize      │
        │ - Compress    │
        │ - Watermark   │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Cache Headers │ ← 24h Browser Cache
        │ max-age=86400 │
        └───────────────┘
```

---

## 🔧 System Components

### Core Dependencies

```
express          → Web framework
├── helmet       → Security headers
├── cors         → CORS handling
├── compression  → Response compression
└── body-parser  → Request parsing

axios            → HTTP client for external APIs

sharp            → Image processing
└── watermarking → SVG overlay

express-rate-limit → Rate limiting
express-validator  → Input validation
dotenv            → Environment variables
```

### Middleware Stack

```
Request
  │
  ├─→ helmet()              (Security headers)
  ├─→ cors()                (CORS validation)
  ├─→ compression()         (Response compression)
  ├─→ express.json()        (JSON parsing)
  ├─→ logging middleware    (Request logging)
  ├─→ validateApiKey()      (Authentication)
  ├─→ rateLimiter()         (Rate limiting)
  ├─→ validator()           (Input validation)
  └─→ Route Handler         (Business logic)
```

---

## 📈 Scaling Strategy

### Vertical Scaling (Single Server)
```
├── Increase CPU cores
├── Add more RAM
├── Use PM2 cluster mode
└── Optimize Sharp processing
```

### Horizontal Scaling (Multiple Servers)
```
┌──────────────┐
│ Load Balancer│
│   (Nginx)    │
└──────┬───────┘
       │
   ┌───┴───┬───────┬───────┐
   ▼       ▼       ▼       ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│API 1│ │API 2│ │API 3│ │API 4│
└─────┘ └─────┘ └─────┘ └─────┘
```

### Caching Strategy
```
Browser Cache (24h)
    ↓
CDN Cache (CloudFlare)
    ↓
Server Cache (Redis - Optional)
    ↓
Your API
```

---

## 🎯 Deployment Architecture

### Simple VPS
```
┌─────────────────────────────┐
│         VPS Server          │
│                             │
│  ┌───────────────────────┐  │
│  │    Nginx (Port 80)    │  │
│  │      + SSL (443)      │  │
│  └──────────┬────────────┘  │
│             │                │
│  ┌──────────▼────────────┐  │
│  │  PM2 Cluster Mode     │  │
│  │  ├─ API Instance 1    │  │
│  │  ├─ API Instance 2    │  │
│  │  └─ API Instance N    │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### Cloud Platform (Heroku/Railway)
```
┌─────────────────────────────┐
│     Platform Load Balancer  │
└──────────────┬──────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────┐         ┌─────────┐
│ Dyno 1  │         │ Dyno 2  │
│ (API)   │         │ (API)   │
└─────────┘         └─────────┘
```

---

**🎉 Your API is architected for enterprise-scale success!**
