import { Profile } from '../models/profile.model.js';

/**
 * Retrieve the user's profile, automatically initializing an empty one if not yet created.
 */
export const getOrCreateProfile = async (userId) => {
  let profile = await Profile.findOne({ userId });

  if (!profile) {
    profile = await Profile.create({
      userId,
      personal: {},
      contact: {},
      addresses: {
        permanent: {},
        correspondence: {}
      },
      education: [],
      professional: {
        skills: [],
        workExperience: [],
        profileLinks: {}
      }
    });
  }

  return profile.toJSON();
};

/**
 * Partially update profile sections without overwriting unrelated fields or sibling sections.
 */
export const updateProfile = async (userId, updateData) => {
  let profile = await Profile.findOne({ userId });

  if (!profile) {
    profile = new Profile({ userId });
  }

  // Deep merge personal information
  if (updateData.personal) {
    for (const [key, value] of Object.entries(updateData.personal)) {
      profile.personal[key] = value;
    }
  }

  // Deep merge contact information
  if (updateData.contact) {
    for (const [key, value] of Object.entries(updateData.contact)) {
      profile.contact[key] = value;
    }
  }

  // Deep merge addresses
  if (updateData.addresses) {
    if (updateData.addresses.permanent) {
      if (!profile.addresses.permanent) profile.addresses.permanent = {};
      for (const [key, value] of Object.entries(updateData.addresses.permanent)) {
        profile.addresses.permanent[key] = value;
      }
    }
    if (updateData.addresses.correspondence) {
      if (!profile.addresses.correspondence) profile.addresses.correspondence = {};
      for (const [key, value] of Object.entries(updateData.addresses.correspondence)) {
        profile.addresses.correspondence[key] = value;
      }
    }
  }

  // Deep merge professional information
  if (updateData.professional) {
    if (updateData.professional.skills !== undefined) {
      profile.professional.skills = updateData.professional.skills;
    }
    if (updateData.professional.workExperience !== undefined) {
      profile.professional.workExperience = updateData.professional.workExperience;
    }
    if (updateData.professional.profileLinks) {
      if (!profile.professional.profileLinks) profile.professional.profileLinks = {};
      for (const [key, value] of Object.entries(updateData.professional.profileLinks)) {
        profile.professional.profileLinks[key] = value;
      }
    }
  }

  await profile.save();
  return profile.toJSON();
};

/**
 * Add a new educational qualification record to the user's profile.
 */
export const addEducation = async (userId, educationData) => {
  let profile = await Profile.findOne({ userId });

  if (!profile) {
    profile = await Profile.create({ userId });
  }

  // Push new subdocument
  profile.education.push(educationData);
  await profile.save();

  // Return the newly added subdocument (last item)
  const newRecord = profile.education[profile.education.length - 1];
  return newRecord.toJSON();
};

/**
 * Update a specific educational qualification record by ID.
 */
export const updateEducation = async (userId, qualificationId, updateData) => {
  const profile = await Profile.findOne({ userId });

  if (!profile) {
    const error = new Error('Profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const record = profile.education.id(qualificationId);
  if (!record) {
    const error = new Error(`Educational qualification with id ${qualificationId} not found`);
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Apply updates to subdocument
  for (const [key, value] of Object.entries(updateData)) {
    record[key] = value;
  }

  await profile.save();
  return record.toJSON();
};

/**
 * Delete a specific educational qualification record by ID.
 */
export const deleteEducation = async (userId, qualificationId) => {
  const profile = await Profile.findOne({ userId });

  if (!profile) {
    const error = new Error('Profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const record = profile.education.id(qualificationId);
  if (!record) {
    const error = new Error(`Educational qualification with id ${qualificationId} not found`);
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  profile.education.pull({ _id: qualificationId });
  await profile.save();

  return true;
};

