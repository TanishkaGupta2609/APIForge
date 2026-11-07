import { describe, it, expect, beforeEach } from 'vitest';
import {
  findK6Binary,
  checkK6Installed,
  resetK6DetectorCache,
} from '../../load-testing/k6Detector.js';

describe('k6 Engine Binary Detector Suite', () => {
  beforeEach(() => {
    resetK6DetectorCache();
  });

  it('locates a valid k6 executable path', () => {
    const binPath = findK6Binary();
    expect(binPath).toBeDefined();
    expect(typeof binPath).toBe('string');
    expect(binPath.length).toBeGreaterThan(0);
  });

  it('successfully detects k6 installation and extracts version', async () => {
    const result = await checkK6Installed();

    expect(result).toHaveProperty('available');
    expect(result.available).toBe(true);
    expect(result.version).toMatch(/v?\d+\.\d+\.\d+/);
    expect(result.path).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('reuses cached detection result on subsequent calls', async () => {
    const firstCheck = await checkK6Installed();
    const secondCheck = await checkK6Installed();

    expect(secondCheck.available).toBe(firstCheck.available);
    expect(secondCheck.version).toBe(firstCheck.version);
    expect(secondCheck.path).toBe(firstCheck.path);
  });

  it('forces fresh detection when forceRefresh is true', async () => {
    const check = await checkK6Installed(true);
    expect(check.available).toBe(true);
    expect(check.version).toBeDefined();
  });
});

