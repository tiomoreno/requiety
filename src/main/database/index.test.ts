// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

// Mocks
const mockEnsureIndex = vi.fn((opts, cb) => cb(null));

vi.mock('@seald-io/nedb', () => {
  return {
    default: vi.fn(() => ({
      ensureIndex: mockEnsureIndex,
      loadDatabase: vi.fn(),
    }))
  };
});

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/mock-user-data')
  }
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
  }
}));

// Import subject
import { initializeDatabase, getDatabase, dbOperation } from './index';
import Datastore from '@seald-io/nedb';
import fs from 'fs';

describe('Database', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeDatabase', () => {
    it('should create data directory if not exists', async () => {
      await initializeDatabase();
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('data')), 
        { recursive: true }
      );
    });

    it('should initialize all datastores', async () => {
      await initializeDatabase();
      // 7 datastores: workspace, folder, request, response, environment, variable, settings
      expect(Datastore).toHaveBeenCalledTimes(7);
      
      // Verify filenames
      const calls = (Datastore as any).mock.calls;
      const filenames = calls.map((c: any) => c[0].filename);
      console.log('Filenames:', filenames); // Debug
      expect(filenames).toEqual(expect.arrayContaining([
        expect.stringContaining('workspaces.db'),
        expect.stringContaining('requests.db')
      ]));
    });

    it('should create indexes', async () => {
      await initializeDatabase();
      // 5 indexes: folder.parentId, request.parentId, response.requestId, env.workspaceId, var.environmentId
      expect(mockEnsureIndex).toHaveBeenCalledTimes(5);
      
      const calls = mockEnsureIndex.mock.calls;
      const fields = calls.map((c: any) => c[0].fieldName);
      expect(fields).toContain('parentId');
      expect(fields).toContain('requestId');
    });
  });

  describe('getDatabase', () => {
    // initialize first to set the vars
    beforeEach(async () => {
        await initializeDatabase();
    });

    it('should return correct datastore for type', () => {
      const db = getDatabase('Request');
      expect(db).toBeDefined();
      // Since we mocked Datastore constructor to return an object, we check that object
      expect(db.ensureIndex).toBeDefined();
    });

    it('should throw error for unknown type', () => {
      expect(() => getDatabase('Unknown' as any)).toThrow('Unknown document type');
    });
  });

  describe('dbOperation', () => {
      it('should promisify success callback', async () => {
          const mockOp = (cb: any) => cb(null, 'success');
          const result = await dbOperation(mockOp);
          expect(result).toBe('success');
      });

      it('should reject on error callback', async () => {
          const mockOp = (cb: any) => cb(new Error('fail'), null);
          await expect(dbOperation(mockOp)).rejects.toThrow('fail');
      });
  });
});
