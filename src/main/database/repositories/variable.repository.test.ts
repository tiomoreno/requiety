// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  insert: vi.fn(),
  update: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
};

vi.mock('../index', () => ({
  getDatabase: vi.fn(() => mockDb),
  dbOperation: vi.fn((op) => {
    return new Promise((resolve, reject) => {
      op((err: unknown, result: unknown) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }),
}));

vi.mock('../../services/security.service', () => ({
  SecurityService: {
    encrypt: vi.fn((value: string) => `encrypted:${value}`),
    decrypt: vi.fn((value: string) => value.replace(/^encrypted:/, '')),
  },
}));

import { createVariable, getVariablesByEnvironment, updateVariable } from './variable.repository';

describe('variable.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockImplementation((doc, cb) => cb(null, doc));
    mockDb.update.mockImplementation((query, update, opts, cb) => cb(null, 1));
    mockDb.find.mockImplementation((query, cb) => cb(null, []));
    mockDb.findOne.mockImplementation((query, cb) => cb(null, null));
  });

  it('encrypts secret values on create and returns decrypted data', async () => {
    const result = await createVariable({
      environmentId: 'env_1',
      key: 'API_KEY',
      value: 'secret',
      isSecret: true,
    });

    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        isSecret: true,
        value: 'enc:encrypted:secret',
      }),
      expect.any(Function)
    );
    expect(result.value).toBe('secret');
  });

  it('encrypts secret values on update and returns decrypted data', async () => {
    const existing = {
      _id: 'var_1',
      type: 'Variable',
      environmentId: 'env_1',
      key: 'API_KEY',
      value: 'enc:encrypted:old',
      isSecret: true,
      created: 1,
      modified: 1,
    };
    const updated = { ...existing, value: 'enc:encrypted:new' };

    mockDb.findOne
      .mockImplementationOnce((query, cb) => cb(null, existing))
      .mockImplementationOnce((query, cb) => cb(null, updated));

    const result = await updateVariable('var_1', { value: 'new' });

    expect(mockDb.update).toHaveBeenCalledWith(
      { _id: 'var_1' },
      { $set: expect.objectContaining({ value: 'enc:encrypted:new' }) },
      {},
      expect.any(Function)
    );
    expect(result.value).toBe('new');
  });

  it('decrypts secret values on read and migrates plaintext secrets', async () => {
    mockDb.find.mockImplementation((query, cb) =>
      cb(null, [
        {
          _id: 'var_1',
          type: 'Variable',
          environmentId: 'env_1',
          key: 'API_KEY',
          value: 'plain',
          isSecret: true,
          created: 1,
          modified: 1,
        },
        {
          _id: 'var_2',
          type: 'Variable',
          environmentId: 'env_1',
          key: 'TOKEN',
          value: 'enc:encrypted:sek',
          isSecret: true,
          created: 1,
          modified: 1,
        },
      ])
    );

    const result = await getVariablesByEnvironment('env_1');

    expect(mockDb.update).toHaveBeenCalledWith(
      { _id: 'var_1' },
      { $set: expect.objectContaining({ value: 'enc:encrypted:plain' }) },
      {},
      expect.any(Function)
    );
    expect(result[0].value).toBe('plain');
    expect(result[1].value).toBe('sek');
  });
});
