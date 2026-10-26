import { NotFoundError } from '../shared/errors/AppError.js';

/**
 * 404 Handler for unmatched routes.
 */
export function notFound(req, res, next) {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
}

export default notFound;
