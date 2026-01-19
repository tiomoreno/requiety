// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// Use vi.hoisted to create mock functions that can be used in vi.mock
const { mockEnsureIndex, mockExistsSync, mockMkdirSync, mockDatastoreInstances } = vi.hoisted(
  () => {
    const mockEnsureIndex = vi.fn((opts: any, cb: any) => cb(null));
    const mockExistsSync = vi.fn(() => false);
    const mockMkdirSync = vi.fn();
    const mockDatastoreInstances: any[] = [];
    return { mockEnsureIndex, mockExistsSync, mockMkdirSync, mockDatastoreInstances };
  }
);

// Create a mock class for Datastore
vi.mock('@seald-io/nedb', () => {
  return {
    default: class MockDatastore {
      filename: string;
      constructor(opts: any) {
        this.filename = opts.filename;
        mockDatastoreInstances.push(this);
      }
      ensureIndex(opts: any, cb: any) {
        return mockEnsureIndex(opts, cb);
      }
      loadDatabase() {}
    },
  };
});

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/mock-user-data'),
  },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
  },
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
}));

// Import subject after mocks
import { initializeDatabase, getDatabase, dbOperation } from './index';

describe('Database', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDatastoreInstances.length = 0;
  });

  describe('initializeDatabase', () => {
    it('should create data directory if not exists', async () => {
      await initializeDatabase();
      expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining(path.join('data')), {
        recursive: true,
      });
    });

    it('should initialize all datastores', async () => {
      await initializeDatabase();
      // 9 datastores: workspace, folder, request, response, environment, variable, settings, mockRoute, oauth2Token
      expect(mockDatastoreInstances).toHaveLength(9);

      // Verify filenames
      const filenames = mockDatastoreInstances.map((d: any) => d.filename);
      expect(filenames).toEqual(
        expect.arrayContaining([
          expect.stringContaining('workspaces.db'),
          expect.stringContaining('requests.db'),
          expect.stringContaining('mock_routes.db'),
          expect.stringContaining('oauth2_tokens.db'),
        ])
      );
    });

    it('should create indexes', async () => {
      await initializeDatabase();
      // 7 indexes: folder.parentId, request.parentId, response.requestId, env.workspaceId, var.environmentId, mockRoute.workspaceId, oauth2Token.requestId
      expect(mockEnsureIndex).toHaveBeenCalledTimes(7);

      const calls = mockEnsureIndex.mock.calls;
      const fields = calls.map((c: any) => c[0].fieldName);
      expect(fields).toContain('parentId');
      expect(fields).toContain('requestId');
      expect(fields).toContain('workspaceId');
      expect(fields).toContain('environmentId');
    });
  });

  describe('getDatabase', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('should return correct datastore for type', () => {
      const db = getDatabase('Request');
      expect(db).toBeDefined();
      expect(db.ensureIndex).toBeDefined();
    });

    it('should throw error for unknown type', () => {
      expect(() => getDatabase('Unknown' as any)).toThrow();
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
