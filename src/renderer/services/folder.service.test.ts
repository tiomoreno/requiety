// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { folderService } from './folder.service';

describe('FolderService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.window = {
            api: {
                folder: {
                    getByWorkspace: vi.fn(),
                    create: vi.fn(),
                    update: vi.fn(),
                    delete: vi.fn(),
                    move: vi.fn(),
                }
            }
        } as any;
    });

    it('getByWorkspace should return folders on success', async () => {
        const mockFolders = [{ _id: 'f1', name: 'Folder 1' }];
        vi.mocked(window.api.folder.getByWorkspace).mockResolvedValue({ success: true, data: mockFolders });
        
        const result = await folderService.getByWorkspace('w1');
        expect(window.api.folder.getByWorkspace).toHaveBeenCalledWith('w1');
        expect(result).toEqual(mockFolders);
    });

    it('getByWorkspace should throw on failure', async () => {
        vi.mocked(window.api.folder.getByWorkspace).mockResolvedValue({ success: false, error: 'Fail' });
        await expect(folderService.getByWorkspace('w1')).rejects.toThrow('Fail');
    });

    it('create should return new folder', async () => {
        const mockFolder = { _id: 'f1', name: 'New' };
        vi.mocked(window.api.folder.create).mockResolvedValue({ success: true, data: mockFolder });
        
        const result = await folderService.create({ name: 'New', parentId: 'root', sortOrder: 0 });
        expect(window.api.folder.create).toHaveBeenCalledWith({ name: 'New', parentId: 'root', sortOrder: 0 });
        expect(result).toEqual(mockFolder);
    });
    
    it('create should throw on failure', async () => {
        vi.mocked(window.api.folder.create).mockResolvedValue({ success: false });
        await expect(folderService.create({ name: 'N', parentId: 'p', sortOrder: 0 })).rejects.toThrow('Failed to create folder');
    });

    it('update should return updated folder', async () => {
        const mockFolder = { _id: 'f1', name: 'Up' };
        vi.mocked(window.api.folder.update).mockResolvedValue({ success: true, data: mockFolder });
        
        const result = await folderService.update('f1', { name: 'Up' });
        expect(window.api.folder.update).toHaveBeenCalledWith('f1', { name: 'Up' });
        expect(result).toEqual(mockFolder);
    });

     it('update should throw on failure', async () => {
        vi.mocked(window.api.folder.update).mockResolvedValue({ success: false });
        await expect(folderService.update('f1', {})).rejects.toThrow('Failed to update folder');
    });

    it('delete should calls api', async () => {
        vi.mocked(window.api.folder.delete).mockResolvedValue({ success: true });
        await folderService.delete('f1');
        expect(window.api.folder.delete).toHaveBeenCalledWith('f1');
    });

    it('delete should throw on failure', async () => {
        vi.mocked(window.api.folder.delete).mockResolvedValue({ success: false, error: 'Err' });
        await expect(folderService.delete('f1')).rejects.toThrow('Err');
    });
    
    it('move should return updated folder', async () => {
        const mockFolder = { _id: 'f1', parentId: 'new' };
        vi.mocked(window.api.folder.move).mockResolvedValue({ success: true, data: mockFolder });
        
        const result = await folderService.move('f1', 'new');
        expect(window.api.folder.move).toHaveBeenCalledWith('f1', 'new');
        expect(result).toEqual(mockFolder);
    });

    it('move should throw on failure', async () => {
        vi.mocked(window.api.folder.move).mockResolvedValue({ success: false });
        await expect(folderService.move('f1', 'new')).rejects.toThrow('Failed to move folder');
    });
});
