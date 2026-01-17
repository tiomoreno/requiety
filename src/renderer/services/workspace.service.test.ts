// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceService } from './workspace.service';

describe('WorkspaceService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.window = {
            api: {
                workspace: {
                    getAll: vi.fn(),
                    getById: vi.fn(),
                    create: vi.fn(),
                    update: vi.fn(),
                    delete: vi.fn(),
                }
            }
        } as any;
    });

    it('getAll should return workspaces', async () => {
        const mockWorkspaces = [{ _id: 'w1', name: 'W1' }];
        vi.mocked(window.api.workspace.getAll).mockResolvedValue({ success: true, data: mockWorkspaces });
        
        const result = await workspaceService.getAll();
        expect(window.api.workspace.getAll).toHaveBeenCalled();
        expect(result).toEqual(mockWorkspaces);
    });

    it('getAll should throw on failure', async () => {
        vi.mocked(window.api.workspace.getAll).mockResolvedValue({ success: false });
        await expect(workspaceService.getAll()).rejects.toThrow('Failed to get workspaces');
    });

    it('getById should return workspace', async () => {
        const mockWorkspace = { _id: 'w1' };
        vi.mocked(window.api.workspace.getById).mockResolvedValue({ success: true, data: mockWorkspace });
        const result = await workspaceService.getById('w1');
        expect(result).toEqual(mockWorkspace);
    });
    
    it('getById should return null if no data', async () => {
        vi.mocked(window.api.workspace.getById).mockResolvedValue({ success: true, data: null });
        const result = await workspaceService.getById('w1');
        expect(result).toBeNull();
    });

     it('getById should throw on failure', async () => {
        vi.mocked(window.api.workspace.getById).mockResolvedValue({ success: false, error: 'Err' });
        await expect(workspaceService.getById('w1')).rejects.toThrow('Err');
    });

    it('create should return new workspace', async () => {
        const mockWorkspace = { _id: 'w1', name: 'New' };
        vi.mocked(window.api.workspace.create).mockResolvedValue({ success: true, data: mockWorkspace });
        
        const result = await workspaceService.create('New');
        expect(window.api.workspace.create).toHaveBeenCalledWith({ name: 'New' });
        expect(result).toEqual(mockWorkspace);
    });

    it('create should throw on failure', async () => {
        vi.mocked(window.api.workspace.create).mockResolvedValue({ success: false });
        await expect(workspaceService.create('New')).rejects.toThrow('Failed to create workspace');
    });

    it('update should return updated workspace', async () => {
        const mockWorkspace = { _id: 'w1', name: 'Up' };
        vi.mocked(window.api.workspace.update).mockResolvedValue({ success: true, data: mockWorkspace });
        
        const result = await workspaceService.update('w1', { name: 'Up' });
        expect(window.api.workspace.update).toHaveBeenCalledWith('w1', { name: 'Up' });
        expect(result).toEqual(mockWorkspace);
    });

     it('update should throw on failure', async () => {
        vi.mocked(window.api.workspace.update).mockResolvedValue({ success: false });
        await expect(workspaceService.update('w1', { name: 'A' })).rejects.toThrow('Failed to update workspace');
    });

    it('delete should call api', async () => {
        vi.mocked(window.api.workspace.delete).mockResolvedValue({ success: true });
        await workspaceService.delete('w1');
        expect(window.api.workspace.delete).toHaveBeenCalledWith('w1');
    });

    it('delete should throw on failure', async () => {
        vi.mocked(window.api.workspace.delete).mockResolvedValue({ success: false });
        await expect(workspaceService.delete('w1')).rejects.toThrow('Failed to delete workspace');
    });
});
