import { Router } from 'express';
import { matchFields } from '../controllers/autofill.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { doubleCsrfProtection } from '../middleware/csrf.middleware.js';
import { validateMatchRequest } from '../validators/autofill.validator.js';

const router = Router();

// Enforce authentication across autofill endpoints
router.use(requireAuth);

// POST /api/v1/autofill/match - Process extracted form fields and generate validated autofill suggestions
router.post('/match', doubleCsrfProtection, validateMatchRequest, matchFields);

export default router;

