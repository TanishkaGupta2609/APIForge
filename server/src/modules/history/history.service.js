import TestRun, { TEST_RUN_STATUS } from '../tests/testRun.model.js';
import Target from '../targets/target.model.js';
import { TEST_CONSTRAINTS } from '../tests/test.validation.js';
import { sanitizeTestRun } from '../tests/test.service.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../shared/errors/AppError.js';

/**
 * Escapes characters with special meaning in regular expressions
 * to protect against ReDoS and regex injection.
 *
 * @param {string} text - User input string
 * @returns {string} Escaped string
 */
export function escapeRegex(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Fetches paginated test execution history with multi-field search and filters.
 *
 * @param {string} userId - Authenticated user ID
 * @param {object} options - Query filters and pagination options
 * @returns {Promise<{ testRuns: Array<object>, pagination: object, filters: object }>}
 */
export async function getTestHistory(
  userId,
  {
    page = 1,
    limit = 10,
    status = 'all',
    targetId,
    search,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}
) {
  // 1. Base query strictly scoped to authenticated user (Tenant Isolation)
  const query = { owner: userId };

  // 2. Status filter
  if (status && status !== 'all') {
    query.status = status;
  }

  // 3. Target filter
  if (targetId) {
    query.target = targetId;
  }

  // 4. Safe text search across name, target snapshot name, and endpoint
  if (search && search.trim().length > 0) {
    const safeRegex = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [
      { name: { $regex: safeRegex } },
      { 'configuration.targetSnapshot.name': { $regex: safeRegex } },
      { 'configuration.endpoint': { $regex: safeRegex } },
    ];
  }

  // 5. Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  // 6. Sort mapping
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortFieldMap = {
    createdAt: { createdAt: sortDirection },
    name: { name: sortDirection },
    duration: { 'configuration.duration': sortDirection },
    vus: { 'configuration.vus': sortDirection },
  };
  const sortCriteria = sortFieldMap[sortBy] || { createdAt: -1 };

  // 7. Execute count and paginated query
  const total = await TestRun.countDocuments(query);
  const totalPages = Math.ceil(total / limit) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  const testRuns = await TestRun.find(query)
    .sort(sortCriteria)
    .skip((safePage - 1) * limit)
    .limit(limit)
    .populate('target', 'name baseUrl');

  return {
    testRuns: testRuns.map((r) => sanitizeTestRun(r.toJSON())),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
    filters: {
      status,
      targetId: targetId || null,
      search: search || '',
      startDate: startDate || null,
      endDate: endDate || null,
      sortBy,
      sortOrder,
    },
  };
}

/**
 * Safely duplicates an existing test run configuration and queues a new run.
 * Re-validates target existence, accessibility, and active concurrency limits.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} testRunId - ID of the original test run to rerun
 * @returns {Promise<object>} Created TestRun in QUEUED status
 */
export async function rerunTest(userId, testRunId) {
  // 1. Fetch original test run and verify ownership
  const originalRun = await TestRun.findById(testRunId);
  if (!originalRun) {
    throw new NotFoundError('Test run not found.');
  }

  if (originalRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to rerun this test.');
  }

  // 2. Verify target still exists and is accessible to user
  const target = await Target.findById(originalRun.target);
  if (!target || target.owner.toString() !== userId.toString()) {
    throw new NotFoundError(
      'The target API associated with this test run no longer exists or is no longer accessible.'
    );
  }

  // 3. Enforce concurrency limits
  const activeCount = await TestRun.countDocuments({
    owner: userId,
    status: { $in: [TEST_RUN_STATUS.QUEUED, TEST_RUN_STATUS.RUNNING] },
  });

  if (activeCount >= TEST_CONSTRAINTS.MAX_CONCURRENT_RUNS_PER_USER) {
    throw new ConflictError(
      `Concurrency limit reached: You currently have ${activeCount} active test run(s). Maximum allowed is ${TEST_CONSTRAINTS.MAX_CONCURRENT_RUNS_PER_USER}. Wait for active runs to complete or cancel them.`
    );
  }

  // 4. Create fresh target snapshot and cloned configuration
  const targetSnapshot = {
    name: target.name,
    baseUrl: target.baseUrl,
  };

  const rerunName = originalRun.name.endsWith('(Rerun)')
    ? originalRun.name
    : `${originalRun.name} (Rerun)`;

  const newTestRun = await TestRun.create({
    owner: userId,
    target: target._id,
    name: rerunName,
    configuration: {
      targetSnapshot,
      method: originalRun.configuration.method,
      endpoint: originalRun.configuration.endpoint,
      headers: originalRun.configuration.headers || {},
      body: originalRun.configuration.body || null,
      vus: originalRun.configuration.vus,
      duration: originalRun.configuration.duration,
      rampUpDuration: originalRun.configuration.rampUpDuration || 0,
      thresholds: originalRun.configuration.thresholds || {},
      workloadProfile: originalRun.configuration.workloadProfile || 'fixed',
      stages: originalRun.configuration.stages || undefined,
    },
    status: TEST_RUN_STATUS.QUEUED,
    progress: {
      percent: 0,
      stage: 'Queued',
      message: 'Rerun scheduled and awaiting worker allocation',
    },
  });

  return newTestRun.toJSON();
}

/**
 * Deletes a test run from history, ensuring user ownership and preventing
 * deletion of actively executing tests.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} testRunId - Test run ID
 * @returns {Promise<{ id: string, deleted: boolean }>}
 */
export async function deleteHistoryItem(userId, testRunId) {
  const testRun = await TestRun.findById(testRunId);
  if (!testRun) {
    throw new NotFoundError('Test run not found.');
  }

  if (testRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this test run.');
  }

  if (testRun.status === TEST_RUN_STATUS.RUNNING) {
    throw new BadRequestError('Cannot delete an actively running test. Cancel it first.');
  }

  await TestRun.findByIdAndDelete(testRunId);
  return { id: testRunId, deleted: true };
}

/**
 * Aggregates high-level history overview statistics for the user.
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<object>} Status counts and totals
 */
export async function getHistoryStats(userId) {
  const [total, completed, failed, cancelled, running, queued] = await Promise.all([
    TestRun.countDocuments({ owner: userId }),
    TestRun.countDocuments({ owner: userId, status: TEST_RUN_STATUS.COMPLETED }),
    TestRun.countDocuments({ owner: userId, status: TEST_RUN_STATUS.FAILED }),
    TestRun.countDocuments({ owner: userId, status: TEST_RUN_STATUS.CANCELLED }),
    TestRun.countDocuments({ owner: userId, status: TEST_RUN_STATUS.RUNNING }),
    TestRun.countDocuments({ owner: userId, status: TEST_RUN_STATUS.QUEUED }),
  ]);

  return {
    total,
    completed,
    failed,
    cancelled,
    running,
    queued,
  };
}

