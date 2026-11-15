import { getUserById } from '../services/auth.service.js';

/**
 * Authentication Middleware
 * Enforces that a valid, active session exists.
 * Binds the authenticated user identity to req.user exclusively from the server session.
 * Never trusts client-supplied user identifiers in headers, params, or bodies.
 */
export const requireAuth = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. No valid active session.'
      }
    });
  }

  try {
    const user = await getUserById(req.session.userId);

    if (!user) {
      // Session exists but user account was removed
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'The account associated with this session no longer exists.'
        }
      });
    }

    if (user.status !== 'active') {
      req.session.destroy(() => {});
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'This account has been deactivated or suspended.'
        }
      });
    }

    // Attach verified user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

