import * as profileService from '../services/profile.service.js';

/**
 * GET /api/v1/profile/me
 * Retrieves the authenticated user's profile, initializing one if none exists.
 */
export const getMyProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getOrCreateProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: {
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/profile/me
 * Partially updates top-level profile sections while preserving unrelated fields.
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    const profile = await profileService.updateProfile(req.user.id, req.validatedBody);
    res.status(200).json({
      success: true,
      data: {
        message: 'Profile updated successfully',
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/profile/me/education
 * Adds an educational qualification record to the profile.
 */
export const addEducation = async (req, res, next) => {
  try {
    const qualification = await profileService.addEducation(req.user.id, req.validatedBody);
    res.status(201).json({
      success: true,
      data: {
        message: 'Educational qualification added successfully',
        qualification
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/profile/me/education/:qualificationId
 * Updates an existing educational qualification record by ID.
 */
export const updateEducation = async (req, res, next) => {
  try {
    const { qualificationId } = req.params;
    const qualification = await profileService.updateEducation(
      req.user.id,
      qualificationId,
      req.validatedBody
    );
    res.status(200).json({
      success: true,
      data: {
        message: 'Educational qualification updated successfully',
        qualification
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/profile/me/education/:qualificationId
 * Deletes an educational qualification record by ID.
 */
export const deleteEducation = async (req, res, next) => {
  try {
    const { qualificationId } = req.params;
    await profileService.deleteEducation(req.user.id, qualificationId);
    res.status(200).json({
      success: true,
      data: {
        message: 'Educational qualification removed successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

