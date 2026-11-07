import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const historyQuerySchema = z.object({
  query: z
    .object({
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .pipe(z.number().int().min(1).default(1)),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .pipe(z.number().int().min(1).max(100).default(10)),
      status: z
        .enum(['all', 'queued', 'running', 'completed', 'failed', 'cancelled'])
        .optional()
        .default('all'),
      targetId: z
        .string()
        .regex(OBJECT_ID_REGEX, { message: 'targetId must be a valid 24-character hexadecimal ObjectId.' })
        .optional(),
      search: z
        .string()
        .trim()
        .max(100, { message: 'Search term cannot exceed 100 characters.' })
        .optional(),
      startDate: z
        .string()
        .datetime({ message: 'startDate must be a valid ISO 8601 date string.' })
        .optional(),
      endDate: z
        .string()
        .datetime({ message: 'endDate must be a valid ISO 8601 date string.' })
        .optional(),
      sortBy: z
        .enum(['createdAt', 'name', 'duration', 'vus'])
        .optional()
        .default('createdAt'),
      sortOrder: z
        .enum(['desc', 'asc'])
        .optional()
        .default('desc'),
    })
    .optional()
    .default({}),
});

export const historyIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(OBJECT_ID_REGEX, { message: 'Test run ID must be a valid 24-character hexadecimal ObjectId.' }),
  }),
});

