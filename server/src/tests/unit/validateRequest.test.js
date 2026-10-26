import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validateRequest.js';
import { ValidationError } from '../../shared/errors/AppError.js';

describe('validateRequest Middleware', () => {
  const mockReqResNext = (body = {}, query = {}, params = {}) => {
    const req = { body, query, params };
    const res = {};
    const next = vi.fn();
    return { req, res, next };
  };

  it('calls next() without error when request body satisfies schema', async () => {
    const schema = {
      body: z.object({
        name: z.string().min(3),
        url: z.string().url(),
      }),
    };

    const middleware = validateRequest(schema);
    const { req, res, next } = mockReqResNext({
      name: 'Test Target',
      url: 'https://example.com/api',
    });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.body.name).toBe('Test Target');
  });

  it('passes ValidationError to next() when request body is invalid', async () => {
    const schema = {
      body: z.object({
        name: z.string().min(3),
        url: z.string().url(),
      }),
    };

    const middleware = validateRequest(schema);
    const { req, res, next } = mockReqResNext({
      name: 'ab', // Too short
      url: 'invalid-url',
    });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorArg = next.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(ValidationError);
    expect(errorArg.statusCode).toBe(400);
    expect(errorArg.details).toHaveLength(2);
    expect(errorArg.details[0].field).toBe('name');
    expect(errorArg.details[1].field).toBe('url');
  });

  it('validates query parameters with type coercion', async () => {
    const schema = {
      query: z.object({
        limit: z.coerce.number().positive(),
      }),
    };

    const middleware = validateRequest(schema);
    const { req, res, next } = mockReqResNext({}, { limit: '25' });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query.limit).toBe(25);
  });
});
