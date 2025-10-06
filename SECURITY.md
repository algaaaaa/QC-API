# 🔐 Security & Best Practices

## Security Features Implemented

### ✅ 1. Authentication
- **API Key Authentication**: All API endpoints protected with API keys
- **Multiple Keys Support**: Support for multiple API keys (different clients)
- **Flexible Authentication**: Keys can be sent via header or query parameter

### ✅ 2. Rate Limiting
- **General API Endpoint**: 100 requests per 15 minutes per IP
- **Image Endpoint**: 300 requests per 15 minutes per IP
- **Prevents Abuse**: Protects against DDoS and excessive usage

### ✅ 3. Input Validation
- **Express Validator**: All inputs validated and sanitized
- **Type Checking**: Ensures correct data types
- **Range Validation**: Validates numeric ranges (quality, width, etc.)
- **SQL Injection Prevention**: Input sanitization prevents injection attacks

### ✅ 4. Security Headers (Helmet.js)
- **XSS Protection**: Prevents cross-site scripting attacks
- **Content Security Policy**: Controls resource loading
- **HSTS**: Enforces HTTPS connections
- **Frame Options**: Prevents clickjacking
- **Content Type Sniffing**: Prevents MIME type sniffing

### ✅ 5. CORS Configuration
- **Whitelist Origins**: Only allowed domains can access API
- **Method Restrictions**: Only GET methods allowed
- **Credentials**: Proper handling of credentials

### ✅ 6. Error Handling
- **No Stack Traces in Production**: Prevents information leakage
- **Generic Error Messages**: Doesn't expose internal details
- **Proper HTTP Status Codes**: Clear error communication

### ✅ 7. Request Encryption
- **HTTPS Ready**: Configured for SSL/TLS
- **Secure Headers**: Forces secure connections

### ✅ 8. Compression
- **Response Compression**: Reduces bandwidth usage
- **Performance**: Faster response times

---

## 🔑 API Key Management

### Generating Keys

```bash
npm run generate-key
```

### Storing Keys

**Never commit `.env` file to version control!**

Use environment variables in production:
- VPS: Store in `.env` file with restricted permissions (`chmod 600 .env`)
- Heroku: Use `heroku config:set`
- Docker: Use secrets or environment variables

### Rotating Keys

Recommended: Rotate keys every 90 days

1. Generate new key: `npm run generate-key`
2. Add to `.env`: `API_KEYS=old_key,new_key`
3. Notify clients to update to new key
4. After grace period, remove old key

---

## 🛡️ Additional Security Recommendations

### 1. HTTPS Only
Always use HTTPS in production:
```nginx
# Nginx - Force HTTPS
if ($scheme != "https") {
    return 301 https://$host$request_uri;
}
```

### 2. Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 3. Keep Dependencies Updated
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### 4. Monitor Logs
```bash
# PM2 logs
pm2 logs qc-api

# System logs
tail -f /var/log/nginx/error.log
```

### 5. Backup Strategy
- Regular database backups (if used)
- Code in version control (Git)
- Environment variables backed up securely
- API keys stored in password manager

---

## 🔍 Security Testing

### Test API Key Protection

**Without API Key (should fail):**
```bash
curl http://localhost:3000/api/qc-images?id=7494645791
# Expected: 401 Unauthorized
```

**With Invalid API Key (should fail):**
```bash
curl -H "X-API-Key: invalid_key" \
  http://localhost:3000/api/qc-images?id=7494645791
# Expected: 403 Forbidden
```

**With Valid API Key (should succeed):**
```bash
curl -H "X-API-Key: your_valid_key" \
  http://localhost:3000/api/qc-images?id=7494645791
# Expected: 200 OK with data
```

### Test Rate Limiting

Run this script to test rate limiting:
```bash
for i in {1..150}; do
  curl -H "X-API-Key: your_key" \
    "http://localhost:3000/api/qc-images?id=7494645791"
done
# Should start returning 429 after 100 requests
```

### Test Input Validation

**Invalid Product ID:**
```bash
curl -H "X-API-Key: your_key" \
  "http://localhost:3000/api/qc-images?id=<script>alert('xss')</script>"
# Expected: 400 Bad Request with validation error
```

---

## 📊 Compliance & Privacy

### GDPR Compliance
- No personal data stored
- Request logs can be configured to anonymize IPs
- Clear data retention policies

### Data Protection
- API keys encrypted in transit (HTTPS)
- No sensitive data logged
- Secure key storage

---

## 🚨 Incident Response

### If API Key is Compromised

1. **Immediate Action:**
   ```bash
   # Remove compromised key from .env
   # Generate new key
   npm run generate-key
   # Update .env with new key
   # Restart server
   pm2 restart qc-api
   ```

2. **Notify affected parties**

3. **Review logs for unauthorized access**

4. **Update security measures**

### Monitoring for Suspicious Activity

Watch for:
- Unusual spike in requests
- Failed authentication attempts
- Requests from unexpected IPs/locations
- Unusual error patterns

---

## ✅ Security Checklist

Before going to production:

- [ ] Generated secure API keys
- [ ] Configured HTTPS/SSL
- [ ] Set up firewall
- [ ] Configured CORS for specific domains
- [ ] Set NODE_ENV=production
- [ ] Reviewed and adjusted rate limits
- [ ] Set up monitoring and alerting
- [ ] Configured log rotation
- [ ] Tested authentication
- [ ] Tested rate limiting
- [ ] Tested input validation
- [ ] Documented API usage for clients
- [ ] Set up backup strategy
- [ ] Planned key rotation schedule

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
