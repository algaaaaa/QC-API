const { query, validationResult } = require('express-validator');

/**
 * Input validation middleware
 */

// Validation rules for /api/qc-images endpoint
const validateQcImagesRequest = [
  query('id')
    .notEmpty()
    .withMessage('Product ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Product ID must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Product ID contains invalid characters'),
  
  query('storePlatform')
    .optional()
    .isIn(['WEIDIAN', 'TAOBAO', '1688', 'TMALL'])
    .withMessage('Invalid store platform'),
  
  query('quality')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Quality must be between 1 and 100'),
  
  query('format')
    .optional()
    .isIn(['webp', 'jpeg', 'jpg', 'png'])
    .withMessage('Invalid image format'),
  
  query('width')
    .optional()
    .isInt({ min: 100, max: 2000 })
    .withMessage('Width must be between 100 and 2000 pixels'),
];

// Validation rules for /api/image endpoint
const validateImageRequest = [
  query('url')
    .notEmpty()
    .withMessage('Image URL is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('URL is too long'),
  
  query('quality')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Quality must be between 1 and 100'),
  
  query('format')
    .optional()
    .isIn(['webp', 'jpeg', 'jpg', 'png'])
    .withMessage('Invalid image format'),
  
  query('width')
    .optional()
    .isInt({ min: 100, max: 2000 })
    .withMessage('Width must be between 100 and 2000 pixels'),
  
  query('watermark')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Watermark must be true or false'),
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

module.exports = {
  validateQcImagesRequest,
  validateImageRequest,
  handleValidationErrors
};
