import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .email('Invalid email address format')
    .max(255, 'Email cannot exceed 255 characters')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
});

/**
 * Express middleware helper to validate request bodies against Zod schemas
 */
export const validateBody = (schema) => (req, res, next) => {
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

