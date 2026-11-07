import { ValidationError } from '../shared/errors/AppError.js';

/**
 * Express middleware generator that validates request parts using Zod schemas.
 *
 * @param {object} schemas
 * @param {import('zod').ZodSchema} [schemas.body] - Zod schema for req.body
 * @param {import('zod').ZodSchema} [schemas.query] - Zod schema for req.query
 * @param {import('zod').ZodSchema} [schemas.params] - Zod schema for req.params
 * @returns {import('express').RequestHandler}
 */
export function validateRequest(schemas = {}) {
  return async (req, res, next) => {
    try {
      const activeSchemas = schemas?.shape || schemas;

      if (activeSchemas.body) {
        req.body = await activeSchemas.body.parseAsync(req.body);
      }

      if (activeSchemas.query) {
        req.query = await activeSchemas.query.parseAsync(req.query);
      }

      if (activeSchemas.params) {
        req.params = await activeSchemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError('Request validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

export default validateRequest;
