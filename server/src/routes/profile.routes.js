import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  addEducation,
  updateEducation,
  deleteEducation
} from '../controllers/profile.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { doubleCsrfProtection } from '../middleware/csrf.middleware.js';
import {
  validateProfileUpdate,
  validateEducationInput
} from '../validators/profile.validator.js';

const router = Router();

// Enforce authentication across all profile endpoints
router.use(requireAuth);

// GET /api/v1/profile/me - Retrieve authenticated user's profile
router.get('/me', getMyProfile);

// PATCH /api/v1/profile/me - Partially update profile categories
router.patch('/me', doubleCsrfProtection, validateProfileUpdate, updateMyProfile);

// POST /api/v1/profile/me/education - Add new educational qualification
router.post('/me/education', doubleCsrfProtection, validateEducationInput(false), addEducation);

// PATCH /api/v1/profile/me/education/:qualificationId - Update specific qualification
router.patch(
  '/me/education/:qualificationId',
  doubleCsrfProtection,
  validateEducationInput(true),
  updateEducation
);

// DELETE /api/v1/profile/me/education/:qualificationId - Remove educational qualification
router.delete('/me/education/:qualificationId', doubleCsrfProtection, deleteEducation);

export default router;

