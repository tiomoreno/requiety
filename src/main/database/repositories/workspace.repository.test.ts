// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  insert: vi.fn(),
  update: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  remove: vi.fn(),
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

vi.mock('./folder.repository', () => ({
  getFoldersByWorkspace: vi.fn(() => Promise.resolve([])),
  deleteFolder: vi.fn(() => Promise.resolve()),
}));

vi.mock('./request.repository', () => ({
  getRequestsByWorkspace: vi.fn(() => Promise.resolve([])),
  deleteRequest: vi.fn(() => Promise.resolve()),
}));

vi.mock('./environment.repository', () => ({
  getEnvironmentsByWorkspace: vi.fn(() => Promise.resolve([])),
  deleteEnvironment: vi.fn(() => Promise.resolve()),
}));

import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getAllWorkspaces,
  getWorkspaceById,
} from './workspace.repository';
import { getFoldersByWorkspace, deleteFolder } from './folder.repository';
import { getRequestsByWorkspace, deleteRequest } from './request.repository';
import { getEnvironmentsByWorkspace, deleteEnvironment } from './environment.repository';

describe('workspace.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockImplementation((doc, cb) => cb(null, doc));
    mockDb.update.mockImplementation((query, update, opts, cb) => cb(null, 1));
    mockDb.find.mockImplementation((query, cb) => cb(null, []));
    mockDb.findOne.mockImplementation((query, cb) => cb(null, null));
    mockDb.remove.mockImplementation((query, opts, cb) => cb(null, 1));
  });

  describe('createWorkspace', () => {
    it('should create a workspace with generated id and timestamps', async () => {
      const result = await createWorkspace({ name: 'My Workspace' });

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.stringMatching(/^wrk_/),
          type: 'Workspace',
          name: 'My Workspace',
          created: expect.any(Number),
          modified: expect.any(Number),
        }),
        expect.any(Function)
      );
      expect(result.name).toBe('My Workspace');
      expect(result.type).toBe('Workspace');
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace name', async () => {
      const existingWorkspace = {
        _id: 'wrk_123',
        type: 'Workspace',
        name: 'Old Name',
        created: 1000,
        modified: 1000,
      };

      mockDb.findOne.mockImplementation((query, cb) =>
        cb(null, { ...existingWorkspace, name: 'New Name' })
      );

      const result = await updateWorkspace('wrk_123', { name: 'New Name' });

      expect(mockDb.update).toHaveBeenCalledWith(
        { _id: 'wrk_123' },
        { $set: expect.objectContaining({ name: 'New Name', modified: expect.any(Number) }) },
        {},
        expect.any(Function)
      );
      expect(result.name).toBe('New Name');
    });

    it('should encrypt sync token when updating', async () => {
      const existingWorkspace = {
        _id: 'wrk_123',
        type: 'Workspace',
        name: 'Test',
        created: 1000,
        modified: 1000,
      };

      mockDb.findOne.mockImplementation((query, cb) =>
        cb(null, { ...existingWorkspace, syncToken: 'encrypted:my-token' })
      );

      await updateWorkspace('wrk_123', { syncToken: 'my-token' });

      expect(mockDb.update).toHaveBeenCalledWith(
        { _id: 'wrk_123' },
        { $set: expect.objectContaining({ syncToken: 'encrypted:my-token' }) },
        {},
        expect.any(Function)
      );
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace and all related entities', async () => {
      const folders = [{ _id: 'fld_1' }, { _id: 'fld_2' }];
      const requests = [{ _id: 'req_1' }];
      const environments = [{ _id: 'env_1' }];

      vi.mocked(getFoldersByWorkspace).mockResolvedValue(folders as any);
      vi.mocked(getRequestsByWorkspace).mockResolvedValue(requests as any);
      vi.mocked(getEnvironmentsByWorkspace).mockResolvedValue(environments as any);

      await deleteWorkspace('wrk_123');

      expect(getFoldersByWorkspace).toHaveBeenCalledWith('wrk_123');
      expect(deleteFolder).toHaveBeenCalledTimes(2);
      expect(deleteFolder).toHaveBeenCalledWith('fld_1');
      expect(deleteFolder).toHaveBeenCalledWith('fld_2');

      expect(getRequestsByWorkspace).toHaveBeenCalledWith('wrk_123');
      expect(deleteRequest).toHaveBeenCalledWith('req_1');

      expect(getEnvironmentsByWorkspace).toHaveBeenCalledWith('wrk_123');
      expect(deleteEnvironment).toHaveBeenCalledWith('env_1');

      expect(mockDb.remove).toHaveBeenCalledWith({ _id: 'wrk_123' }, {}, expect.any(Function));
    });

    it('should delete workspace even with no related entities', async () => {
      vi.mocked(getFoldersByWorkspace).mockResolvedValue([]);
      vi.mocked(getRequestsByWorkspace).mockResolvedValue([]);
      vi.mocked(getEnvironmentsByWorkspace).mockResolvedValue([]);

      await deleteWorkspace('wrk_123');

      expect(deleteFolder).not.toHaveBeenCalled();
      expect(deleteRequest).not.toHaveBeenCalled();
      expect(deleteEnvironment).not.toHaveBeenCalled();
      expect(mockDb.remove).toHaveBeenCalledWith({ _id: 'wrk_123' }, {}, expect.any(Function));
    });
  });

  describe('getAllWorkspaces', () => {
    it('should return all workspaces', async () => {
      const workspaces = [
        { _id: 'wrk_1', type: 'Workspace', name: 'Workspace 1' },
        { _id: 'wrk_2', type: 'Workspace', name: 'Workspace 2' },
      ];

      mockDb.find.mockImplementation((query, cb) => cb(null, workspaces));

      const result = await getAllWorkspaces();

      expect(mockDb.find).toHaveBeenCalledWith({}, expect.any(Function));
      expect(result).toEqual(workspaces);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no workspaces exist', async () => {
      mockDb.find.mockImplementation((query, cb) => cb(null, []));

      const result = await getAllWorkspaces();

      expect(result).toEqual([]);
    });
  });

  describe('getWorkspaceById', () => {
    it('should return workspace by id', async () => {
      const workspace = { _id: 'wrk_123', type: 'Workspace', name: 'My Workspace' };

      mockDb.findOne.mockImplementation((query, cb) => cb(null, workspace));

      const result = await getWorkspaceById('wrk_123');

      expect(mockDb.findOne).toHaveBeenCalledWith({ _id: 'wrk_123' }, expect.any(Function));
      expect(result).toEqual(workspace);
    });

    it('should return null when workspace not found', async () => {
      mockDb.findOne.mockImplementation((query, cb) => cb(null, null));

      const result = await getWorkspaceById('wrk_nonexistent');

      expect(result).toBeNull();
    });
  });
});
