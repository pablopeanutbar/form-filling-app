import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { extensionService } from '../services/extension.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { doubleCsrfProtection } from '../middleware/csrf.middleware.js';
import { validateMatchRequest } from '../validators/autofill.validator.js';
import { matchFields } from '../controllers/autofill.controller.js';
import { extensionIds } from '../config/env.js';

const credential = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const body = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid connection request.' } });
  req.validatedBody = result.data;
  next();
};
const limited = (max, windowMs) => rateLimit({ max, windowMs, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Please wait a moment before trying again.' } } });

export function createExtensionRouter({ service = extensionService, sessionAuth = requireAuth, csrf = doubleCsrfProtection, match = matchFields, ids = extensionIds } = {}) {
  const router = Router();
  const respond = (fn) => async (req, res, next) => {
    try { res.json({ success: true, data: await fn(req) }); } catch (error) { next(error); }
  };
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('Referrer-Policy', 'no-referrer'); next(); });
  const client = (req, res, next) => {
    const id = req.get('X-Extension-Id');
    const origin = req.get('Origin');
    if (!ids.includes(id) || (origin && origin !== `chrome-extension://${id}`)) {
      return res.status(403).json({ success: false, error: { code: 'EXTENSION_NOT_ALLOWED', message: 'This extension is not enabled on this server.' } });
    }
    req.extensionId = id;
    next();
  };
  const requireCredential = async (req, res, next) => {
    const token = req.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Connect your account to continue.' } });
    try {
      const { account } = await service.authenticate(req.extensionId, token);
      req.user = account;
      next();
    } catch (error) { next(error); }
  };
  // Website-only approval/revocation uses the unchanged session + CSRF boundary.
  router.get('/pairing/:id', limited(60, 60000), sessionAuth, respond((req) => service.inspect(req.params.id)));
  router.post('/pairing/:id/decision', limited(20, 60000), sessionAuth, csrf,
    body(z.object({ verificationCode: z.string().regex(/^[A-F0-9]{8}$/), approved: z.boolean() }).strict()),
    respond((req) => service.decide(req.params.id, req.validatedBody.verificationCode, req.validatedBody.approved, req.user.id)));
  router.get('/connections', sessionAuth, respond((req) => service.list(req.user.id)));
  router.post('/connections/:id/revoke', limited(20, 60000), sessionAuth, csrf, (req, res, next) => {
    if (!/^[a-f0-9]{24}$/.test(req.params.id)) return res.status(400).json({ success: false });
    next();
  }, respond((req) => service.revokeOwned(req.user.id, req.params.id)));

  // Extension-only endpoints never fall back to cookies. No CSRF exemption is global.
  router.post('/pairing', client, limited(10, 15 * 60000), body(z.object({}).strict()), respond((req) => service.start(req.extensionId)));
  router.post('/exchange', client, limited(30, 60000), body(z.object({ deviceCode: credential }).strict()), respond((req) => service.exchange(req.extensionId, req.validatedBody.deviceCode)));
  router.post('/cancel', client, limited(20, 60000), body(z.object({ deviceCode: credential }).strict()), respond((req) => service.cancel(req.extensionId, req.validatedBody.deviceCode)));
  router.post('/refresh', client, limited(20, 60000), body(z.object({ refreshToken: credential }).strict()), respond((req) => service.refresh(req.extensionId, req.validatedBody.refreshToken)));
  router.post('/disconnect', client, limited(20, 60000), body(z.object({ revocationToken: credential }).strict()), respond((req) => service.revoke(req.extensionId, req.validatedBody.revocationToken)));
  router.get('/me', client, limited(60, 60000), requireCredential, respond((req) => ({ account: req.user })));
  router.post('/match', client, limited(15, 60000), requireCredential, validateMatchRequest, match);
  return router;
}
export default createExtensionRouter();
