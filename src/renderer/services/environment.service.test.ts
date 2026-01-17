// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { environmentService } from './environment.service';

describe('EnvironmentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.window = {
            api: {
                environment: {
                    create: vi.fn(),
                    update: vi.fn(),
                    delete: vi.fn(),
                    activate: vi.fn(),
                    getByWorkspace: vi.fn(),
                }
            }
        } as any;
    });

    it('create should return new env', async () => {
        const mockEnv = { _id: 'e1', name: 'Env' };
        vi.mocked(window.api.environment.create).mockResolvedValue({ success: true, data: mockEnv });
        
        const result = await environmentService.create({ name: 'Env', workspaceId: 'w1' });
        expect(result).toEqual(mockEnv);
    });
    
    it('create should throw on failure', async () => {
        vi.mocked(window.api.environment.create).mockResolvedValue({ success: false });
        await expect(environmentService.create({ name: 'E', workspaceId: 'w' })).rejects.toThrow('Failed to create environment');
    });

    it('update should return updated env', async () => {
        const mockEnv = { _id: 'e1', name: 'Up' };
        vi.mocked(window.api.environment.update).mockResolvedValue({ success: true, data: mockEnv });
        
        const result = await environmentService.update('e1', { name: 'Up' });
        expect(result).toEqual(mockEnv);
    });

     it('activate should succeed', async () => {
        vi.mocked(window.api.environment.activate).mockResolvedValue({ success: true });
        await environmentService.activate('e1');
        expect(window.api.environment.activate).toHaveBeenCalledWith('e1');
    });

    it('getByWorkspace should return envs', async () => {
        const mockEnvs = [{ _id: 'e1' }];
        vi.mocked(window.api.environment.getByWorkspace).mockResolvedValue({ success: true, data: mockEnvs });
        const result = await environmentService.getByWorkspace('w1');
        expect(result).toEqual(mockEnvs);
    });

    it('getByWorkspace should return empty if no data but success', async () => {
        vi.mocked(window.api.environment.getByWorkspace).mockResolvedValue({ success: true, data: null });
        const result = await environmentService.getByWorkspace('w1');
        expect(result).toEqual([]);
    });

    it('delete should succeed', async () => {
        vi.mocked(window.api.environment.delete).mockResolvedValue({ success: true });
        await environmentService.delete('e1');
        expect(window.api.environment.delete).toHaveBeenCalledWith('e1');
    });
});
