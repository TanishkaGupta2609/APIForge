import { sendError } from '../shared/utils/response.js';
import {
  AppError,
  ValidationError,
  BadRequestError,
  ConflictError,
  InternalServerError,
} from '../shared/errors/AppError.js';
import env from '../config/env.js';

/**
 * Global error handling middleware.
 * Catches all operational and unexpected errors, serializing them into standard JSON envelopes.
 */
export function errorHandler(err, req, res, _next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return _next(err);
  }

  let error = err;

  // 1. Pass through operational AppErrors directly (preserves pre-computed details & codes)
  if (err instanceof AppError) {
    error = err;
  }

  // 2. Handle JSON parsing syntax errors (e.g. malformed body)
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new BadRequestError('Malformed JSON payload in request body');
  }

  // 3. Handle Mongoose Validation Error (database-level)
  else if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new ValidationError('Database validation error', details);
  }

  // 4. Handle Mongoose CastError (invalid ObjectId)
  else if (err.name === 'CastError') {
    error = new BadRequestError(`Invalid format for parameter: ${err.path}`);
  }

  // 5. Handle Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'field';
    error = new ConflictError(`Duplicate value entered for ${duplicatedField}`);
  }

  // 6. Fallback: If not an operational AppError, wrap in InternalServerError
  else {
    if (env.NODE_ENV !== 'test') {
      console.error('[APIForge Server Error]', err);
    }
    error = new InternalServerError(
      env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : err.message
    );
    // Preserve stack trace for dev debugging
    error.stack = err.stack;
  }

  return sendError(res, error);
}

export default errorHandler;
