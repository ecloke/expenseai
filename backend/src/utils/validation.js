import Joi from 'joi';

// Telegram bot token validation
export const telegramBotTokenSchema = Joi.string()
  .pattern(/^\d+:[A-Za-z0-9_-]{35}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid Telegram bot token format'
  });

// Gemini API key validation
export const geminiApiKeySchema = Joi.string()
  .pattern(/^AI[A-Za-z0-9_-]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid Gemini API key format'
  });

// Google Sheet ID validation
export const googleSheetIdSchema = Joi.string()
  .pattern(/^[a-zA-Z0-9-_]{44}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid Google Sheet ID format'
  });

// User configuration validation
export const userConfigSchema = Joi.object({
  telegram_bot_token: telegramBotTokenSchema,
  gemini_api_key: geminiApiKeySchema,
  google_sheet_id: googleSheetIdSchema.optional(),
  sheet_name: Joi.string().min(1).max(100).default('Expenses')
});

// Chat query validation
export const chatQuerySchema = Joi.object({
  query: Joi.string().min(1).max(500).required(),
  user_id: Joi.string().uuid().required()
});

// Receipt data validation
export const receiptDataSchema = Joi.object({
  store_name: Joi.string().min(1).max(100).required(),
  date: Joi.date().iso().required(),
  total: Joi.number().positive().precision(2).required(),
  service_charge: Joi.number().min(0).precision(2).default(0),
  tax: Joi.number().min(0).precision(2).default(0),
  items: Joi.array().items(
    Joi.object({
      name: Joi.string().min(1).max(100).required(),
      price: Joi.number().positive().precision(2).required(),
      quantity: Joi.number().integer().positive().default(1),
      category: Joi.string().valid(
        'groceries', 'dining', 'gas', 'pharmacy', 
        'retail', 'services', 'other'
      ).default('other')
    })
  ).min(1).required()
});

/**
 * Validate request body against schema
 * @param {Object} data - Data to validate
 * @param {Joi.Schema} schema - Joi schema
 * @returns {Object} - Validation result
 */
export function validateInput(data, schema) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return { isValid: false, error: errorMessage, data: null };
  }
  
  return { isValid: true, error: null, data: value };
}

/**
 * Sanitize text input to prevent injection attacks
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

/**
 * Rate limiting helper
 * @param {Map} rateLimitMap - Map to store rate limit data
 * @param {string} key - Rate limit key (usually user ID)
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests per window
 * @returns {boolean} - Whether request is allowed
 */
export function checkRateLimit(rateLimitMap, key, windowMs = 60000, maxRequests = 10) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, [now]);
    return true;
  }
  
  const requests = rateLimitMap.get(key).filter(time => time > windowStart);
  
  if (requests.length >= maxRequests) {
    return false;
  }
  
  requests.push(now);
  rateLimitMap.set(key, requests);
  return true;
}

/**
 * Validate user ID format
 * @param {string} userId - User ID to validate
 * @returns {boolean} - Whether user ID is valid
 */
export function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') return false;
  
  // Accept UUID format or simple alphanumeric IDs
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const simpleIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
  
  return uuidPattern.test(userId) || simpleIdPattern.test(userId);
}