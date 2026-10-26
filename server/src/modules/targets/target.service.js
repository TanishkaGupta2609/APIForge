import Target from './target.model.js';
import { validateTargetUrl } from '../../shared/utils/ssrfFilter.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

/**
 * List all targets owned by the user.
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export async function listTargets(userId) {
  const targets = await Target.find({ owner: userId }).sort({ createdAt: -1 });
  return targets.map((t) => t.toJSON());
}

/**
 * Create a new target API for the user after SSRF validation.
 *
 * @param {string} userId
 * @param {object} input
 * @param {string} input.name
 * @param {string} input.baseUrl
 * @param {string} [input.description]
 * @param {Array<object>} [input.defaultHeaders]
 * @returns {Promise<object>}
 */
export async function createTarget(userId, input) {
  // Validate against SSRF (blocks loopbacks, private networks, cloud metadata)
  const { normalizedUrl } = await validateTargetUrl(input.baseUrl);

  const target = await Target.create({
    owner: userId,
    name: input.name.trim(),
    baseUrl: normalizedUrl,
    description: input.description || '',
    defaultHeaders: input.defaultHeaders || [],
  });

  return target.toJSON();
}

/**
 * Fetch a target by ID, strictly verifying ownership.
 *
 * @param {string} userId
 * @param {string} targetId
 * @returns {Promise<object>}
 */
export async function getTargetById(userId, targetId) {
  const target = await Target.findOne({ _id: targetId, owner: userId });
  if (!target) {
    throw new NotFoundError('Target not found or access unauthorized.');
  }
  return target.toJSON();
}

/**
 * Update an existing target, re-verifying SSRF if baseUrl is updated.
 *
 * @param {string} userId
 * @param {string} targetId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateTarget(userId, targetId, updates) {
  const target = await Target.findOne({ _id: targetId, owner: userId });
  if (!target) {
    throw new NotFoundError('Target not found or access unauthorized.');
  }

  if (updates.baseUrl && updates.baseUrl !== target.baseUrl) {
    const { normalizedUrl } = await validateTargetUrl(updates.baseUrl);
    target.baseUrl = normalizedUrl;
  }

  if (updates.name !== undefined) target.name = updates.name.trim();
  if (updates.description !== undefined) target.description = updates.description.trim();
  if (updates.defaultHeaders !== undefined) target.defaultHeaders = updates.defaultHeaders;

  await target.save();
  return target.toJSON();
}

/**
 * Delete a target owned by the user.
 *
 * @param {string} userId
 * @param {string} targetId
 * @returns {Promise<{ id: string, deleted: boolean }>}
 */
export async function deleteTarget(userId, targetId) {
  const target = await Target.findOneAndDelete({ _id: targetId, owner: userId });
  if (!target) {
    throw new NotFoundError('Target not found or access unauthorized.');
  }
  return { id: targetId, deleted: true };
}

/**
 * Perform a controlled, timed health probe to the target API.
 *
 * @param {string} userId
 * @param {string} targetId
 * @returns {Promise<object>}
 */
export async function probeTargetHealth(userId, targetId) {
  const target = await Target.findOne({ _id: targetId, owner: userId });
  if (!target) {
    throw new NotFoundError('Target not found or access unauthorized.');
  }

  // Pre-flight SSRF re-check
  await validateTargetUrl(target.baseUrl);

  // Prepare custom headers
  const probeHeaders = { 'User-Agent': 'APIForge-HealthProbe/1.0' };
  if (Array.isArray(target.defaultHeaders)) {
    target.defaultHeaders.forEach((h) => {
      if (h.key && h.value) probeHeaders[h.key] = h.value;
    });
  }

  const startTime = Date.now();
  let status = 'offline';
  let statusCode = null;
  let latencyMs = null;
  let message = null;

  try {
    const controller = new globalThis.AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second max probe

    const response = await globalThis.fetch(target.baseUrl, {
      method: 'GET',
      headers: probeHeaders,
      signal: controller.signal,
    });


    clearTimeout(timeoutId);
    latencyMs = Date.now() - startTime;
    statusCode = response.status;

    if (response.status >= 200 && response.status < 400) {
      status = 'online';
      message = `HTTP ${response.status} ${response.statusText || 'OK'}`;
    } else {
      status = 'degraded';
      message = `HTTP ${response.status} ${response.statusText || 'Warning'}`;
    }
  } catch (err) {
    latencyMs = Date.now() - startTime;
    status = 'offline';
    message = err.name === 'AbortError' ? 'Probe timed out after 5000ms' : err.message || 'Connection failed';
  }

  // Persist probe outcome
  target.lastHealthCheck = {
    status,
    statusCode,
    latencyMs,
    checkedAt: new Date(),
    message,
  };
  await target.save();

  return {
    targetId: target.id,
    baseUrl: target.baseUrl,
    ...target.lastHealthCheck.toJSON(),
  };
}

export default {
  listTargets,
  createTarget,
  getTargetById,
  updateTarget,
  deleteTarget,
  probeTargetHealth,
};
