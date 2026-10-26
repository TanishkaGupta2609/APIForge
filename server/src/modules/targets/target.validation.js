import { z } from 'zod';

const headerItemSchema = z.object({
  key: z
    .string({ required_error: 'Header key is required' })
    .trim()
    .min(1, 'Header key cannot be empty')
    .max(100, 'Header key is too long'),
  value: z
    .string({ required_error: 'Header value is required' })
    .max(1000, 'Header value is too long'),
  isSecret: z.boolean().optional().default(false),
});

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

export const targetIdParamSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Target ID is required' })
      .regex(mongoIdRegex, 'Invalid target ID format. Must be a 24-character hexadecimal string.'),
  }),
});

export const createTargetSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Target name is required' })
      .trim()
      .min(1, 'Target name cannot be empty')
      .max(100, 'Target name cannot exceed 100 characters'),
    baseUrl: z
      .string({ required_error: 'Base URL is required' })
      .trim()
      .min(1, 'Base URL cannot be empty')
      .max(500, 'Base URL is too long'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .default(''),
    defaultHeaders: z
      .array(headerItemSchema)
      .max(50, 'Cannot exceed 50 default headers')
      .optional()
      .default([]),
  }),
});

export const updateTargetSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Target ID is required' })
      .regex(mongoIdRegex, 'Invalid target ID format. Must be a 24-character hexadecimal string.'),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, 'Target name cannot be empty')
        .max(100, 'Target name cannot exceed 100 characters')
        .optional(),
      baseUrl: z
        .string()
        .trim()
        .min(1, 'Base URL cannot be empty')
        .max(500, 'Base URL is too long')
        .optional(),
      description: z
        .string()
        .trim()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
      defaultHeaders: z
        .array(headerItemSchema)
        .max(50, 'Cannot exceed 50 default headers')
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update.',
    }),
});

export default {
  createTargetSchema,
  updateTargetSchema,
  targetIdParamSchema,
};
