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
      format: z.enum(['json', 'csv']).optional().default('json'),
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

export default {
  runIdParamSchema,
  exportQuerySchema,
  compareQuerySchema,
};
