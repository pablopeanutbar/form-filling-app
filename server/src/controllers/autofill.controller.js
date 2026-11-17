import { getOrCreateProfile } from '../services/profile.service.js';
import { matchFormFields } from '../services/matching/matching.service.js';

/**
 * Handle form field matching and autofill suggestion requests
 * POST /api/v1/autofill/match
 */
export const matchFields = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fields } = req.validatedBody;

    // Retrieve user's canonical profile
    const profile = await getOrCreateProfile(userId);

    // Run matching pipeline (deterministic + MiniLM semantic + validation)
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    const localHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(req.headers.host || '');
    const forwarded = Object.keys(req.headers).some((key) => key === 'forwarded' || key.startsWith('x-forwarded-'));
    const matchResult = await matchFormFields(fields, profile, { localDevelopmentRequest: local && localHost && !forwarded });

    return res.status(200).json({
      success: true,
      data: matchResult
    });
  } catch (err) {
    next(err);
  }
};

