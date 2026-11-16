import { z } from 'zod';

const fieldInputSchema = z.object({
  fieldId: z.string().max(100).optional(),
  label: z.string().max(500).optional().default(''),
  name: z.string().max(200).optional().default(''),
  type: z.string().max(50).optional().default('text'),
  id: z.string().max(200).optional().default(''),
  placeholder: z.string().max(500).optional().default(''),
  section: z.string().max(300).optional().default(''),
  options: z.array(z.union([z.string().max(300), z.object({ label: z.string().max(300), value: z.string().max(300), disabled: z.boolean().optional() }).strict()])).max(100).optional(),
  optionsTruncated: z.boolean().optional(),
  required: z.boolean().optional().default(false),
  constraints: z.object({
    maxlength: z.number().int().nonnegative().max(1000000).optional(),
    minlength: z.number().int().nonnegative().max(1000000).optional(),
    min: z.string().max(100).optional(), max: z.string().max(100).optional(),
    step: z.string().max(100).optional(), pattern: z.string().max(500).optional(),
    multiple: z.boolean().optional(), inputType: z.string().max(50).optional()
  }).strict().optional()
}).strict();

export const matchRequestSchema = z.object({
  fields: z
    .array(fieldInputSchema, { required_error: 'fields array is required' })
    .min(1, 'At least one form field must be provided')
    .max(100, 'Cannot process more than 100 fields in a single batch')
}).strict().superRefine(({ fields }, ctx) => {
  const ids = fields.map((field) => field.fieldId).filter(Boolean);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Field identifiers must be unique.' });
});

/**
 * Express middleware helper to validate autofill match request body
 */
export const validateMatchRequest = (req, res, next) => {
  const result = matchRequestSchema.safeParse(req.body);
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

