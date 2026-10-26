import rateLimit from 'express-rate-limit';
import { sendError } from '../shared/utils/response.js';
import { RateLimitError } from '../shared/errors/AppError.js';
import env from '../config/env.js';

/**
 * Standard API rate limiter.
 * Caps requests to prevent resource exhaustion and abusive request flooding.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 200, // Generous in tests, restricted in production
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    sendError(res, new RateLimitError('Too many requests from this IP, please try again after 15 minutes'), 429);
  },
  skip: () => env.NODE_ENV === 'test', // Skip in automated testing unless specifically testing rate limiter
});

/**
 * Stricter rate limiter for sensitive authentication endpoints (prevent brute-force).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 10, // 10 attempts per 15 minutes window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, new RateLimitError('Too many authentication attempts, please try again after 15 minutes'), 429);
  },
  skip: () => env.NODE_ENV === 'test',
});

export default {
  apiLimiter,
  authLimiter,
};
