import { describe, it, expect } from 'vitest';
import {
  sanitizeLogOutput,
  isProcessRunning,
  getActiveProcessCount,
  cancelProcess,
} from '../../load-testing/processManager.js';

describe('k6 Process Manager Suite', () => {
  describe('sanitizeLogOutput()', () => {
    it('redacts sensitive Bearer tokens in logs', () => {
      const raw = 'Request sent with Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTIzfQ.signature to endpoint';
      const sanitized = sanitizeLogOutput(raw);

      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(sanitized).toContain('Bearer [REDACTED]');
    });

    it('redacts password, token, and secret fields in JSON or key-value output', () => {
      const raw = 'User config payload: {"password": "SuperSecretPassword123", "apiKey": "xyz_secret_9988"}';
      const sanitized = sanitizeLogOutput(raw);

      expect(sanitized).not.toContain('SuperSecretPassword123');
      expect(sanitized).not.toContain('xyz_secret_9988');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('returns empty string for non-string or falsy input', () => {
      expect(sanitizeLogOutput(null)).toBe('');
      expect(sanitizeLogOutput(undefined)).toBe('');
      expect(sanitizeLogOutput('')).toBe('');
    });
  });

  describe('Process state tracking', () => {
    it('reports false for non-existent test run IDs', () => {
      expect(isProcessRunning('non-existent-id')).toBe(false);
    });

    it('returns 0 or positive integer for getActiveProcessCount()', () => {
      const count = getActiveProcessCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('cancelProcess returns false for unknown runId', async () => {
      const cancelled = await cancelProcess('unknown-id-12345');
      expect(cancelled).toBe(false);
    });
  });
});

