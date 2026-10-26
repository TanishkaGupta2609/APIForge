import User from './user.model.js';
import { generateToken } from './jwt.service.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../shared/errors/AppError.js';

/**
 * Register a new developer account.
 *
 * @param {object} input
 * @param {string} input.name
 * @param {string} input.email
 * @param {string} input.password
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for duplicate account
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ConflictError('An account with this email address already exists.');
  }

  // Hash password using bcrypt
  const passwordHash = await User.hashPassword(password);

  // Persist user record
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
  });

  // Issue authentication token
  const token = generateToken({ id: user._id, email: user.email });

  return {
    user: user.toJSON(),
    token,
  };
}

/**
 * Authenticate user credentials and issue a JWT token.
 *
 * @param {object} input
 * @param {string} input.email
 * @param {string} input.password
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Query user including passwordHash
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Verify password hash
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Issue authentication token
  const token = generateToken({ id: user._id, email: user.email });

  return {
    user: user.toJSON(),
    token,
  };
}

/**
 * Retrieve authenticated user profile by ID.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User profile not found.');
  }
  return user.toJSON();
}

export default {
  register,
  login,
  getMe,
};
