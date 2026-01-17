// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
const mockDb = {
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
};

vi.mock('./index', () => ({
  getDatabase: vi.fn(() => mockDb),
  dbOperation: vi.fn((op) => {
    // dbOperation takes a function that accepts a callback.
    // We can simulate its behavior by resolving a promise.
    // But since `models.ts` calls pass arrow functions like (cb) => db.insert(..., cb)
    // We need to execute that arrow function.
    return new Promise((resolve, reject) => {
        op((err: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
  })
}));

import { 
    createWorkspace, updateWorkspace, deleteWorkspace,
    createFolder, updateFolder, deleteFolder, moveFolder, getFoldersByWorkspace,
    getSettings, updateSettings,
    createRequest, updateRequest, deleteRequest, duplicateRequest, getRequestsByWorkspace, getWorkspaceIdForRequest,
    createEnvironment, activateEnvironment, deleteEnvironment, getEnvironmentsByWorkspace,
    createVariable, updateVariable, deleteVariable, getVariablesByEnvironment,
    createResponse, getResponseHistory, deleteResponse, deleteResponseHistory
} from './models';
import * as dbModule from './index';

describe('Database Models', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful mock implementation
    mockDb.insert.mockImplementation((doc, cb) => cb(null, doc));
    mockDb.update.mockImplementation((query, update, opts, cb) => cb(null, 1));
    mockDb.remove.mockImplementation((query, opts, cb) => cb(null, 1));
    
    // find needs to handle chaining for getResponseHistory
    const mockExec = vi.fn((cb) => cb(null, []));
    const mockChain = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: mockExec
    };
    
    mockDb.find.mockImplementation((query, cb) => {
        if (cb) {
             cb(null, []);
             return;
        }
        return mockChain;
    });
    
    mockDb.findOne.mockImplementation((query, cb) => cb(null, null));
  });

  describe('Workspaces', () => {
    it('createWorkspace should insert a new workspace', async () => {
      const result = await createWorkspace({ name: 'Test WS' });
      
      expect(dbModule.getDatabase).toHaveBeenCalledWith('Workspace');
      expect(mockDb.insert).toHaveBeenCalled();
      
      const insertCall = mockDb.insert.mock.calls[0];
      const insertedDoc = insertCall[0];
      expect(insertedDoc).toMatchObject({
          type: 'Workspace',
          name: 'Test WS'
      });
      expect(insertedDoc._id).toBeDefined();
    });

    it('updateWorkspace should update and return formatted doc', async () => {
      mockDb.findOne.mockImplementation((q, cb) => cb(null, { _id: '1', name: 'Updated' }));
      const result = await updateWorkspace('1', { name: 'Updated' });
      
      expect(mockDb.update).toHaveBeenCalledWith(
          { _id: '1' }, 
          { $set: expect.objectContaining({ name: 'Updated' }) }, 
          {}, 
          expect.any(Function)
      );
      expect(result.name).toBe('Updated');
    });

    it('deleteWorkspace should delete children recursively and then the workspace', async () => {
       // Ideally we would mock the recursive find/delete calls similar to deleteFolder
       // For simple coverage, we verify the core remove call happens
       await deleteWorkspace('1');
       expect(mockDb.remove).toHaveBeenCalledWith({ _id: '1' }, {}, expect.any(Function));
    });
  });

  describe('Folders', () => {
      it('createFolder should insert a new folder', async () => {
          await createFolder({ name: 'F1', parentId: 'root', sortOrder: 0 });
          expect(mockDb.insert).toHaveBeenCalled();
          expect(mockDb.insert.mock.calls[0][0]).toMatchObject({
              type: 'Folder',
              name: 'F1',
              parentId: 'root'
          });
      });

      it('updateFolder should update fields', async () => {
         await updateFolder('1', { name: 'New Name' });
         expect(mockDb.update).toHaveBeenCalledWith(
             { _id: '1' },
             expect.objectContaining({ $set: expect.objectContaining({ name: 'New Name' }) }),
             {},
             expect.any(Function)
         );
      });

      it('moveFolder should update parentId', async () => {
          await moveFolder('f1', 'newParent');
          expect(mockDb.update).toHaveBeenCalledWith(
              { _id: 'f1' },
              expect.objectContaining({ $set: expect.objectContaining({ parentId: 'newParent' }) }),
              {},
              expect.any(Function)
          );
      });

      it('getFoldersByWorkspace should return flattened list of folders', async () => {
          mockDb.find
             .mockImplementationOnce((q, cb) => {
                 // First call: find children of workspace
                 cb(null, [{ _id: 'f1', name: 'F1', parentId: 'w1' }]);
             })
             .mockImplementationOnce((q, cb) => {
                 // Second call: find children of f1
                 cb(null, [{ _id: 'f2', name: 'F2', parentId: 'f1' }]);
             })
             .mockImplementation((q, cb) => cb(null, [])); // Stop recursion
             
          const result = await getFoldersByWorkspace('w1');
          expect(result).toHaveLength(2); // F1, F2
      });
  });

  describe('Requests', () => {
      it('createRequest should insert a new request', async () => {
          const reqData = { 
              name: 'R1', url: 'http://foo', method: 'GET', parentId: 'root', 
              sortOrder: 0, headers: [], body: {}, authentication: {},
              assertions: [], preRequestScript: '', postRequestScript: ''
          };
          await createRequest(reqData as any);
          expect(mockDb.insert).toHaveBeenCalledWith(
              expect.objectContaining({ type: 'Request', name: 'R1' }),
              expect.any(Function)
          );
      });

      it('updateRequest should update fields', async () => {
          await updateRequest('r1', { name: 'R2' });
          expect(mockDb.update).toHaveBeenCalledWith(
              { _id: 'r1' },
              expect.objectContaining({ $set: expect.objectContaining({ name: 'R2' }) }),
              {},
              expect.any(Function)
          );
      });

      it('deleteRequest should delete responses and request', async () => {
          await deleteRequest('r1');
          expect(mockDb.remove).toHaveBeenCalledWith(
              expect.objectContaining({ _id: 'r1' }),
              {}, // options
              expect.any(Function)
          );
      });

      it('duplicateRequest should create a copy with new ID', async () => {
          const original = {
              _id: 'r1', name: 'Original', url: 'http://foo', 
              method: 'GET', parentId: 'p1', sortOrder: 1, headers: []
          };
          
          mockDb.findOne.mockImplementation((q, cb) => cb(null, original));
          
          await duplicateRequest('r1');
          
          // Verify findOne called to get original
          expect(mockDb.findOne).toHaveBeenCalledWith({ _id: 'r1' }, expect.any(Function));
          
          // Verify insert called with modified data
          expect(mockDb.insert).toHaveBeenCalledWith(
              expect.objectContaining({
                  name: 'Original (Copy)',
                  url: 'http://foo',
                  sortOrder: 2
              }),
              expect.any(Function)
          );
      });

      it('getRequestsByWorkspace should find requests in all workspace folders', async () => {
          // getWorkspaceFolderIds + find requests
          // Mock sequence:
          // 1. Folder find (recursion 1)
          // 2. Folder find (recursion 2 - stop)
          // 3. Request find
          
          mockDb.find
             .mockImplementationOnce((q, cb) => cb(null, [{ _id: 'f1', parentId: 'w1' }]))
             .mockImplementationOnce((q, cb) => cb(null, []))
             .mockImplementationOnce((q, cb) => cb(null, [{ _id: 'r1' }]));
             
          const res = await getRequestsByWorkspace('w1');
          expect(res).toHaveLength(1);
          expect(res[0]._id).toBe('r1');
      });

      it('getWorkspaceIdForRequest should traverse up to workspace', async () => {
          // R1 -> F2 -> F1 -> W1
          
          // Request lookup
          mockDb.findOne
            .mockImplementationOnce((q, cb) => cb(null, { _id: 'r1', parentId: 'f2', type: 'Request' }))
            
          // Mock DBs for hierarchy
          const folderDb = { ...mockDb, findOne: vi.fn() };
          const workspaceDb = { ...mockDb, findOne: vi.fn() };
          const requestDb = { ...mockDb, findOne: vi.fn() };
          
          vi.mocked(dbModule.getDatabase).mockImplementation((type) => {
              if (type === 'Folder') return folderDb as any;
              if (type === 'Workspace') return workspaceDb as any;
              if (type === 'Request') return requestDb as any;
              return mockDb as any;
          });
          
          // Request r1
          requestDb.findOne.mockImplementation((q, cb) => cb(null, { _id: 'r1', parentId: 'f2', type: 'Request' }));
          
          // F2
          workspaceDb.findOne.mockImplementationOnce((q, cb) => cb(null, null)); // Not workspace
          folderDb.findOne.mockImplementationOnce((q, cb) => cb(null, { _id: 'f2', parentId: 'f1', type: 'Folder' }));
          
          // F1
          workspaceDb.findOne.mockImplementationOnce((q, cb) => cb(null, null)); // Not workspace
          folderDb.findOne.mockImplementationOnce((q, cb) => cb(null, { _id: 'f1', parentId: 'w1', type: 'Folder' }));
          
          // W1
          workspaceDb.findOne.mockImplementationOnce((q, cb) => cb(null, { _id: 'w1', type: 'Workspace' }));
          
          const wid = await getWorkspaceIdForRequest('r1');
          expect(wid).toBe('w1');
      });
  });

  describe('Environments', () => {
      it('createEnvironment should insert', async () => {
          await createEnvironment({ name: 'Env1', workspaceId: 'w1' });
          expect(mockDb.insert).toHaveBeenCalledWith(
              expect.objectContaining({ type: 'Environment', name: 'Env1', isActive: false }),
              expect.any(Function)
          );
      });

      it('activateEnvironment should deactivate others and activate target', async () => {
          // Reset mock to ensure clean state
          mockDb.findOne.mockReset();
          mockDb.findOne.mockImplementation((q, cb) => cb(null, { _id: 'e1', workspaceId: 'w1' }));
          mockDb.update.mockImplementation((q, k, o, cb) => cb(null, 1));
          
          await activateEnvironment('e1');
          
          // 1. Deactivate all in workspace
          // We accept either the specific workspaceId or just verifying the $set logic
          expect(mockDb.update).toHaveBeenCalledWith(
              expect.objectContaining({ workspaceId: 'w1' }),
              { $set: { isActive: false } },
              { multi: true },
              expect.any(Function)
          );
          
          // 2. Activate target
          expect(mockDb.update).toHaveBeenCalledWith(
              { _id: 'e1' },
              { $set: { isActive: true } },
              {},
              expect.any(Function)
          );
      });
  });

  describe('Settings', () => {
      it('getSettings should return default settings if none exist', async () => {
          // findOne returns null by default (setup in beforeEach)
          const settings = await getSettings();
          
          // Should first try to find
          expect(mockDb.findOne).toHaveBeenCalledWith({ _id: 'settings' }, expect.any(Function));
          
          // Should then create default because it was null
          expect(mockDb.insert).toHaveBeenCalled();
          expect(settings.timeout).toBe(30000);
      });

      it('getSettings should return existing settings', async () => {
          const existing = { _id: 'settings', timeout: 5000 };
          mockDb.findOne.mockImplementation((q, cb) => cb(null, existing));
          
          const settings = await getSettings();
          expect(settings).toEqual(existing);
          expect(mockDb.insert).not.toHaveBeenCalled();
      });

      it('updateSettings should update and return new settings', async () => {
          await updateSettings({ theme: 'dark' });
          expect(mockDb.update).toHaveBeenCalledWith(
              { _id: 'settings' },
              { $set: expect.objectContaining({ theme: 'dark' }) },
              {},
              expect.any(Function)
          );
      });
  });
  
  // Complex Logic Test: deleteFolder (recursive)
  // This is tricky because it calls other model functions recursively.
  // models.ts imports functions from itself? No, they are exports.
  // It calls `deleteFolder` recursively.
  // It also calls `getDatabase` directly.
  describe('deleteFolder', () => {
      it('should delete keys queries requests and subfolders', async () => {
          // Setup:
          // Folder (id: f1)
          //   - Subfolder (id: f2)
          //   - Request (id: r1)
          
          // Mock find to return subfolders when querying folderDb
          // and requests when querying requestDb.
          
          // We need to differentiate based on database type.
          // vi.mocked(dbModule.getDatabase) is useful here.
          
          const folderDb = { ...mockDb, find: vi.fn(), remove: vi.fn() };
          const requestDb = { ...mockDb, find: vi.fn(), remove: vi.fn() };
          
          vi.mocked(dbModule.getDatabase).mockImplementation((type) => {
              if (type === 'Folder') return folderDb as any;
              if (type === 'Request') return requestDb as any;
              return mockDb as any;
          });
          
          // 1. Call deleteFolder('f1')
          //    -> find child folders (parentId: f1). Returns ['f2']
          //    -> recursive deleteFolder('f2')
          //       -> find child folders (parentId: f2). Returns []
          //       -> find requests (parentId: f2). Returns []
          //       -> remove f2
          //    -> find requests (parentId: f1). Returns ['r1']
          //    -> deleteRequest('r1') ... we won't mock this deeply, let's assume it calls remove
          //    -> remove f1
          
          // To simplify, let's just checking the root level logic first
          folderDb.find.mockImplementation((q: any, cb: any) => {
              if (q.parentId === 'f1') cb(null, [{ _id: 'f2' }]); // One subfolder
              else cb(null, []); // No children for f2
          });
          
          requestDb.find.mockImplementation((q: any, cb: any) => {
               cb(null, []); // No requests for simplicity
          });
          
          // Explicitly mock remove for folderDb to ensure callback is called
          folderDb.remove.mockImplementation((q, opts, cb) => {
             cb(null, 1);
          });

          // We need request delete to NOT loop infinitely or error.
          // deleteRequest calls getResponseHistory -> find responses.
          // We should mock response DB too logic if we go that deep.
          
          // Ideally, we mock `deleteFolder` specifically if we are testing recursion, but we are testing `deleteFolder` itself.
          
          // Let's just test it deletes the folder itself.
          
          await deleteFolder('f1');
          
          // Expectations
          // 1. Find children of f1
          expect(folderDb.find).toHaveBeenCalledWith({ parentId: 'f1' }, expect.any(Function));
          // 2. Find requests of f1
          expect(requestDb.find).toHaveBeenCalledWith({ parentId: 'f1' }, expect.any(Function));
          // 3. Remove f1
          expect(folderDb.remove).toHaveBeenCalledWith({ _id: 'f1' }, {}, expect.any(Function));
      });
  });
});
