import { URL } from 'url';
import { BadRequestError } from '../shared/errors/AppError.js';

/**
 * Safely constructs and normalizes the target URL by combining base URL and endpoint.
 *
 * @param {string} baseUrl - Target API base URL
 * @param {string} endpoint - Relative target endpoint
 * @returns {string} Fully qualified target URL
 */
export function buildTargetUrl(baseUrl, endpoint) {
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new BadRequestError('Target base URL is required.');
  }

  const trimmedBase = baseUrl.trim();
  const trimmedEndpoint = (endpoint || '').trim();

  // Strip trailing slashes from base
  const cleanBase = trimmedBase.replace(/\/+$/, '');

  // Ensure leading slash on endpoint if not empty
  const cleanEndpoint = trimmedEndpoint
    ? trimmedEndpoint.startsWith('/')
      ? trimmedEndpoint
      : `/${trimmedEndpoint}`
    : '';

  try {
    const fullUrl = new URL(`${cleanBase}${cleanEndpoint}`);
    if (!['http:', 'https:'].includes(fullUrl.protocol)) {
      throw new BadRequestError(`Unsupported URL protocol: '${fullUrl.protocol}'. Only http: and https: are permitted.`);
    }
    return fullUrl.toString();
  } catch (error) {
    throw new BadRequestError(`Invalid target URL construction: ${error.message}`);
  }
}

/**
 * Normalizes headers from a Map, Object, or undefined into a plain object.
 *
 * @param {Map|object} headers - Raw headers
 * @returns {object} Plain headers key-value object
 */
export function normalizeHeaders(headers) {
  if (!headers) return {};

  if (headers instanceof Map) {
    const result = {};
    for (const [key, value] of headers.entries()) {
      if (key && value !== undefined && value !== null) {
        result[String(key).trim()] = String(value);
      }
    }
    return result;
  }

  if (typeof headers === 'object' && !Array.isArray(headers)) {
    const result = {};
    for (const [key, value] of Object.entries(headers)) {
      if (key && value !== undefined && value !== null) {
        result[String(key).trim()] = String(value);
      }
    }
    return result;
  }

  return {};
}

/**
 * Generates an executable, secure k6 ES6 test script string from validated TestRun configuration.
 *
 * Security Guarantee:
 * All user-supplied inputs (URL, headers, body, method) are serialized into script constants
 * via JSON.stringify(). Arbitrary user input CANNOT break out of string literals or execute
 * arbitrary JavaScript in the k6 runtime.
 *
 * @param {object} testConfig - Test configuration object from TestRun.configuration
 * @returns {string} Fully formed k6 JavaScript test script
 */
export function buildK6Script(testConfig) {
  if (!testConfig) {
    throw new BadRequestError('Test configuration is required to generate k6 script.');
  }

  const {
    targetSnapshot,
    method = 'GET',
    endpoint = '',
    headers = {},
    body = null,
    vus = 1,
    duration = 10,
    rampUpDuration = 0,
    thresholds = {},
  } = testConfig;

  if (!targetSnapshot || !targetSnapshot.baseUrl) {
    throw new BadRequestError('Test configuration must include a valid target snapshot with baseUrl.');
  }

  const targetUrl = buildTargetUrl(targetSnapshot.baseUrl, endpoint);
  const normalizedMethod = String(method).toUpperCase();
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  if (!validMethods.includes(normalizedMethod)) {
    throw new BadRequestError(`Invalid HTTP method '${method}'. Allowed methods: ${validMethods.join(', ')}.`);
  }

  const cleanHeaders = normalizeHeaders(headers);

  // Default content-type for mutations with body if not explicitly set
  if (body && ['POST', 'PUT', 'PATCH'].includes(normalizedMethod)) {
    const hasContentType = Object.keys(cleanHeaders).some(
      (k) => k.toLowerCase() === 'content-type'
    );
    if (!hasContentType) {
      try {
        JSON.parse(body);
        cleanHeaders['Content-Type'] = 'application/json';
      } catch {
        // Leave as is if not valid JSON
      }
    }
  }

  // Construct options object
  const optionsObj = {};

  if (rampUpDuration > 0 && rampUpDuration < duration) {
    const steadyDuration = duration - rampUpDuration;
    optionsObj.stages = [
      { duration: `${rampUpDuration}s`, target: vus },
      { duration: `${steadyDuration}s`, target: vus },
    ];
  } else {
    optionsObj.vus = vus;
    optionsObj.duration = `${duration}s`;
  }

  // Configure k6 thresholds
  const thresholdRules = {};
  if (thresholds?.httpReqDurationP95 && thresholds.httpReqDurationP95 > 0) {
    thresholdRules.http_req_duration = [`p(95)<${Number(thresholds.httpReqDurationP95)}`];
  }
  if (thresholds?.httpReqFailedRate !== undefined && thresholds.httpReqFailedRate !== null && thresholds.httpReqFailedRate >= 0) {
    thresholdRules.http_req_failed = [`rate<=${Number(thresholds.httpReqFailedRate)}`];
  }

  if (Object.keys(thresholdRules).length > 0) {
    optionsObj.thresholds = thresholdRules;
  }

  // Serialized constants
  const serializedOptions = JSON.stringify(optionsObj, null, 2);
  const serializedTargetUrl = JSON.stringify(targetUrl);
  const serializedMethod = JSON.stringify(normalizedMethod);
  const serializedHeaders = JSON.stringify(cleanHeaders, null, 2);
  const serializedBody = JSON.stringify(body);

  // Generate clean, secure script template
  return `import http from 'k6/http';
import { check } from 'k6';

export const options = ${serializedOptions};

const TARGET_URL = ${serializedTargetUrl};
const METHOD = ${serializedMethod};
const HEADERS = ${serializedHeaders};
const BODY = ${serializedBody};

export default function () {
  const params = {
    headers: HEADERS,
    tags: { name: 'apiforge_load_request' },
  };

  let res;
  if (METHOD === 'GET') {
    res = http.get(TARGET_URL, params);
  } else if (METHOD === 'POST') {
    res = http.post(TARGET_URL, BODY, params);
  } else if (METHOD === 'PUT') {
    res = http.put(TARGET_URL, BODY, params);
  } else if (METHOD === 'PATCH') {
    res = http.patch(TARGET_URL, BODY, params);
  } else if (METHOD === 'DELETE') {
    res = http.del(TARGET_URL, BODY, params);
  }

  if (res) {
    check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
      'status is not 5xx': (r) => r.status < 500,
    });
  }
}
`;
}

export default {
  buildTargetUrl,
  normalizeHeaders,
  buildK6Script,
};
