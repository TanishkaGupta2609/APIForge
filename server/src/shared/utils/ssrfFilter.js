import { URL } from 'node:url';
import dns from 'node:dns/promises';
import net from 'node:net';
import { ValidationError } from '../errors/AppError.js';
import env from '../../config/env.js';

const BLOCKED_HOSTNAMES = new Set([

  'localhost',
  'metadata.google.internal',
  'instance-data',
]);

/**
 * Check if an IPv4 address falls within reserved/private IP space.
 *
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateIp(ip) {
  if (!net.isIP(ip)) return false;

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // Loopback, unique local, link-local, IPv4-mapped loopback
    if (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80') ||
      normalized.includes('::ffff:127.') ||
      normalized.includes('::ffff:10.') ||
      normalized.includes('::ffff:192.168.') ||
      normalized.includes('::ffff:172.')
    ) {
      return true;
    }
    return false;
  }

  // IPv4 checks
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP
  }

  const [p0, p1] = parts;

  // 127.0.0.0/8 (Loopback)
  if (p0 === 127) return true;
  // 10.0.0.0/8 (Class A Private)
  if (p0 === 10) return true;
  // 172.16.0.0/12 (Class B Private)
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
  // 192.168.0.0/16 (Class C Private)
  if (p0 === 192 && p1 === 168) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (p0 === 169 && p1 === 254) return true;
  // 0.0.0.0/8
  if (p0 === 0) return true;
  // 100.64.0.0/10
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;
  // Multicast & Broadcast
  if (p0 >= 224) return true;

  return false;
}

/**
 * Check if the URL targets the built-in demo API server.
 *
 * @param {URL} parsedUrl
 * @returns {boolean}
 */
function isDemoTarget(parsedUrl) {
  try {
    const demoUrl = new URL(env.DEMO_API_URL);
    return (
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') &&
      String(parsedUrl.port) === String(demoUrl.port)
    );
  } catch {
    return false;
  }
}

/**
 * Validate and normalize a candidate target URL to prevent Server-Side Request Forgery (SSRF).
 *
 * @param {string} rawUrl
 * @param {object} [options]
 * @param {boolean} [options.allowDemo=true]
 * @returns {Promise<{ isValid: boolean, normalizedUrl: string, isDemo: boolean }>}
 * @throws {ValidationError}
 */
export async function validateTargetUrl(rawUrl, options = { allowDemo: true }) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new ValidationError('Target base URL must be a non-empty string.', [
      { field: 'baseUrl', message: 'Target URL is required.' },
    ]);
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new ValidationError('Invalid target URL format. Must include protocol (http:// or https://).', [
      { field: 'baseUrl', message: 'Malformed URL.' },
    ]);
  }

  // Enforce permitted schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('Target URL scheme must be HTTP or HTTPS.', [
      { field: 'baseUrl', message: `Unsupported protocol "${parsed.protocol}". Only http: and https: are allowed.` },
    ]);
  }

  // Check if this is the sanctioned Demo API target
  if (options.allowDemo && isDemoTarget(parsed)) {
    // Normalize and return demo target
    return {
      isValid: true,
      normalizedUrl: parsed.origin,
      isDemo: true,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block forbidden hostnames
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')) {
    throw new ValidationError(
      'Target URL cannot point to loopback or internal infrastructure for safety reasons.',
      [{ field: 'baseUrl', message: 'Localhost and internal loopback targets are prohibited.' }]
    );
  }

  // Direct IP address check
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new ValidationError(
        'Target URL cannot point to private, link-local, or cloud metadata addresses (SSRF protection).',
        [{ field: 'baseUrl', message: `Target IP ${hostname} belongs to a prohibited private network.` }]
      );
    }
  } else {
    // Domain name: resolve DNS to prevent DNS rebinding and private LAN resolution
    try {
      const { address } = await dns.lookup(hostname);
      if (isPrivateIp(address)) {
        throw new ValidationError(
          'Target hostname resolves to a prohibited private or link-local address.',
          [{ field: 'baseUrl', message: `Hostname ${hostname} resolves to private IP ${address}.` }]
        );
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(
        `Unable to resolve target domain "${hostname}". Please verify the domain is reachable.`,
        [{ field: 'baseUrl', message: `DNS resolution failed for ${hostname}.` }]
      );
    }
  }

  // Normalize by stripping trailing slashes for consistent target matching
  const normalizedUrl = parsed.origin;

  return {
    isValid: true,
    normalizedUrl,
    isDemo: false,
  };
}

export default {
  validateTargetUrl,
  isPrivateIp,
};
