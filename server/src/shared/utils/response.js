import env from '../../config/env.js';

/**
 * Sends a standardized JSON success response.
 *
 * @param {import('express').Response} res - Express response object
 * @param {any} [data=null] - Payload to return
 * @param {string} [message='Operation successful'] - Human-readable confirmation
 * @param {number} [statusCode=200] - HTTP status code
 */
export function sendSuccess(res, data = null, message = 'Operation successful', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

/**
 * Sends a standardized JSON error response.
 *
 * @param {import('express').Response} res - Express response object
 * @param {Error|import('../errors/AppError.js').AppError} error - Error instance
 * @param {number} [statusCode] - Optional override status code
 */
export function sendError(res, error, statusCode = null) {
  const status = statusCode || error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.message || 'An unexpected error occurred';
  const details = error.details || [];

  const errorPayload = {
    code,
    message,
    details,
  };

  // Only attach stack trace in development
  if (env.NODE_ENV === 'development' && error.stack) {
    errorPayload.stack = error.stack;
  }

  return res.status(status).json({
    success: false,
    error: errorPayload,
  });
}
