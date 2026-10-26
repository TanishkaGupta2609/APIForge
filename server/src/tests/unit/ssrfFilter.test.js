import { describe, it, expect } from 'vitest';
import { validateTargetUrl, isPrivateIp } from '../../shared/utils/ssrfFilter.js';
import { ValidationError } from '../../shared/errors/AppError.js';

describe('SSRF Protection Filter Utility', () => {
  describe('isPrivateIp()', () => {
    it('detects IPv4 loopback addresses (127.0.0.0/8)', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.255.255.255')).toBe(true);
    });

    it('detects Class A private addresses (10.0.0.0/8)', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.254.1.99')).toBe(true);
    });

    it('detects Class B private addresses (172.16.0.0/12)', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.254')).toBe(true);
      expect(isPrivateIp('172.32.0.1')).toBe(false); // Public
    });

    it('detects Class C private addresses (192.168.0.0/16)', () => {
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('192.168.254.254')).toBe(true);
    });

    it('detects cloud metadata IP (169.254.169.254)', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
    });

    it('detects IPv6 loopback and private scopes', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
    });

    it('allows valid public IPs', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('93.184.216.34')).toBe(false); // example.com
    });
  });

  describe('validateTargetUrl()', () => {
    it('rejects unsupported protocols like ftp:, file:, javascript:', async () => {
      await expect(validateTargetUrl('ftp://example.com')).rejects.toThrow(ValidationError);
      await expect(validateTargetUrl('file:///etc/passwd')).rejects.toThrow(ValidationError);
      await expect(validateTargetUrl('javascript:alert(1)')).rejects.toThrow(ValidationError);
    });

    it('rejects loopback and localhost target hostnames', async () => {
      await expect(validateTargetUrl('http://localhost:8080', { allowDemo: false })).rejects.toThrow(
        ValidationError
      );
      await expect(
        validateTargetUrl('http://test.localhost', { allowDemo: false })
      ).rejects.toThrow(ValidationError);
    });

    it('rejects cloud metadata IP target', async () => {
      await expect(
        validateTargetUrl('http://169.254.169.254/latest/meta-data')
      ).rejects.toThrow(ValidationError);
    });

    it('rejects private LAN IP target', async () => {
      await expect(validateTargetUrl('http://192.168.1.50:3000')).rejects.toThrow(
        ValidationError
      );
    });

    it('permits sanctioned local Demo API target when allowDemo is true', async () => {
      const result = await validateTargetUrl('http://localhost:5001/api/demo/ping', {
        allowDemo: true,
      });
      expect(result.isValid).toBe(true);
      expect(result.isDemo).toBe(true);
      expect(result.normalizedUrl).toBe('http://localhost:5001');
    });

    it('accepts and normalizes valid public HTTPS targets', async () => {
      const result = await validateTargetUrl('https://httpbin.org/get');
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('https://httpbin.org');
    });
  });
});
