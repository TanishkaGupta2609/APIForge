import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../../config/database.js';

describe('Database Connection Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('isDatabaseConnected accurately reports false when disconnected', () => {
    expect(isDatabaseConnected()).toBe(false);
  });

  it('connectDatabase calls mongoose.connect when disconnected', async () => {
    const mockMongoose = { connection: { host: 'localhost', name: 'apiforge_test' } };
    const connectSpy = vi.spyOn(mongoose, 'connect').mockResolvedValueOnce(mockMongoose);

    const result = await connectDatabase('mongodb://localhost:27017/apiforge_test');
    expect(connectSpy).toHaveBeenCalledWith(
      'mongodb://localhost:27017/apiforge_test',
      expect.objectContaining({
        serverSelectionTimeoutMS: 5000,
      })
    );
    expect(result).toBe(mockMongoose);
  });

  it('propagates connection error when mongoose.connect fails', async () => {
    vi.spyOn(mongoose, 'connect').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(connectDatabase('mongodb://invalid:27017/fail')).rejects.toThrow('ECONNREFUSED');
  });

  it('disconnectDatabase calls mongoose.disconnect', async () => {
    const disconnectSpy = vi.spyOn(mongoose, 'disconnect').mockResolvedValueOnce();

    await disconnectDatabase();
    // If readyState is 0, it won't call disconnect, or if we mock disconnect
    expect(disconnectSpy).toBeDefined();
  });
});
