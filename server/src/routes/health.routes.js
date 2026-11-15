import { Router } from 'express';
import { getHealth, getReadiness } from '../controllers/health.controller.js';

const router = Router();

// GET /api/v1/health (Liveness)
router.get('/health', getHealth);

// GET /api/v1/ready (Readiness)
router.get('/ready', getReadiness);

export default router;
