import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeRegex,
  getTestHistory,
  rerunTest,
  deleteHistoryItem,
  getHistoryStats,
} from '../../modules/history/history.service.js';
import TestRun, { TEST_RUN_STATUS } from '../../modules/tests/testRun.model.js';
import Target from '../../modules/targets/target.model.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../shared/errors/AppError.js';

vi.mock('../../modules/tests/testRun.model.js');
vi.mock('../../modules/targets/target.model.js');

describe('History Service Unit Suite', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockTargetId = '507f1f77bcf86cd799439022';
  const mockRunId = '507f1f77bcf86cd799439033';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('escapeRegex Utility', () => {
    it('escapes regex metacharacters safely to prevent ReDoS', () => {
      const malicious = '.*+?^${}()|[]\\';
      const escaped = escapeRegex(malicious);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('returns empty string for null or non-string inputs', () => {
      expect(escapeRegex(null)).toBe('');
      expect(escapeRegex(undefined)).toBe('');
      expect(escapeRegex(123)).toBe('');
    });
  });

  describe('getTestHistory()', () => {
    it('returns paginated test runs with correct page calculation and metadata', async () => {
      const mockRuns = [
        {
          _id: mockRunId,
          name: 'Baseline Load Test',
          status: 'completed',
          toJSON: () => ({ id: mockRunId, name: 'Baseline Load Test' }),
        },
      ];

      TestRun.countDocuments = vi.fn().mockResolvedValue(15);
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockRuns),
      };
      TestRun.find = vi.fn().mockReturnValue(mockQueryChain);

      const result = await getTestHistory(mockUserId, { page: 2, limit: 10 });

      expect(TestRun.countDocuments).toHaveBeenCalledWith({ owner: mockUserId });
      expect(mockQueryChain.skip).toHaveBeenCalledWith(10);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 15,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      });
      expect(result.testRuns).toHaveLength(1);
    });

    it('applies status, targetId, date, and search filters correctly', async () => {
      TestRun.countDocuments = vi.fn().mockResolvedValue(0);
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue([]),
      };
      TestRun.find = vi.fn().mockReturnValue(mockQueryChain);

      await getTestHistory(mockUserId, {
        status: 'completed',
        targetId: mockTargetId,
        search: 'Demo [API]',
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-11-07T00:00:00.000Z',
      });

      expect(TestRun.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: mockUserId,
          status: 'completed',
          target: mockTargetId,
          $or: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(Object) }),
          ]),
          createdAt: {
            $gte: new Date('2026-11-01T00:00:00.000Z'),
            $lte: new Date('2026-11-07T00:00:00.000Z'),
          },
        })
      );
    });
  });

  describe('rerunTest()', () => {
    it('successfully clones configuration and queues a new test run', async () => {
      const mockOriginalRun = {
        _id: mockRunId,
        owner: mockUserId,
        target: mockTargetId,
        name: 'Stress Test',
        configuration: {
          method: 'GET',
          endpoint: '/api/demo/ping',
          headers: { 'X-Custom': 'Value' },
          body: null,
          vus: 20,
          duration: 30,
          rampUpDuration: 5,
          thresholds: { p95: 300 },
        },
      };

      const mockTarget = {
        _id: mockTargetId,
        owner: mockUserId,
        name: 'Demo API',
        baseUrl: 'http://localhost:5001',
      };

      TestRun.findById = vi.fn().mockResolvedValue(mockOriginalRun);
      Target.findById = vi.fn().mockResolvedValue(mockTarget);
      TestRun.countDocuments = vi.fn().mockResolvedValue(0); // 0 active runs

      const mockNewRun = {
        _id: '507f1f77bcf86cd799439044',
        name: 'Stress Test (Rerun)',
        status: TEST_RUN_STATUS.QUEUED,
        toJSON: () => ({ id: '507f1f77bcf86cd799439044', name: 'Stress Test (Rerun)', status: 'queued' }),
      };
      TestRun.create = vi.fn().mockResolvedValue(mockNewRun);

      const result = await rerunTest(mockUserId, mockRunId);

      expect(TestRun.findById).toHaveBeenCalledWith(mockRunId);
      expect(Target.findById).toHaveBeenCalledWith(mockTargetId);
      expect(TestRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: mockUserId,
          target: mockTargetId,
          name: 'Stress Test (Rerun)',
          status: TEST_RUN_STATUS.QUEUED,
          configuration: expect.objectContaining({
            vus: 20,
            duration: 30,
            method: 'GET',
            endpoint: '/api/demo/ping',
          }),
        })
      );
      expect(result.status).toBe('queued');
    });

    it('rejects rerun attempt if user does not own original test run', async () => {
      const mockOriginalRun = {
        _id: mockRunId,
        owner: 'other-user-999',
        target: mockTargetId,
      };

      TestRun.findById = vi.fn().mockResolvedValue(mockOriginalRun);

      await expect(rerunTest(mockUserId, mockRunId)).rejects.toThrow(ForbiddenError);
    });

    it('rejects rerun attempt if target was deleted or is inaccessible', async () => {
      const mockOriginalRun = {
        _id: mockRunId,
        owner: mockUserId,
        target: mockTargetId,
      };

      TestRun.findById = vi.fn().mockResolvedValue(mockOriginalRun);
      Target.findById = vi.fn().mockResolvedValue(null); // Deleted

      await expect(rerunTest(mockUserId, mockRunId)).rejects.toThrow(NotFoundError);
    });

    it('rejects rerun attempt if user has reached max concurrent active runs', async () => {
      const mockOriginalRun = {
        _id: mockRunId,
        owner: mockUserId,
        target: mockTargetId,
      };

      const mockTarget = {
        _id: mockTargetId,
        owner: mockUserId,
      };

      TestRun.findById = vi.fn().mockResolvedValue(mockOriginalRun);
      Target.findById = vi.fn().mockResolvedValue(mockTarget);
      TestRun.countDocuments = vi.fn().mockResolvedValue(2); // At limit

      await expect(rerunTest(mockUserId, mockRunId)).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteHistoryItem()', () => {
    it('deletes completed test run from history', async () => {
      const mockRun = {
        _id: mockRunId,
        owner: mockUserId,
        status: TEST_RUN_STATUS.COMPLETED,
      };

      TestRun.findById = vi.fn().mockResolvedValue(mockRun);
      TestRun.findByIdAndDelete = vi.fn().mockResolvedValue(true);

      const result = await deleteHistoryItem(mockUserId, mockRunId);

      expect(TestRun.findByIdAndDelete).toHaveBeenCalledWith(mockRunId);
      expect(result).toEqual({ id: mockRunId, deleted: true });
    });

    it('prevents deletion of actively running tests', async () => {
      const mockRun = {
        _id: mockRunId,
        owner: mockUserId,
        status: TEST_RUN_STATUS.RUNNING,
      };

      TestRun.findById = vi.fn().mockResolvedValue(mockRun);

      await expect(deleteHistoryItem(mockUserId, mockRunId)).rejects.toThrow(BadRequestError);
    });

    it('rejects deletion if run belongs to another user', async () => {
      const mockRun = {
        _id: mockRunId,
        owner: 'foreign-user-id',
        status: TEST_RUN_STATUS.COMPLETED,
      };

      TestRun.findById = vi.fn().mockResolvedValue(mockRun);

      await expect(deleteHistoryItem(mockUserId, mockRunId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getHistoryStats()', () => {
    it('aggregates total, completed, failed, cancelled, and active counts', async () => {
      TestRun.countDocuments = vi
        .fn()
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(15) // completed
        .mockResolvedValueOnce(3)  // failed
        .mockResolvedValueOnce(2)  // cancelled
        .mockResolvedValueOnce(0)  // running
        .mockResolvedValueOnce(0); // queued

      const stats = await getHistoryStats(mockUserId);

      expect(stats).toEqual({
        total: 20,
        completed: 15,
        failed: 3,
        cancelled: 2,
        running: 0,
        queued: 0,
      });
    });
  });
});

