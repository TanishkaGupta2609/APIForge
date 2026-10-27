
import { verifyToken } from '../modules/auth/jwt.service.js';
import User from '../modules/auth/user.model.js';
import { UnauthorizedError } from '../shared/errors/AppError.js';
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required. Missing Bearer token in Authorization header.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token format is invalid.');
    }
    // Decode and verify token
    const decoded = verifyToken(token);

    // Ensure user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('The user account associated with this token no longer exists.');
    }
    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export default authenticate;
