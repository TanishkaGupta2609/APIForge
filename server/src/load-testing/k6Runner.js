import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TestRun, { TEST_RUN_STATUS } from '../modules/tests/testRun.model.js';
import { checkK6Installed } from './k6Detector.js';
import { buildK6Script } from './scriptBuilder.js';
import { parseK6Summary } from './summaryParser.js';
import { evaluateThresholds } from '../modules/results/results.service.js';
import processManager from './processManager.js';
import { BadRequestError, NotFoundError } from '../shared/errors/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for temporary test run files
const RUNS_BASE_DIR = path.resolve(__dirname, '../../.runs');

/**
 * Ensures the temporary runs directory exists.
 */
function ensureRunsDirectory() {
  if (!fs.existsSync(RUNS_BASE_DIR)) {
    fs.mkdirSync(RUNS_BASE_DIR, { recursive: true });
  }
}

/**
 * Safely removes a directory and its contents.
 *
 * @param {string} dirPath - Absolute path to directory
 */
function cleanupRunDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`[k6Runner] Failed to clean up run directory '${dirPath}':`, err.message);
  }
}

/**
 * Orchestrates full execution of a TestRun with real k6 engine.
 *
 * Steps:
 * 1. Validate test run state and verify k6 installation.
 * 2. Generate secure k6 script.
 * 3. Transition test run to RUNNING in database.
 * 4. Launch k6 process and update progress in real time.
 * 5. Collect summary, normalize metrics, and transition to COMPLETED or FAILED.
 * 6. Clean up temporary files.
 *
 * @param {string} testRunId - TestRun ObjectId string
 * @returns {Promise<object>} Final updated TestRun document
 */
export async function executeTestRun(testRunId) {
  const testRun = await TestRun.findById(testRunId);
  if (!testRun) {
    throw new NotFoundError(`Test run '${testRunId}' not found.`);
  }

  if (testRun.status !== TEST_RUN_STATUS.QUEUED) {
    throw new BadRequestError(
      `Cannot execute test run: Status is '${testRun.status}'. Only '${TEST_RUN_STATUS.QUEUED}' tests can be started.`
    );
  }

  // 1. Verify k6 installation
  const k6Check = await checkK6Installed();
  if (!k6Check.available) {
    testRun.transitionTo(TEST_RUN_STATUS.FAILED, {
      category: 'INTERNAL_ERROR',
      message: `k6 engine is not available on this server: ${k6Check.error}`,
      isSimulated: false,
    });
    await testRun.save();
    return testRun.toJSON();
  }

  // 2. Prepare temporary directory and files
  ensureRunsDirectory();
  const runDir = path.join(RUNS_BASE_DIR, String(testRun._id));
  fs.mkdirSync(runDir, { recursive: true });

  const scriptPath = path.join(runDir, 'test_script.js');
  const summaryPath = path.join(runDir, 'summary.json');

  try {
    const scriptContent = buildK6Script(testRun.configuration);
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  } catch (err) {
    cleanupRunDirectory(runDir);
    testRun.transitionTo(TEST_RUN_STATUS.FAILED, {
      category: 'EXECUTION_ERROR',
      message: `Failed to compile k6 test script: ${err.message}`,
      isSimulated: false,
    });
    await testRun.save();
    return testRun.toJSON();
  }

  // 3. Transition state: QUEUED -> RUNNING
  testRun.transitionTo(TEST_RUN_STATUS.RUNNING, {
    percent: 5,
    stage: 'Initializing k6 Worker',
    message: 'Worker process allocated, starting workload execution',
    isSimulated: false,
  });
  await testRun.save();

  const totalDurationSec = Number(testRun.configuration.duration || 10);
  const startTime = Date.now();

  // 4. Start periodic progress updater
  const progressInterval = setInterval(async () => {
    try {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const percent = Math.min(95, Math.max(10, Math.round((elapsedSec / totalDurationSec) * 100)));

      await TestRun.updateOne(
        { _id: testRun._id, status: TEST_RUN_STATUS.RUNNING },
        {
          $set: {
            'progress.percent': percent,
            'progress.stage': 'Executing Load Test',
            'progress.message': `Workload active (${Math.round(elapsedSec)}s / ${totalDurationSec}s elapsed)`,
          },
        }
      );
    } catch {
      // Ignore background progress update errors
    }
  }, 1500);

  // 5. Execute k6 via ProcessManager
  // Timeout is configured duration + 20s grace period for summary output
  const timeoutMs = (totalDurationSec + 20) * 1000;

  let processResult;
  try {
    processResult = await processManager.spawnK6Process({
      testRunId: String(testRun._id),
      k6BinPath: k6Check.path,
      scriptPath,
      summaryPath,
      timeoutMs,
    });
  } catch (err) {
    clearInterval(progressInterval);
    cleanupRunDirectory(runDir);

    const freshDoc = await TestRun.findById(testRun._id);
    if (freshDoc && freshDoc.status === TEST_RUN_STATUS.RUNNING) {
      freshDoc.transitionTo(TEST_RUN_STATUS.FAILED, {
        category: 'EXECUTION_ERROR',
        message: err.message || 'Worker execution failed',
        isSimulated: false,
      });
      await freshDoc.save();
      return freshDoc.toJSON();
    }
    return freshDoc ? freshDoc.toJSON() : null;
  }

  clearInterval(progressInterval);

  // 6. Refetch fresh document to honor any user cancellation that happened during execution
  const currentDoc = await TestRun.findById(testRun._id);
  if (!currentDoc) {
    cleanupRunDirectory(runDir);
    return null;
  }

  // If user cancelled the run while k6 was running, preserve cancelled status
  if (currentDoc.status === TEST_RUN_STATUS.CANCELLED || processResult.cancelled) {
    cleanupRunDirectory(runDir);
    if (currentDoc.status !== TEST_RUN_STATUS.CANCELLED) {
      currentDoc.transitionTo(TEST_RUN_STATUS.CANCELLED, {
        reason: 'Test run cancelled by user request',
      });
      await currentDoc.save();
    }
    return currentDoc.toJSON();
  }

  // If process timed out
  if (processResult.timedOut) {
    cleanupRunDirectory(runDir);
    currentDoc.transitionTo(TEST_RUN_STATUS.FAILED, {
      category: 'TIMEOUT',
      message: `Test exceeded safety timeout threshold (${totalDurationSec + 20}s). Execution halted.`,
      isSimulated: false,
    });
    await currentDoc.save();
    return currentDoc.toJSON();
  }

  // 7. Parse summary and record final results
  try {
    if (fs.existsSync(summaryPath)) {
      const summaryContent = fs.readFileSync(summaryPath, 'utf8');
      const normalizedMetrics = parseK6Summary(summaryContent);

      // If 0 requests occurred and k6 exited non-zero or with connection errors
      if (normalizedMetrics.totalRequests === 0 || normalizedMetrics.networkErrors > 0 && normalizedMetrics.successfulRequests === 0) {
        currentDoc.transitionTo(TEST_RUN_STATUS.FAILED, {
          category: 'TARGET_UNREACHABLE',
          message: 'Target API connection failed: All requests resulted in connection or network errors.',
          isSimulated: false,
        });
        currentDoc.metrics = normalizedMetrics;
      } else {
        // Evaluate SLA thresholds if configured
        const thresholdEval = evaluateThresholds(
          currentDoc.configuration?.thresholds,
          normalizedMetrics
        );
        if (thresholdEval.hasThresholds) {
          normalizedMetrics.thresholdsPassed = thresholdEval.allPassed;
          currentDoc.thresholdEvaluation = thresholdEval;
        }

        // Successful execution with real metrics
        currentDoc.transitionTo(TEST_RUN_STATUS.COMPLETED, {
          metrics: normalizedMetrics,
          isSimulated: false,
        });
      }
    } else {
      // Summary file missing - process failed before summary generation
      currentDoc.transitionTo(TEST_RUN_STATUS.FAILED, {
        category: 'EXECUTION_ERROR',
        message: processResult.stderr || 'k6 worker process terminated without generating summary metrics.',
        isSimulated: false,
      });
    }
  } catch (parseErr) {
    currentDoc.transitionTo(TEST_RUN_STATUS.FAILED, {
      category: 'EXECUTION_ERROR',
      message: `Failed to parse k6 test results: ${parseErr.message}`,
      isSimulated: false,
    });
  } finally {
    cleanupRunDirectory(runDir);
  }

  await currentDoc.save();
  return currentDoc.toJSON();
}

/**
 * Triggers test execution in the background without blocking the HTTP request handler.
 *
 * @param {string} testRunId - TestRun ObjectId string
 */
export function startTestExecution(testRunId) {
  // Floating promise executed in background
  executeTestRun(testRunId).catch((err) => {
    console.error(`[k6Runner] Uncaught background error running test ${testRunId}:`, err);
  });
}

export default {
  executeTestRun,
  startTestExecution,
};

