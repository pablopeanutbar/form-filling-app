import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for Authentication Endpoints
 * Limits requests per IP to 20 attempts per 15-minute window to mitigate brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many authentication requests from this IP. Please try again after 15 minutes.'
      }
    });
  }
});

