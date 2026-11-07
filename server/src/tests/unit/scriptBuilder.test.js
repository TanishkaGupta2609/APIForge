import { describe, it, expect } from 'vitest';
import {
  buildTargetUrl,
  normalizeHeaders,
  buildK6Script,
} from '../../load-testing/scriptBuilder.js';
import { BadRequestError } from '../../shared/errors/AppError.js';

describe('k6 Script Builder Suite', () => {
  describe('buildTargetUrl()', () => {
    it('safely normalizes base URL and relative endpoint', () => {
      const url = buildTargetUrl('http://localhost:5001/', '/api/demo/ping');
      expect(url).toBe('http://localhost:5001/api/demo/ping');
    });

    it('handles base URL without trailing slash and endpoint without leading slash', () => {
      const url = buildTargetUrl('https://api.example.com', 'v1/users');
      expect(url).toBe('https://api.example.com/v1/users');
    });

    it('handles empty endpoint by pointing directly to base URL', () => {
      const url = buildTargetUrl('http://localhost:5001', '');
      expect(url).toBe('http://localhost:5001/');
    });

    it('rejects invalid or missing base URLs', () => {
      expect(() => buildTargetUrl('', '/endpoint')).toThrow(BadRequestError);
      expect(() => buildTargetUrl(null, '/endpoint')).toThrow(BadRequestError);
      expect(() => buildTargetUrl('ftp://example.com', '/endpoint')).toThrow(BadRequestError);
    });
  });

  describe('normalizeHeaders()', () => {
    it('normalizes JS Map into key-value object', () => {
      const map = new Map([
        ['Authorization', 'Bearer token123'],
        ['X-Custom', 'Value'],
      ]);
      const normalized = normalizeHeaders(map);
      expect(normalized).toEqual({
        Authorization: 'Bearer token123',
        'X-Custom': 'Value',
      });
    });

    it('normalizes plain object headers and trims whitespace', () => {
      const headers = { ' X-Api-Key ': ' secret123 ' };
      const normalized = normalizeHeaders(headers);
      expect(normalized).toEqual({
        'X-Api-Key': ' secret123 ',
      });
    });

    it('returns empty object for falsy headers', () => {
      expect(normalizeHeaders(null)).toEqual({});
      expect(normalizeHeaders(undefined)).toEqual({});
    });
  });

  describe('buildK6Script()', () => {
    const validConfig = {
      targetSnapshot: {
        name: 'Demo Ping Target',
        baseUrl: 'http://localhost:5001',
      },
      method: 'GET',
      endpoint: '/api/demo/ping',
      headers: { 'Accept': 'application/json' },
      body: null,
      vus: 10,
      duration: 15,
      rampUpDuration: 0,
    };

    it('generates executable k6 script with constant virtual users', () => {
      const script = buildK6Script(validConfig);

      expect(script).toContain("import http from 'k6/http'");
      expect(script).toContain("import { check } from 'k6'");
      expect(script).toContain('"vus": 10');
      expect(script).toContain('"duration": "15s"');
      expect(script).toContain('http://localhost:5001/api/demo/ping');
      expect(script).toContain('"GET"');
      expect(script).toContain('http.get(TARGET_URL, params)');
    });

    it('generates ramp-up stages when rampUpDuration is greater than 0', () => {
      const rampConfig = {
        ...validConfig,
        duration: 30,
        rampUpDuration: 10,
        vus: 25,
      };

      const script = buildK6Script(rampConfig);

      expect(script).toContain('"stages"');
      expect(script).toContain('"duration": "10s"');
      expect(script).toContain('"duration": "20s"');
      expect(script).toContain('"target": 25');
    });

    it('generates threshold rules when thresholds are configured', () => {
      const thresholdConfig = {
        ...validConfig,
        thresholds: {
          httpReqDurationP95: 250,
          httpReqFailedRate: 0.05,
        },
      };

      const script = buildK6Script(thresholdConfig);

      expect(script).toContain('"thresholds"');
      expect(script).toContain('p(95)<250');
      expect(script).toContain('rate<=0.05');
    });

    it('safely handles POST methods with request body and Content-Type', () => {
      const postConfig = {
        ...validConfig,
        method: 'POST',
        endpoint: '/api/demo/echo',
        body: '{"username":"tester","action":"probe"}',
      };

      const script = buildK6Script(postConfig);

      expect(script).toContain('"POST"');
      expect(script).toContain('http.post(TARGET_URL, BODY, params)');
      expect(script).toContain('"Content-Type": "application/json"');
      expect(script).toContain('tester');
    });

    it('strictly prevents JavaScript injection via hostile body or headers', () => {
      const hostileConfig = {
        ...validConfig,
        body: '"); } function evil() { process.exit(1); } /*',
        headers: {
          'X-Hostile': '"; evil(); //',
        },
      };

      const script = buildK6Script(hostileConfig);

      // Verify that code cannot break out into executable functions
      expect(script).toContain('\\"); } function evil()');
      expect(script).toContain('\\"; evil(); //');
    });

    it('rejects invalid configurations without baseUrl or method', () => {
      expect(() => buildK6Script(null)).toThrow(BadRequestError);
      expect(() => buildK6Script({ targetSnapshot: null })).toThrow(BadRequestError);
      expect(() => buildK6Script({ ...validConfig, method: 'INVALID' })).toThrow(BadRequestError);
    });
  });
});
