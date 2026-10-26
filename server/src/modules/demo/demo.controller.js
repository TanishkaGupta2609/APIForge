import { sendSuccess } from '../../shared/utils/response.js';

// In-memory rate limiting store for /api/demo/rate-limited
const rateLimitStore = new Map();

/**
 * Baseline instant ping endpoint.
 * GET /api/demo/ping
 */
export function ping(req, res) {
  return sendSuccess(
    res,
    {
      pong: true,
      timestamp: new Date().toISOString(),
      server: 'APIForge-Demo-Sandbox',
    },
    'Demo ping successful'
  );
}

/**
 * Health probe for demo sandbox.
 * GET /api/demo/health
 */
export function health(req, res) {
  return sendSuccess(
    res,
    {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      availableScenarios: [
        { path: '/api/demo/ping', description: 'Instant 200 OK baseline' },
        { path: '/api/demo/delayed?ms=250', description: 'Simulated artificial latency' },
        { path: '/api/demo/error?status=500', description: 'Configurable error injection' },
        { path: '/api/demo/rate-limited', description: 'Sliding window rate limit (429)' },
      ],
    },
    'Demo sandbox is active'
  );
}

/**
 * Artificial latency endpoint.
 * GET /api/demo/delayed?ms=250
 */
export async function delayed(req, res) {
  const requestedMs = parseInt(req.query.ms, 10);
  // Clamp simulated delay between 0 and 5000 ms for safety
  const delayMs = isNaN(requestedMs) ? 200 : Math.max(0, Math.min(5000, requestedMs));

  const startTime = Date.now();
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const actualDelay = Date.now() - startTime;

  return sendSuccess(
    res,
    {
      simulatedDelayMs: delayMs,
      actualDelayMs: actualDelay,
      note: 'Artificial latency is a controlled test scenario; observed latency includes OS scheduling and network transit.',
    },
    `Completed after ${delayMs}ms simulated latency`
  );
}

/**
 * Configurable error injection endpoint.
 * GET /api/demo/error?status=500&rate=1.0
 */
export function errorScenario(req, res) {
  const requestedStatus = parseInt(req.query.status, 10);
  const allowedStatuses = [400, 401, 403, 404, 409, 422, 500, 502, 503, 504];
  const statusCode = allowedStatuses.includes(requestedStatus) ? requestedStatus : 500;

  const failureRate = parseFloat(req.query.rate);
  const rate = isNaN(failureRate) ? 1.0 : Math.max(0, Math.min(1.0, failureRate));

  // Determine whether this request fails based on random probability
  const shouldFail = Math.random() < rate;

  if (shouldFail) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code: `DEMO_SIMULATED_HTTP_${statusCode}`,
        message: `Simulated error response with HTTP ${statusCode}`,
        statusCode,
        timestamp: new Date().toISOString(),
      },
    });
  }

  return sendSuccess(
    res,
    {
      injectedFailureRate: rate,
      outcome: 'passed',
    },
    'Request passed probabilistic fault injection'
  );
}

/**
 * Sliding window rate limiting endpoint (returns 429 when cap hit).
 * GET /api/demo/rate-limited?limit=10&window=10
 */
export function rateLimited(req, res) {
  const clientKey = req.ip || req.headers['x-forwarded-for'] || 'demo-client';
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
  const windowSec = Math.max(1, Math.min(60, parseInt(req.query.window, 10) || 10));
  const now = Date.now();
  const windowMs = windowSec * 1000;

  let clientRecord = rateLimitStore.get(clientKey);
  if (!clientRecord) {
    clientRecord = { timestamps: [] };
    rateLimitStore.set(clientKey, clientRecord);
  }

  // Filter timestamps within current window
  clientRecord.timestamps = clientRecord.timestamps.filter((ts) => now - ts < windowMs);

  if (clientRecord.timestamps.length >= limit) {
    const oldest = clientRecord.timestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);

    res.setHeader('Retry-After', String(retryAfterSec));
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', '0');

    return res.status(429).json({
      success: false,
      error: {
        code: 'DEMO_RATE_LIMIT_EXCEEDED',
        message: `Rate limit of ${limit} requests per ${windowSec}s exceeded. Please slow down.`,
        statusCode: 429,
        retryAfterSeconds: retryAfterSec,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Record hit
  clientRecord.timestamps.push(now);

  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(limit - clientRecord.timestamps.length));

  return sendSuccess(
    res,
    {
      currentHits: clientRecord.timestamps.length,
      limit,
      windowSeconds: windowSec,
      remaining: limit - clientRecord.timestamps.length,
    },
    'Request accepted within rate limit'
  );
}

export function resetRateLimits() {
  rateLimitStore.clear();
}

export default {
  ping,
  health,
  delayed,
  errorScenario,
  rateLimited,
  resetRateLimits,
};
