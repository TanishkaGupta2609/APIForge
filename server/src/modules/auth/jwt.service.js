import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';

/**
 * Signs a JWT token with the application's secure secret.
 *
 * @param {object} payload
 * @param {string} [expiresIn]
 * @returns {string}
 */
export function generateToken(payload, expiresIn = env.JWT_EXPIRES_IN) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

/**
 * Verifies a JWT token, extracting the payload or throwing an UnauthorizedError.
 *
 * @param {string} token
 * @returns {object}
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Authentication token has expired. Please sign in again.');
    }
    throw new UnauthorizedError('Invalid or corrupted authentication token.');
  }
}

export default {
  generateToken,
  verifyToken,
};
