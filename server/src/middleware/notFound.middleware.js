/**
 * 404 Not Found Middleware
 * Intercepts requests to unmapped routes and returns structured JSON response.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.originalUrl}`
    }
  });
};

