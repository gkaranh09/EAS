const rateLimit = require('express-rate-limit');

/**
 * Strict Rate Limiter for Authentication routes (/login, /register)
 * Allows up to 50 attempts per 15 minutes per IP (campus NAT friendly).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes per IP
  standardHeaders: true, // Return standard RateLimit-* and Retry-After headers
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    // Calculate remaining seconds until reset
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      message: 'Too many authentication attempts from this network. Please wait a few minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter
    });
  }
});

/**
 * Lightweight Limiter for Session Verification Pings (/session/verify)
 * Allows up to 120 requests per minute per IP for seamless heartbeat checking.
 */
const sessionVerifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      message: 'Session verification rate limit reached.',
      code: 'SESSION_RATE_LIMIT'
    });
  }
});

/**
 * General API Limiter for non-auth endpoints
 * Allows up to 500 requests per 15 minutes per IP.
 */
const apiGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.baseUrl?.startsWith('/api/auth') || req.path?.startsWith('/auth'),
  handler: (_req, res, _next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      message: 'Too many API requests from this IP. Please try again later.',
      code: 'API_RATE_LIMIT_EXCEEDED',
      retryAfter
    });
  }
});

module.exports = {
  authLimiter,
  sessionVerifyLimiter,
  apiGlobalLimiter
};
