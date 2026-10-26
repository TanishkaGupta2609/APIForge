import { Router } from 'express';
import * as authController from './auth.controller.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Registration endpoint
router.post(
  '/register',
  authLimiter,
  validateRequest(registerSchema),
  authController.register
);

// Login endpoint
router.post(
  '/login',
  authLimiter,
  validateRequest(loginSchema),
  authController.login
);

// Current user profile endpoint
router.get(
  '/me',
  authenticate,
  authController.getMe
);

export default router;
