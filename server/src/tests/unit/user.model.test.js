import { describe, it, expect } from 'vitest';
import User from '../../modules/auth/user.model.js';

describe('User Model & Password Security', () => {
  it('hashPassword creates a secure salted bcrypt hash', async () => {
    const plainPassword = 'SuperSecretPassword123!';
    const hash = await User.hashPassword(plainPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plainPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  it('comparePassword validates matching password and rejects incorrect password', async () => {
    const plainPassword = 'CorrectPassword456!';
    const hash = await User.hashPassword(plainPassword);

    const user = new User({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      passwordHash: hash,
    });

    const isMatch = await user.comparePassword(plainPassword);
    const isMismatch = await user.comparePassword('WrongPassword');

    expect(isMatch).toBe(true);
    expect(isMismatch).toBe(false);
  });

  it('toJSON strips passwordHash and __v from output', () => {
    const user = new User({
      name: 'Alan Turing',
      email: 'alan@example.com',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
    });

    const json = user.toJSON();
    expect(json.passwordHash).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.name).toBe('Alan Turing');
    expect(json.email).toBe('alan@example.com');
  });

  it('validates required fields', async () => {
    const user = new User({});
    const validationError = user.validateSync();

    expect(validationError.errors.name).toBeDefined();
    expect(validationError.errors.email).toBeDefined();
    expect(validationError.errors.passwordHash).toBeDefined();
  });
});
