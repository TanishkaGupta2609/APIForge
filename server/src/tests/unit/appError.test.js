import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
} from '../../shared/errors/AppError.js';

describe('AppError Hierarchy', () => {
  it('AppError creates instance with default values and captures stack', () => {
    const error = new AppError('Custom error', 418, 'I_AM_A_TEAPOT', [{ field: 'teapot' }]);
    expect(error.message).toBe('Custom error');
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe('I_AM_A_TEAPOT');
    expect(error.details).toEqual([{ field: 'teapot' }]);
    expect(error.isOperational).toBe(true);
    expect(error.stack).toBeDefined();
  });

  it('BadRequestError defaults to status 400 and code BAD_REQUEST', () => {
    const error = new BadRequestError('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Invalid input');
  });

  it('ValidationError defaults to status 400 and code VALIDATION_ERROR', () => {
    const error = new ValidationError('Invalid payload', [{ field: 'email', message: 'Invalid email' }]);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toHaveLength(1);
  });

  it('UnauthorizedError defaults to status 401 and code UNAUTHORIZED', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError defaults to status 403 and code FORBIDDEN', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('NotFoundError defaults to status 404 and code NOT_FOUND', () => {
    const error = new NotFoundError('Target not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Target not found');
  });

  it('ConflictError defaults to status 409 and code CONFLICT', () => {
    const error = new ConflictError('Email already registered');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  it('RateLimitError defaults to status 429 and code RATE_LIMIT_EXCEEDED', () => {
    const error = new RateLimitError();
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('InternalServerError defaults to status 500 and code INTERNAL_SERVER_ERROR', () => {
    const error = new InternalServerError();
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
