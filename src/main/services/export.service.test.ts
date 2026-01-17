// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportService } from './export.service';
import * as models from '../database/models';

vi.mock('../database/models');

describe('ExportService', () => {
    const mockWorkspace = { _id: 'w1', name: 'Workspace 1' };
    const mockEnv = { _id: 'e1', name: 'Env 1', workspaceId: 'w1', variables: [] };
    const mockVar = { _id: 'v1', key: 'K', value: 'V', environmentId: 'e1' };
    const mockFolder = { _id: 'f1', name: 'Folder 1', parentId: 'w1' };
    const mockRequest = { _id: 'r1', name: 'Request 1', parentId: 'f1' };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(models.getWorkspaceById).mockResolvedValue(mockWorkspace as any);
        vi.mocked(models.getEnvironmentsByWorkspace).mockResolvedValue([mockEnv] as any);
        vi.mocked(models.getVariablesByEnvironment).mockResolvedValue([mockVar] as any);
        vi.mocked(models.getFoldersByWorkspace).mockResolvedValue([mockFolder] as any);
        vi.mocked(models.getRequestsByWorkspace).mockResolvedValue([mockRequest] as any);
    });

    it('should export all workspace data', async () => {
        const result = await exportService.exportWorkspace('w1');
        
        expect(models.getWorkspaceById).toHaveBeenCalledWith('w1');
        expect(models.getEnvironmentsByWorkspace).toHaveBeenCalledWith('w1');
        expect(models.getVariablesByEnvironment).toHaveBeenCalledWith('e1');
        expect(models.getFoldersByWorkspace).toHaveBeenCalledWith('w1');
        expect(models.getRequestsByWorkspace).toHaveBeenCalledWith('w1');
        
        expect(result).toEqual({
            version: '1.0',
            source: 'Requiety',
            data: {
                workspace: mockWorkspace,
                environments: [{ ...mockEnv, variables: [mockVar] }],
                folders: [mockFolder],
                requests: [mockRequest]
            }
        });
    });

    it('should throw if workspace not found', async () => {
        vi.mocked(models.getWorkspaceById).mockResolvedValue(null);
        await expect(exportService.exportWorkspace('w1')).rejects.toThrow('Workspace not found');
    });
});
