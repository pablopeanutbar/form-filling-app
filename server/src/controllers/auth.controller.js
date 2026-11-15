import * as authService from '../services/auth.service.js';
import { generateCsrfToken } from '../middleware/csrf.middleware.js';

/**
 * GET /api/v1/auth/csrf-token
 * Issues a new CSRF token and sets the CSRF cookie for client-side forms.
 */
export const getCsrfToken = (req, res) => {
  const csrfToken = generateCsrfToken(req, res, true);
  res.status(200).json({
    success: true,
    data: {
      csrfToken
    }
  });
};

/**
 * POST /api/v1/auth/register
 * Validates credentials, creates user with Argon2id hash, and returns sanitized account data.
 */
export const register = async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody;
    const user = await authService.registerUser({ email, password });

    res.status(201).json({
      success: true,
      data: {
        message: 'Account created successfully',
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 * Verifies credentials, regenerates session to prevent fixation attacks,
 * stores user session in MongoDB, and returns sanitized user data.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody;
    const user = await authService.authenticateUser({ email, password });

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      req.session.userId = user.id;
      req.session.authenticatedAt = new Date().toISOString();

      req.session.save((saveErr) => {
        if (saveErr) {
          return next(saveErr);
        }

        res.status(200).json({
          success: true,
          data: {
            message: 'Authentication successful',
            user
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Invalidates the server-side session in MongoDB and clears the session cookie.
 */
export const logout = (req, res, next) => {
  if (!req.session) {
    return res.status(200).json({
      success: true,
      data: { message: 'Already logged out' }
    });
  }

  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.clearCookie('former.sid', {
      path: '/',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  });
};

/**
 * GET /api/v1/auth/me
 * Returns current authenticated user's profile information.
 */
export const getCurrentUser = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
};

