import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import profileRoutes from './profile.routes.js';
import autofillRoutes from './autofill.routes.js';

const router = Router();

// Mount system health & readiness routes (/api/v1/health, /api/v1/ready)
router.use('/', healthRoutes);

// Mount authentication routes (/api/v1/auth/*)
router.use('/auth', authRoutes);

// Mount user profile routes (/api/v1/profile/*)
router.use('/profile', profileRoutes);

// Mount intelligent form field autofill matching routes (/api/v1/autofill/*)
router.use('/autofill', autofillRoutes);

export default router;
