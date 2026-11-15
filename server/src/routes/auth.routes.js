import { Router } from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  getCsrfToken
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import { doubleCsrfProtection } from '../middleware/csrf.middleware.js';
import { validateBody, registerSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

// GET /api/v1/auth/csrf-token - Generates token for state-changing requests
router.get('/csrf-token', getCsrfToken);

// POST /api/v1/auth/register - Create new user account
router.post(
  '/register',
  authRateLimiter,
  doubleCsrfProtection,
  validateBody(registerSchema),
  register
);

// POST /api/v1/auth/login - Authenticate credentials and establish session
router.post(
  '/login',
  authRateLimiter,
  doubleCsrfProtection,
  validateBody(loginSchema),
  login
);

// POST /api/v1/auth/logout - Invalidate session and destroy cookie
router.post('/logout', doubleCsrfProtection, logout);

// GET /api/v1/auth/me - Retrieve current authenticated user profile
router.get('/me', requireAuth, getCurrentUser);

export default router;

