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

vi.mock('./response.repository', () => ({
  deleteResponseHistory: vi.fn(() => Promise.resolve()),
}));

vi.mock('./folder.repository', () => ({
  getWorkspaceFolderIds: vi.fn(() => Promise.resolve(['wrk_123', 'fld_1', 'fld_2'])),
}));

vi.mock('./workspace.repository', () => ({
  getWorkspaceById: vi.fn(() => Promise.resolve(null)),
}));

import {
  createRequest,
  updateRequest,
  deleteRequest,
  duplicateRequest,
  getRequestsByWorkspace,
  getRequestById,
  getWorkspaceIdForRequest,
} from './request.repository';
import { deleteResponseHistory } from './response.repository';
import { getWorkspaceFolderIds } from './folder.repository';
import { getWorkspaceById } from './workspace.repository';

describe('request.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockImplementation((doc, cb) => cb(null, doc));
    mockDb.update.mockImplementation((query, update, opts, cb) => cb(null, 1));
    mockDb.find.mockImplementation((query, cb) => cb(null, []));
    mockDb.findOne.mockImplementation((query, cb) => cb(null, null));
    mockDb.remove.mockImplementation((query, opts, cb) => cb(null, 1));
  });

  describe('createRequest', () => {
    it('should create a request with generated id and timestamps', async () => {
      const requestData = {
        name: 'Get Users',
        url: 'https://api.example.com/users',
        method: 'GET',
        parentId: 'wrk_123',
        headers: [],
        body: { mimeType: 'none' },
        authentication: { type: 'none' as const },
        sortOrder: 0,
      };

      const result = await createRequest(requestData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.stringMatching(/^req_/),
          type: 'Request',
          name: 'Get Users',
          url: 'https://api.example.com/users',
          method: 'GET',
          parentId: 'wrk_123',
          created: expect.any(Number),
          modified: expect.any(Number),
        }),
        expect.any(Function)
      );
      expect(result.name).toBe('Get Users');
      expect(result.type).toBe('Request');
    });
  });

  describe('updateRequest', () => {
    it('should update request and return updated document', async () => {
      const existingRequest = {
        _id: 'req_123',
        type: 'Request',
        name: 'Old Name',
        url: 'https://api.example.com',
        method: 'GET',
        parentId: 'wrk_123',
        created: 1000,
        modified: 1000,
      };

      mockDb.findOne.mockImplementation((query, cb) =>
        cb(null, { ...existingRequest, name: 'New Name', url: 'https://api.new.com' })
      );

      const result = await updateRequest('req_123', {
        name: 'New Name',
        url: 'https://api.new.com',
      });

      expect(mockDb.update).toHaveBeenCalledWith(
        { _id: 'req_123' },
        {
          $set: expect.objectContaining({
            name: 'New Name',
            url: 'https://api.new.com',
            modified: expect.any(Number),
          }),
        },
        {},
        expect.any(Function)
      );
      expect(result.name).toBe('New Name');
      expect(result.url).toBe('https://api.new.com');
    });

    it('should update request method', async () => {
      mockDb.findOne.mockImplementation((query, cb) =>
        cb(null, { _id: 'req_123', method: 'POST' })
      );

      const result = await updateRequest('req_123', { method: 'POST' });

      expect(mockDb.update).toHaveBeenCalledWith(
        { _id: 'req_123' },
        { $set: expect.objectContaining({ method: 'POST' }) },
        {},
        expect.any(Function)
      );
      expect(result.method).toBe('POST');
    });
  });

  describe('deleteRequest', () => {
    it('should delete request and its response history', async () => {
      await deleteRequest('req_123');

      expect(deleteResponseHistory).toHaveBeenCalledWith('req_123');
      expect(mockDb.remove).toHaveBeenCalledWith({ _id: 'req_123' }, {}, expect.any(Function));
    });
  });

  describe('duplicateRequest', () => {
    it('should duplicate request with (Copy) suffix', async () => {
      const originalRequest = {
        _id: 'req_123',
        type: 'Request',
        name: 'Original Request',
        url: 'https://api.example.com',
        method: 'GET',
        parentId: 'wrk_123',
        headers: [{ name: 'Authorization', value: 'Bearer token', enabled: true }],
        body: { mimeType: 'none' },
        authentication: { type: 'none' as const },
        sortOrder: 1,
        created: 1000,
        modified: 1000,
      };

      mockDb.findOne.mockImplementation((query, cb) => cb(null, originalRequest));

      const result = await duplicateRequest('req_123');

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.stringMatching(/^req_/),
          type: 'Request',
          name: 'Original Request (Copy)',
          url: 'https://api.example.com',
          method: 'GET',
          parentId: 'wrk_123',
        }),
        expect.any(Function)
      );
      expect(result.name).toBe('Original Request (Copy)');
      expect(result._id).not.toBe('req_123');
    });

    it('should throw error when request not found', async () => {
      mockDb.findOne.mockImplementation((query, cb) => cb(null, null));

      await expect(duplicateRequest('req_nonexistent')).rejects.toThrow(
        'Request req_nonexistent not found'
      );
    });
  });

  describe('getRequestsByWorkspace', () => {
    it('should return requests for workspace including nested folders', async () => {
      const requests = [
        { _id: 'req_1', name: 'Request 1', parentId: 'wrk_123' },
        { _id: 'req_2', name: 'Request 2', parentId: 'fld_1' },
        { _id: 'req_3', name: 'Request 3', parentId: 'fld_2' },
      ];

      vi.mocked(getWorkspaceFolderIds).mockResolvedValue(['wrk_123', 'fld_1', 'fld_2']);
      mockDb.find.mockImplementation((query, cb) => cb(null, requests));

      const result = await getRequestsByWorkspace('wrk_123');

      expect(getWorkspaceFolderIds).toHaveBeenCalledWith('wrk_123');
      expect(mockDb.find).toHaveBeenCalledWith(
        { parentId: { $in: ['wrk_123', 'fld_1', 'fld_2'] } },
        expect.any(Function)
      );
      expect(result).toEqual(requests);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no requests', async () => {
      vi.mocked(getWorkspaceFolderIds).mockResolvedValue(['wrk_123']);
      mockDb.find.mockImplementation((query, cb) => cb(null, []));

      const result = await getRequestsByWorkspace('wrk_123');

      expect(result).toEqual([]);
    });
  });

  describe('getRequestById', () => {
    it('should return request by id', async () => {
      const request = {
        _id: 'req_123',
        type: 'Request',
        name: 'My Request',
        url: 'https://api.example.com',
        method: 'GET',
      };

      mockDb.findOne.mockImplementation((query, cb) => cb(null, request));

      const result = await getRequestById('req_123');

      expect(mockDb.findOne).toHaveBeenCalledWith({ _id: 'req_123' }, expect.any(Function));
      expect(result).toEqual(request);
    });

    it('should return null when request not found', async () => {
      mockDb.findOne.mockImplementation((query, cb) => cb(null, null));

      const result = await getRequestById('req_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getWorkspaceIdForRequest', () => {
    it('should return workspace id for request directly in workspace', async () => {
      const request = { _id: 'req_123', parentId: 'wrk_123' };
      const workspace = { _id: 'wrk_123', type: 'Workspace', name: 'My Workspace' };

      mockDb.findOne.mockImplementation((query, cb) => cb(null, request));
      vi.mocked(getWorkspaceById).mockResolvedValue(workspace as any);

      const result = await getWorkspaceIdForRequest('req_123');

      expect(result).toBe('wrk_123');
    });

    it('should traverse folder hierarchy to find workspace', async () => {
      const request = { _id: 'req_123', parentId: 'fld_2' };
      const folder2 = { _id: 'fld_2', parentId: 'fld_1' };
      const folder1 = { _id: 'fld_1', parentId: 'wrk_123' };
      const workspace = { _id: 'wrk_123', type: 'Workspace', name: 'My Workspace' };

      // First call: get request
      mockDb.findOne
        .mockImplementationOnce((query, cb) => cb(null, request))
        // Second call: get folder2
        .mockImplementationOnce((query, cb) => cb(null, folder2))
        // Third call: get folder1
        .mockImplementationOnce((query, cb) => cb(null, folder1));

      vi.mocked(getWorkspaceById)
        .mockResolvedValueOnce(null) // fld_2 is not a workspace
        .mockResolvedValueOnce(null) // fld_1 is not a workspace
        .mockResolvedValueOnce(workspace as any); // wrk_123 is a workspace

      const result = await getWorkspaceIdForRequest('req_123');

      expect(result).toBe('wrk_123');
    });

    it('should return null when request not found', async () => {
      mockDb.findOne.mockImplementation((query, cb) => cb(null, null));

      const result = await getWorkspaceIdForRequest('req_nonexistent');

      expect(result).toBeNull();
    });
  });
});
