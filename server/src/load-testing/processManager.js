import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import env from '../config/env.js';
import { ConflictError, ExecutionError } from '../shared/errors/AppError.js';

const execAsync = promisify(exec);

// In-memory registry of active k6 worker processes
// Map<testRunId, { childProcess, pid, startTime, timeoutId, cancelled, timedOut, stdoutChunks, stderrChunks }
const activeRuns = new Map();

// Maximum diagnostic buffer size per process to prevent memory blowup (500KB)
const MAX_LOG_BUFFER_BYTES = 500 * 1024;

/**
 * Redacts common sensitive patterns (Bearer tokens, passwords, secrets) from console output.
 *
 * @param {string} text - Raw log string
 * @returns {string} Sanitized log string
 */
export function sanitizeLogOutput(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]')
    .replace(/(["']?(?:password|token|secret|apiKey)["']?\s*[:=]\s*["']?)[^"',\s]+(["']?)/gi, '$1[REDACTED]$2');
}

/**
 * Terminates a process tree across operating systems (Windows and POSIX).
 *
 * @param {number} pid - Process ID
 * @param {string} [signal='SIGTERM'] - Signal on POSIX systems
 * @returns {Promise<void>}
 */
export async function killProcessTree(pid, signal = 'SIGTERM') {
  if (!pid) return;

  if (process.platform === 'win32') {
    try {
      await execAsync(`taskkill /pid ${pid} /T /F`);
    } catch {
      // Process may already have terminated
    }
  } else {
    try {
      process.kill(-pid, signal);
    } catch {
      try {
        process.kill(pid, signal);
      } catch {
        // Process may already have terminated
      }
    }
  }
}

/**
 * Checks whether a k6 process is currently running for a given test run.
 *
 * @param {string} testRunId - Test run ID
 * @returns {boolean}
 */
export function isProcessRunning(testRunId) {
  return activeRuns.has(String(testRunId));
}

/**
 * Returns the count of currently active k6 processes.
 *
 * @returns {number}
 */
export function getActiveProcessCount() {
  return activeRuns.size;
}

/**
 * Cancels and terminates an active k6 process for a test run.
 *
 * @param {string} testRunId - Test run ID
 * @param {string} [reason='Cancelled by user'] - Reason for cancellation
 * @returns {Promise<boolean>} True if process was found and cancelled
 */
export async function cancelProcess(testRunId, reason = 'Cancelled by user') {
  const runKey = String(testRunId);
  const runInfo = activeRuns.get(runKey);

  if (!runInfo) {
    return false;
  }

  runInfo.cancelled = true;
  runInfo.cancelReason = reason;

  if (runInfo.timeoutId) {
    clearTimeout(runInfo.timeoutId);
    runInfo.timeoutId = null;
  }

  if (runInfo.childProcess && runInfo.childProcess.pid) {
    await killProcessTree(runInfo.childProcess.pid, 'SIGTERM');
  }

  activeRuns.delete(runKey);
  return true;
}

/**
 * Spawns a controlled k6 child process with argument array and security constraints.
 *
 * Guarantees:
 * - Uses spawn() with argument array, never concatenating untrusted inputs into shell commands.
 * - Does not block the Express event loop.
 * - Caps concurrency per environment settings.
 * - Enforces hard timeouts.
 * - Captures diagnostic stdout/stderr with buffer capping and secret redaction.
 *
 * @param {object} options
 * @param {string} options.testRunId - Test run ID
 * @param {string} options.k6BinPath - Path to k6 executable
 * @param {string} options.scriptPath - Path to test script file
 * @param {string} options.summaryPath - Path where k6 should export summary JSON
 * @param {number} [options.timeoutMs] - Maximum execution time before hard kill
 * @returns {Promise<{ exitCode: number|null, signal: string|null, stdout: string, stderr: string, cancelled: boolean, timedOut: boolean }>}
 */
export function spawnK6Process({
  testRunId,
  k6BinPath,
  scriptPath,
  summaryPath,
  timeoutMs = 60000,
}) {
  return new Promise((resolve, reject) => {
    const runKey = String(testRunId);

    // 1. Enforce global concurrency limit
    if (activeRuns.size >= env.MAX_CONCURRENT_TESTS) {
      return reject(
        new ConflictError(
          `System capacity reached: ${activeRuns.size} test(s) are currently running. Server limit is ${env.MAX_CONCURRENT_TESTS}.`
        )
      );
    }

    if (activeRuns.has(runKey)) {
      return reject(new ConflictError(`A process is already running for test run '${testRunId}'.`));
    }

    // 2. Safe arguments array (no shell expansion or string concat)
    const args = [
      'run',
      `--summary-export=${summaryPath}`,
      '--no-color',
      scriptPath,
    ];

    let childProcess;
    try {
      childProcess = spawn(k6BinPath, args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          // Prevent k6 interactive prompts
          K6_NO_USAGE_REPORT: 'true',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      return reject(new ExecutionError(`Failed to spawn k6 process: ${err.message}`));
    }

    const runInfo = {
      testRunId: runKey,
      childProcess,
      pid: childProcess.pid,
      startTime: Date.now(),
      cancelled: false,
      timedOut: false,
      cancelReason: null,
      timeoutId: null,
      stdoutBuffer: '',
      stderrBuffer: '',
    };

    activeRuns.set(runKey, runInfo);

    // 3. Enforce execution timeout
    runInfo.timeoutId = setTimeout(async () => {
      runInfo.timedOut = true;
      console.warn(`[ProcessManager] Test run '${runKey}' exceeded timeout of ${timeoutMs}ms. Terminating process tree.`);
      await killProcessTree(childProcess.pid, 'SIGKILL');
    }, timeoutMs);

    // 4. Capture diagnostic streams
    childProcess.stdout.on('data', (chunk) => {
      if (runInfo.stdoutBuffer.length < MAX_LOG_BUFFER_BYTES) {
        runInfo.stdoutBuffer += chunk.toString();
      }
    });

    childProcess.stderr.on('data', (chunk) => {
      if (runInfo.stderrBuffer.length < MAX_LOG_BUFFER_BYTES) {
        runInfo.stderrBuffer += chunk.toString();
      }
    });

    childProcess.on('error', (err) => {
      if (runInfo.timeoutId) clearTimeout(runInfo.timeoutId);
      activeRuns.delete(runKey);
      reject(new ExecutionError(`k6 process encountered an OS error: ${err.message}`));
    });

    childProcess.on('close', (code, signal) => {
      if (runInfo.timeoutId) clearTimeout(runInfo.timeoutId);
      activeRuns.delete(runKey);

      resolve({
        exitCode: code,
        signal,
        stdout: sanitizeLogOutput(runInfo.stdoutBuffer),
        stderr: sanitizeLogOutput(runInfo.stderrBuffer),
        cancelled: runInfo.cancelled,
        timedOut: runInfo.timedOut,
      });
    });
  });
}

/**
 * Terminates all active child processes (called during graceful shutdown).
 *
 * @returns {Promise<void>}
 */
export async function cleanupAllProcesses() {
  const keys = Array.from(activeRuns.keys());
  for (const key of keys) {
    try {
      await cancelProcess(key, 'Server shutdown');
    } catch (err) {
      console.error(`Error terminating process for test run ${key}:`, err);
    }
  }
}

// Register process exit listeners to prevent orphaned k6 processes
process.on('SIGINT', async () => {
  await cleanupAllProcesses();
});

process.on('SIGTERM', async () => {
  await cleanupAllProcesses();
});

export default {
  isProcessRunning,
  getActiveProcessCount,
  spawnK6Process,
  cancelProcess,
  cleanupAllProcesses,
  sanitizeLogOutput,
};

