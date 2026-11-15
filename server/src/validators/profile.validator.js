import { z } from 'zod';

/**
 * Helper to recursively scan an object for keys starting with '$' (MongoDB operator injection defense)
 */
export const containsMongoOperators = (obj) => {
  if (!obj || typeof obj !== 'object') return false;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) return true;
    if (typeof obj[key] === 'object' && containsMongoOperators(obj[key])) {
      return true;
    }
  }
  return false;
};

// String helper allowing null or empty string transformed to null
const nullableString = (maxLen) =>
  z
    .union([z.string().max(maxLen).trim(), z.null()])
    .optional()
    .transform((val) => (val === '' ? null : val));

export const personalSchema = z
  .object({
    fullName: nullableString(120),
    dateOfBirth: nullableString(30),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().optional(),
    fatherName: nullableString(120),
    motherName: nullableString(120),
    guardianName: nullableString(120),
    guardianRelation: nullableString(60)
  })
  .strict();

export const contactSchema = z
  .object({
    primaryPhone: nullableString(25),
    alternatePhone: nullableString(25),
    contactEmail: z
      .union([z.string().email('Invalid email address format').max(255).toLowerCase().trim(), z.null(), z.literal('')])
      .optional()
      .transform((val) => (val === '' ? null : val))
  })
  .strict();

export const addressSchema = z
  .object({
    addressLine1: nullableString(200),
    addressLine2: nullableString(200),
    city: nullableString(100),
    district: nullableString(100),
    state: nullableString(100),
    country: nullableString(100),
    postalCode: nullableString(20)
  })
  .strict();

export const addressesSchema = z
  .object({
    permanent: addressSchema.optional(),
    correspondence: addressSchema.optional()
  })
  .strict();

export const workExperienceSchema = z
  .object({
    jobTitle: z.string({ required_error: 'Job title is required' }).min(1).max(120).trim(),
    company: z.string({ required_error: 'Company is required' }).min(1).max(120).trim(),
    location: nullableString(100),
    startDate: nullableString(30),
    endDate: nullableString(30),
    isCurrent: z.boolean().optional().default(false),
    description: nullableString(1000)
  })
  .strict();

export const professionalSchema = z
  .object({
    skills: z.array(z.string().max(60).trim()).max(50).optional(),
    workExperience: z.array(workExperienceSchema).max(20).optional(),
    profileLinks: z
      .object({
        linkedin: nullableString(300),
        github: nullableString(300),
        portfolio: nullableString(300),
        other: nullableString(300)
      })
      .strict()
      .optional()
  })
  .strict();

export const updateProfileSchema = z
  .object({
    personal: personalSchema.optional(),
    contact: contactSchema.optional(),
    addresses: addressesSchema.optional(),
    professional: professionalSchema.optional()
  })
  .strict();

export const educationSchema = z
  .object({
    qualificationLevel: z
      .string({ required_error: 'Qualification level is required' })
      .min(1, 'Qualification level is required')
      .max(100)
      .trim(),
    degreeName: z
      .string({ required_error: 'Degree or examination name is required' })
      .min(1, 'Degree or examination name is required')
      .max(150)
      .trim(),
    institution: nullableString(200),
    boardOrUniversity: nullableString(200),
    specialization: nullableString(150),
    subjects: z.array(z.string().max(100).trim()).max(30).optional().default([]),
    startDate: nullableString(30),
    completionDate: nullableString(30),
    passingYear: z.number().int().min(1900).max(2100).nullable().optional(),
    marksObtained: z.number().min(0).nullable().optional(),
    maxMarks: z.number().positive().nullable().optional(),
    percentage: z.number().min(0).max(100).nullable().optional(),
    cgpa: z.number().min(0).nullable().optional(),
    cgpaScale: z.number().positive().nullable().optional(),
    sgpa: z.number().min(0).nullable().optional(),
    resultStatus: z
      .enum(['passed', 'appearing', 'awaited', 'failed', 'other'])
      .optional()
      .default('passed')
  })
  .strict();

export const updateEducationSchema = educationSchema.partial().strict();

/**
 * Middleware validating profile update payloads with MongoDB operator guard
 */
export const validateProfileUpdate = (req, res, next) => {
  if (containsMongoOperators(req.body)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request payload contains forbidden operators'
      }
    });
  }

  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: issue.message,
        details: result.error.flatten().fieldErrors
      }
    });
  }

  req.validatedBody = result.data;
  next();
};

/**
 * Middleware validating education record creation/update
 */
export const validateEducationInput = (isUpdate = false) => (req, res, next) => {
  if (containsMongoOperators(req.body)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request payload contains forbidden operators'
      }
    });
  }

  const schema = isUpdate ? updateEducationSchema : educationSchema;
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const issue = result.error.issues[0];
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: issue.message,
        details: result.error.flatten().fieldErrors
      }
    });
  }

  req.validatedBody = result.data;
  next();
};

