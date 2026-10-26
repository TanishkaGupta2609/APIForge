import * as authService from './auth.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

/**
 * Handle user registration request.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    return sendSuccess(res, result, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle user login request.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, result, 'User authenticated successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle fetching currently authenticated user profile.
 */
export async function getMe(req, res, next) {
  try {
    const profile = await authService.getMe(req.user._id);
    return sendSuccess(res, { user: profile }, 'Profile retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

export default {
  register,
  login,
  getMe,
};
