import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Helper to validate MongoDB ObjectId
 */
const mongoIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid MongoDB ObjectId format',
});

/**
 * Safe bounds for load testing execution.
 * Authoritative backend constraints to prevent resource exhaustion.
 */
export const TEST_CONSTRAINTS = {
  MIN_VUS: 1,
  MAX_VUS: 50, // Authoritative student project safety limit
  DEFAULT_VUS: 10,
  MIN_DURATION_SECONDS: 5,
  MAX_DURATION_SECONDS: 300, // 5 minutes max
  DEFAULT_DURATION_SECONDS: 30,
  MAX_BODY_BYTES: 64 * 1024, // 64 KB
  MAX_CONCURRENT_RUNS_PER_USER: 2,
};

/**
 * Validation schema for creating a new load test run configuration.
 */
export const createTestSchema = z.object({
  body: z
    .object({
      targetId: mongoIdSchema,
      name: z
        .string({ required_error: 'Test name is required' })
        .trim()
        .min(2, 'Test name must be at least 2 characters')
        .max(100, 'Test name cannot exceed 100 characters'),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], {
        errorMap: () => ({ message: 'Method must be one of: GET, POST, PUT, PATCH, DELETE' }),
      }),
      endpoint: z
        .string({ required_error: 'Endpoint path is required' })
        .trim()
        .refine((path) => path.startsWith('/'), {
          message: 'Endpoint must start with a forward slash (e.g., /api/users)',
        })
        .refine((path) => !path.startsWith('//'), {
          message: 'Endpoint cannot start with protocol-relative double slash //',
        })
        .refine((path) => !path.includes('://'), {
          message: 'Endpoint must be a relative path and cannot contain URL protocols (http://, https://)',
        }),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .default({}),
      body: z
        .string()
        .max(TEST_CONSTRAINTS.MAX_BODY_BYTES, 'Request body cannot exceed 64KB')
        .nullable()
        .optional()
        .default(null),
      vus: z
        .number({ invalid_type_error: 'Virtual users (VUs) must be a number' })
        .int('Virtual users must be an integer')
        .min(TEST_CONSTRAINTS.MIN_VUS, `VUs must be at least ${TEST_CONSTRAINTS.MIN_VUS}`)
        .max(TEST_CONSTRAINTS.MAX_VUS, `VUs cannot exceed authoritative limit of ${TEST_CONSTRAINTS.MAX_VUS}`)
        .default(TEST_CONSTRAINTS.DEFAULT_VUS),
      duration: z
        .number({ invalid_type_error: 'Duration must be a number' })
        .int('Duration must be an integer (in seconds)')
        .min(TEST_CONSTRAINTS.MIN_DURATION_SECONDS, `Duration must be at least ${TEST_CONSTRAINTS.MIN_DURATION_SECONDS}s`)
        .max(TEST_CONSTRAINTS.MAX_DURATION_SECONDS, `Duration cannot exceed ${TEST_CONSTRAINTS.MAX_DURATION_SECONDS}s`)
        .default(TEST_CONSTRAINTS.DEFAULT_DURATION_SECONDS),
      rampUpDuration: z
        .number({ invalid_type_error: 'Ramp-up duration must be a number' })
        .int('Ramp-up duration must be an integer (in seconds)')
        .min(0, 'Ramp-up duration cannot be negative')
        .default(0),
      thresholds: z
        .object({
          httpReqDurationP95: z
            .number()
            .positive('p95 threshold must be positive in milliseconds')
            .optional(),
          httpReqFailedRate: z
            .number()
            .min(0, 'Failure rate threshold cannot be negative')
            .max(1, 'Failure rate threshold must be between 0.0 and 1.0')
            .optional(),
        })
        .optional()
        .default({}),
    })
    .refine((data) => data.rampUpDuration < data.duration, {
      message: 'Ramp-up duration must be strictly less than the total test duration',
      path: ['rampUpDuration'],
    }),
});

/**
 * Validation schema for listing test runs with query filters and pagination.
 */
export const listTestsQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val >= 1, { message: 'Page must be a positive integer >= 1' }),
    limit: z
      .string()
      .optional()
      .default('10')
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val >= 1 && val <= 50, { message: 'Limit must be between 1 and 50' }),
    status: z
      .enum(['queued', 'running', 'completed', 'failed', 'cancelled'])
      .optional(),
    targetId: mongoIdSchema.optional(),
  }),
});

/**
 * Validation schema for URL parameter containing a Mongo ObjectId.
 */
export const testIdParamSchema = z.object({
  params: z.object({
    id: mongoIdSchema,
  }),
});
