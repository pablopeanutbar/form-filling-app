import { doubleCsrf } from 'csrf-csrf';
import { env } from '../config/env.js';

const isProduction = env.NODE_ENV === 'production';

export const {
  generateToken: generateCsrfToken,
  doubleCsrfProtection,
  invalidCsrfTokenError
} = doubleCsrf({
  getSecret: () => env.SESSION_SECRET,
  getSessionIdentifier: (req) => req.session?.userId || '',
  cookieName: isProduction ? '__Host-former.x-csrf-token' : 'former.x-csrf-token',
  cookieOptions: {
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    secure: isProduction,
    httpOnly: true
  },
  size: 32,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] || req.body?._csrf;
  }
});

/**
 * Express error handler for CSRF validation failures.
 */
export const csrfErrorHandler = (err, req, res, next) => {
  if (err === invalidCsrfTokenError || err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_INVALID',
        message: 'Invalid or missing CSRF protection token'
      }
    });
  }
  next(err);
};
