// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from './sync.service';
import * as fs from 'fs/promises';
import * as models from '../database/models';
import type { Workspace, Folder, Request, Environment, Variable } from '../../shared/types';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../database/models');

describe('SyncService', () => {
  const mockWorkspace: Workspace = {
    _id: 'ws_1',
    type: 'Workspace',
    name: 'Test Workspace',
    created: Date.now(),
    modified: Date.now(),
  };

  const mockFolders: Folder[] = [
    {
      _id: 'folder_1',
      type: 'Folder',
      name: 'API Tests',
      parentId: 'ws_1',
      sortOrder: 0,
      created: Date.now(),
      modified: Date.now(),
    },
    {
      _id: 'folder_2',
      type: 'Folder',
      name: 'Auth Tests',
      parentId: 'folder_1',
      sortOrder: 1,
      created: Date.now(),
      modified: Date.now(),
    },
  ];

  const mockRequests: Request[] = [
    {
      _id: 'req_1',
      type: 'Request',
      name: 'Get Users',
      url: 'https://api.example.com/users',
      method: 'GET',
      parentId: 'folder_1',
      sortOrder: 0,
      headers: [],
      body: { type: 'none' },
      authentication: { type: 'none' },
      created: Date.now(),
      modified: Date.now(),
    },
    {
      _id: 'req_2',
      type: 'Request',
      name: 'Create User',
      url: 'https://api.example.com/users',
      method: 'POST',
      parentId: 'folder_1',
      sortOrder: 1,
      headers: [{ name: 'Content-Type', value: 'application/json', enabled: true }],
      body: { type: 'json', text: '{"name": "John"}' },
      authentication: { type: 'bearer', token: '{{token}}' },
      created: Date.now(),
      modified: Date.now(),
    },
  ];

  const mockEnvironments: Environment[] = [
    {
      _id: 'env_1',
      type: 'Environment',
      name: 'Development',
      workspaceId: 'ws_1',
      isActive: true,
      created: Date.now(),
      modified: Date.now(),
    },
    {
      _id: 'env_2',
      type: 'Environment',
      name: 'Production',
      workspaceId: 'ws_1',
      isActive: false,
      created: Date.now(),
      modified: Date.now(),
    },
  ];

  const mockVariables: Variable[] = [
    {
      _id: 'var_1',
      type: 'Variable',
      environmentId: 'env_1',
      key: 'baseUrl',
      value: 'https://dev.api.example.com',
      isSecret: false,
      created: Date.now(),
      modified: Date.now(),
    },
    {
      _id: 'var_2',
      type: 'Variable',
      environmentId: 'env_1',
      key: 'token',
      value: 'dev-token-123',
      isSecret: true,
      created: Date.now(),
      modified: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(models.getWorkspaceById).mockResolvedValue(mockWorkspace);
    vi.mocked(models.getFoldersByWorkspace).mockResolvedValue(mockFolders);
    vi.mocked(models.getRequestsByWorkspace).mockResolvedValue(mockRequests);
    vi.mocked(models.getEnvironmentsByWorkspace).mockResolvedValue(mockEnvironments);
    vi.mocked(models.getVariablesByEnvironment).mockImplementation(async (envId) => {
      if (envId === 'env_1') return mockVariables;
      return [];
    });

    vi.mocked(fs.rm).mockResolvedValue(undefined);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  });

  describe('exportWorkspace', () => {
    it('should export workspace and all related data', async () => {
      await SyncService.exportWorkspace('ws_1', '/export/path');

      // Verify workspace was fetched
      expect(models.getWorkspaceById).toHaveBeenCalledWith('ws_1');

      // Verify old export was cleaned up
      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining('.requiety/workspaces/ws_1'),
        { recursive: true, force: true }
      );

      // Verify directories were created
      expect(fs.mkdir).toHaveBeenCalledTimes(3); // requests, folders, environments

      // Verify workspace file was written
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('workspace.json'),
        expect.stringContaining('"name": "Test Workspace"')
      );
    });

    it('should export all folders', async () => {
      await SyncService.exportWorkspace('ws_1', '/export/path');

      expect(models.getFoldersByWorkspace).toHaveBeenCalledWith('ws_1');

      // Check that each folder was written
      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const folderWrites = writeFileCalls.filter(call =>
        (call[0] as string).includes('/folders/')
      );

      expect(folderWrites.length).toBe(2);
      expect(folderWrites.some(call => (call[0] as string).includes('folder_1.json'))).toBe(true);
      expect(folderWrites.some(call => (call[0] as string).includes('folder_2.json'))).toBe(true);
    });

    it('should export all requests', async () => {
      await SyncService.exportWorkspace('ws_1', '/export/path');

      expect(models.getRequestsByWorkspace).toHaveBeenCalledWith('ws_1');

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const requestWrites = writeFileCalls.filter(call =>
        (call[0] as string).includes('/requests/')
      );

      expect(requestWrites.length).toBe(2);
      expect(requestWrites.some(call => (call[0] as string).includes('req_1.json'))).toBe(true);
      expect(requestWrites.some(call => (call[0] as string).includes('req_2.json'))).toBe(true);
    });

    it('should export environments with their variables', async () => {
      await SyncService.exportWorkspace('ws_1', '/export/path');

      expect(models.getEnvironmentsByWorkspace).toHaveBeenCalledWith('ws_1');
      expect(models.getVariablesByEnvironment).toHaveBeenCalledWith('env_1');
      expect(models.getVariablesByEnvironment).toHaveBeenCalledWith('env_2');

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const envWrites = writeFileCalls.filter(call =>
        (call[0] as string).includes('/environments/')
      );

      expect(envWrites.length).toBe(2);

      // Check that env_1 includes variables
      const env1Write = envWrites.find(call => (call[0] as string).includes('env_1.json'));
      expect(env1Write).toBeDefined();
      const env1Content = env1Write![1] as string;
      expect(env1Content).toContain('"variables"');
      expect(env1Content).toContain('"baseUrl"');
      expect(env1Content).toContain('"token"');
    });

    it('should throw error if workspace not found', async () => {
      vi.mocked(models.getWorkspaceById).mockResolvedValue(null);

      await expect(SyncService.exportWorkspace('invalid_ws', '/export/path'))
        .rejects.toThrow('Workspace not found');
    });

    it('should handle empty workspace (no folders, requests, environments)', async () => {
      vi.mocked(models.getFoldersByWorkspace).mockResolvedValue([]);
      vi.mocked(models.getRequestsByWorkspace).mockResolvedValue([]);
      vi.mocked(models.getEnvironmentsByWorkspace).mockResolvedValue([]);

      await SyncService.exportWorkspace('ws_1', '/export/path');

      // Should still create directories
      expect(fs.mkdir).toHaveBeenCalledTimes(3);

      // Should only write workspace file
      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      expect(writeFileCalls.length).toBe(1);
      expect((writeFileCalls[0][0] as string)).toContain('workspace.json');
    });

    it('should use correct directory structure', async () => {
      await SyncService.exportWorkspace('ws_1', '/my/project');

      const mkdirCalls = vi.mocked(fs.mkdir).mock.calls;

      // Check for .requiety/workspaces/ws_1/requests
      expect(mkdirCalls.some(call =>
        (call[0] as string).includes('.requiety/workspaces/ws_1/requests')
      )).toBe(true);

      // Check for .requiety/workspaces/ws_1/folders
      expect(mkdirCalls.some(call =>
        (call[0] as string).includes('.requiety/workspaces/ws_1/folders')
      )).toBe(true);

      // Check for .requiety/workspaces/ws_1/environments
      expect(mkdirCalls.some(call =>
        (call[0] as string).includes('.requiety/workspaces/ws_1/environments')
      )).toBe(true);
    });

    it('should handle filesystem errors', async () => {
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'));

      await expect(SyncService.exportWorkspace('ws_1', '/export/path'))
        .rejects.toThrow('Permission denied');
    });

    it('should format JSON with indentation', async () => {
      await SyncService.exportWorkspace('ws_1', '/export/path');

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const workspaceWrite = writeFileCalls.find(call =>
        (call[0] as string).includes('workspace.json')
      );

      const content = workspaceWrite![1] as string;
      // Check for indentation (2 spaces)
      expect(content).toContain('  "');
      // Should not be minified
      expect(content).toContain('\n');
    });
  });
});
