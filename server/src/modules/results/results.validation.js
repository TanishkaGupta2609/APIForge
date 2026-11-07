import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const runIdParamSchema = z.object({
  params: z.object({
    runId: z.string().regex(OBJECT_ID_REGEX, {
      message: 'Invalid run ID format. Must be a 24-character hexadecimal ObjectId.',
    }),
  }),
});

export const exportQuerySchema = z.object({
  params: z.object({
    runId: z.string().regex(OBJECT_ID_REGEX, {
      message: 'Invalid run ID format. Must be a 24-character hexadecimal ObjectId.',
    }),
  }),
  query: z
    .object({
      format: z.enum(['json', 'csv', 'html']).optional().default('json'),
    })
    .optional()
    .default({}),
});

export const compareQuerySchema = z.object({
  query: z
    .object({
      baseRunId: z.string().regex(OBJECT_ID_REGEX, {
        message: 'baseRunId must be a valid 24-character hexadecimal ObjectId.',
      }),
      compareRunId: z.string().regex(OBJECT_ID_REGEX, {
        message: 'compareRunId must be a valid 24-character hexadecimal ObjectId.',
      }),
    })
    .refine((data) => data.baseRunId !== data.compareRunId, {
      message: 'Base run ID and comparison run ID cannot be identical.',
      path: ['compareRunId'],
    }),
});

export const trendsQuerySchema = z.object({
  query: z
    .object({
      targetId: z
        .string()
        .regex(OBJECT_ID_REGEX, {
          message: 'targetId must be a valid 24-character hexadecimal ObjectId.',
        })
        .optional(),
      limit: z
        .string()
        .optional()
        .default('10')
        .transform((val) => parseInt(val, 10))
        .refine((val) => !isNaN(val) && val >= 2 && val <= 50, {
          message: 'Limit must be an integer between 2 and 50',
        }),
    })
    .optional()
    .default({}),
});

export default {
  runIdParamSchema,
  exportQuerySchema,
  compareQuerySchema,
  trendsQuerySchema,
};
