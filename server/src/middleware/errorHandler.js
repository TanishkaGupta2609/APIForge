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

  // Handle JSON parsing syntax errors (e.g. malformed body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new BadRequestError('Malformed JSON payload in request body');
  }

  // Handle Mongoose Validation Error
  else if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new ValidationError('Database validation error', details);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  else if (err.name === 'CastError') {
    error = new BadRequestError(`Invalid format for parameter: ${err.path}`);
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'field';
    error = new ConflictError(`Duplicate value entered for ${duplicatedField}`);
  }

  // Fallback: If not an operational AppError, wrap in InternalServerError
  else if (!(err instanceof AppError)) {
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
