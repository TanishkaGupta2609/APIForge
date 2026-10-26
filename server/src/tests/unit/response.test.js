import { describe, it, expect, vi } from 'vitest';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/errors/AppError.js';

describe('Response Utility Helpers', () => {
  const createMockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it('sendSuccess formats standard success envelope', () => {
    const res = createMockRes();
    const data = { id: 'target_123', name: 'Production API' };

    sendSuccess(res, data, 'Target retrieved', 200);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data,
      message: 'Target retrieved',
    });
  });

  it('sendError formats standard error envelope from AppError', () => {
    const res = createMockRes();
    const error = new ValidationError('Invalid request body', [{ field: 'url', message: 'Required' }]);

    sendError(res, error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: [{ field: 'url', message: 'Required' }],
        }),
      })
    );
  });

  it('sendError handles standard Error with status 500 fallback', () => {
    const res = createMockRes();
    const error = new Error('Database connection failed');

    sendError(res, error);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        }),
      })
    );
  });
});
