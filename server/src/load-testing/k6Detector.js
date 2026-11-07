import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import env from '../config/env.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedBinaryPath = null;
let cachedVersion = null;

/**
 * Searches candidates to find a valid k6 executable binary.
 *
 * Candidate search order:
 * 1. env.K6_PATH (if configured and exists)
 * 2. Workspace local binaries (server/bin/k6.exe, bin/k6.exe, etc.)
 * 3. System PATH ('k6' or 'k6.exe')
 *
 * @returns {string} Path or command name to invoke k6
 */
export function findK6Binary() {
  if (cachedBinaryPath && fs.existsSync(cachedBinaryPath)) {
    return cachedBinaryPath;
  }

  const isWindows = process.platform === 'win32';
  const binName = isWindows ? 'k6.exe' : 'k6';

  const candidates = [];

  // 1. Explicitly configured path from environment
  if (env.K6_PATH && env.K6_PATH !== 'k6') {
    candidates.push(path.resolve(env.K6_PATH));
  }

  // 2. Local workspace candidates relative to current file
  candidates.push(
    path.resolve(__dirname, '../../bin', binName), // server/bin/k6.exe
    path.resolve(__dirname, '../../../bin', binName), // root bin/k6.exe
    path.resolve(process.cwd(), 'bin', binName), // cwd/bin/k6.exe
    path.resolve(process.cwd(), 'server/bin', binName)
  );

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        cachedBinaryPath = candidate;
        return candidate;
      }
    } catch {
      // Continue checking next candidate
    }
  }

  // 3. Fallback to global PATH
  return isWindows ? 'k6.exe' : 'k6';
}

/**
 * Checks whether k6 is installed and executable on the host system.
 *
 * @param {boolean} [forceRefresh=false] - Force re-detection bypassing cache
 * @returns {Promise<{ available: boolean, version: string|null, path: string|null, error: string|null }>}
 */
export async function checkK6Installed(forceRefresh = false) {
  if (!forceRefresh && cachedVersion && cachedBinaryPath) {
    return {
      available: true,
      version: cachedVersion,
      path: cachedBinaryPath,
      error: null,
    };
  }

  const bin = findK6Binary();

  try {
    const { stdout } = await execFileAsync(bin, ['version'], { timeout: 10000 });
    const output = stdout.trim();

    // Extract semver-like version string, e.g. "v2.3.0" or "v0.54.0"
    const match = output.match(/v\d+\.\d+\.\d+/);
    const version = match ? match[0] : output.split(' ')[1] || output;

    cachedVersion = version;
    cachedBinaryPath = bin;

    return {
      available: true,
      version,
      path: bin,
      error: null,
    };
  } catch (error) {
    return {
      available: false,
      version: null,
      path: bin,
      error: error.message || 'k6 executable not found or failed to execute',
    };
  }
}

/**
 * Clears the cached binary path and version (useful for tests).
 */
export function resetK6DetectorCache() {
  cachedBinaryPath = null;
  cachedVersion = null;
}

