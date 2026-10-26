import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateToken, verifyToken } from '../../modules/auth/jwt.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import User from '../../modules/auth/user.model.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';

describe('JWT Service & Authenticate Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generateToken and verifyToken work symmetrically', () => {
    const payload = { id: 'user_123', email: 'test@example.com' };
    const token = generateToken(payload);

    expect(typeof token).toBe('string');
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
  });

  it('verifyToken throws UnauthorizedError on expired token', () => {
    const token = generateToken({ id: 'user_expired' }, '-1s');
    expect(() => verifyToken(token)).toThrow(UnauthorizedError);
  });

  it('verifyToken throws UnauthorizedError on forged/invalid token', () => {
    expect(() => verifyToken('forged.invalid.token')).toThrow(UnauthorizedError);
  });

  it('authenticate middleware rejects missing Authorization header', async () => {
    const req = { headers: {} };
    const res = {};
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.message).toContain('Missing Bearer token');
  });

  it('authenticate middleware rejects non-Bearer token format', async () => {
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = {};
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('authenticate middleware attaches user when token is valid and user exists', async () => {
    const mockUser = { _id: '507f1f77bcf86cd799439011', name: 'Valid User', email: 'valid@example.com' };
    const token = generateToken({ id: mockUser._id });

    vi.spyOn(User, 'findById').mockResolvedValueOnce(mockUser);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBe(mockUser);
  });

  it('authenticate middleware rejects if user no longer exists in database', async () => {
    const token = generateToken({ id: '507f1f77bcf86cd799439011' });

    vi.spyOn(User, 'findById').mockResolvedValueOnce(null);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
