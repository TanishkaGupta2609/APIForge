import { describe, it, expect } from 'vitest';
import { validateEnv } from '../../config/env.js';

describe('Server Environment Validation', () => {
  const validBaseEnv = {
    PORT: '5000',
    NODE_ENV: 'test',
    CLIENT_URL: 'http://localhost:5173',
    MONGODB_URI: 'mongodb://localhost:27017/apiforge',
    JWT_SECRET: 'super_secret_jwt_key_that_is_at_least_32_characters_long',
  };

  it('validates and loads properly configured environment variables', () => {
    const validated = validateEnv(validBaseEnv);
    expect(validated.PORT).toBe(5000);
    expect(validated.NODE_ENV).toBe('test');
    expect(validated.CLIENT_URL).toBe('http://localhost:5173');
    expect(validated.JWT_SECRET).toBe(validBaseEnv.JWT_SECRET);
    expect(validated.MAX_VIRTUAL_USERS).toBe(500); // Default check
  });

  it('rejects short JWT_SECRET under 32 characters for security', () => {
    const insecureEnv = {
      ...validBaseEnv,
      JWT_SECRET: 'too_short_secret',
    };

    expect(() => validateEnv(insecureEnv)).toThrow(/JWT_SECRET must be at least 32 characters/i);
  });

  it('rejects invalid client URL format', () => {
    const invalidUrlEnv = {
      ...validBaseEnv,
      CLIENT_URL: 'not-a-valid-url',
    };

    expect(() => validateEnv(invalidUrlEnv)).toThrow(/Invalid url/i);
  });
});
