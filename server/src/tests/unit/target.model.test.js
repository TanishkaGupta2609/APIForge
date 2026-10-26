import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Target from '../../modules/targets/target.model.js';

describe('Target Model & Schema Validation', () => {
  const dummyOwnerId = new mongoose.Types.ObjectId();

  it('fails validation when required fields are missing', () => {
    const target = new Target({});
    const error = target.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.baseUrl).toBeDefined();
    expect(error.errors.owner).toBeDefined();
  });

  it('sets appropriate default values for optional fields', () => {
    const target = new Target({
      owner: dummyOwnerId,
      name: 'Production Gateway',
      baseUrl: 'https://api.example.com',
    });

    expect(target.description).toBe('');
    expect(target.defaultHeaders).toEqual([]);
    expect(target.lastHealthCheck.status).toBe('unknown');
    expect(target.lastHealthCheck.statusCode).toBeNull();
  });

  it('preserves header secret flags for masking', () => {
    const target = new Target({
      owner: dummyOwnerId,
      name: 'Authenticated Microservice',
      baseUrl: 'https://service.internal.test',
      defaultHeaders: [
        { key: 'Content-Type', value: 'application/json', isSecret: false },
        { key: 'Authorization', value: 'Bearer super-secret-token', isSecret: true },
      ],
    });

    expect(target.defaultHeaders.length).toBe(2);
    expect(target.defaultHeaders[1].isSecret).toBe(true);
  });

  it('toJSON transform produces clean output with id property and no _id/__v', () => {
    const target = new Target({
      owner: dummyOwnerId,
      name: 'Test Endpoint',
      baseUrl: 'https://api.example.com',
    });

    const json = target.toJSON();
    expect(json.id).toBe(target._id.toString());
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
  });
});
