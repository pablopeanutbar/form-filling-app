import { env } from '../config/env.js';

/**
 * Centralized Error Handling Middleware
 * Catches unhandled and operational errors, formats a structured JSON response,
 * and ensures sensitive details/credentials are never exposed to clients.
 */
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const isProduction = env.NODE_ENV === 'production';

  // Log error message safely for operational diagnostics
  console.error(`[Error] [${req.method} ${req.path}] ${err.name || 'Error'}: ${err.message}`);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message:
        statusCode === 500 && isProduction
          ? 'An unexpected error occurred. Please try again later.'
          : err.message || 'Internal server error',
      ...(isProduction ? {} : { details: err.details, stack: err.stack })
    }
  });
};

