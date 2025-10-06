/**
 * API Key Authentication Middleware
 * Validates API keys from request headers or query parameters
 */

function validateApiKey(req, res, next) {
  // Get API key from header or query parameter
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  // Get valid API keys from environment variable
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
  
  // Skip validation if no API keys are configured (development mode)
  if (validApiKeys.length === 0 && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Warning: No API keys configured. Running in insecure mode.');
    return next();
  }
  
  // Require API key in production
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key is required. Include it in the X-API-Key header or apiKey query parameter.'
    });
  }
  
  // Validate the API key
  if (!validApiKeys.includes(apiKey.trim())) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }
  
  // API key is valid, proceed
  next();
}

module.exports = validateApiKey;
