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

    // Run matching pipeline (deterministic + MiniLM semantic + Gemini fallback + validation)
    const matchResult = await matchFormFields(fields, profile);

    return res.status(200).json({
      success: true,
      data: matchResult
    });
  } catch (err) {
    next(err);
  }
};

