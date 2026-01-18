// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerWorkspaceHandlers } from './workspace';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import * as models from '../database/models';
import { ipcMain } from 'electron';

// Mock dependencies
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

vi.mock('../database/models');

describe('Workspace IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    
    // Capture handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });

    registerWorkspaceHandlers();
  });

  it('should register all handlers', () => {
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.WORKSPACE_CREATE, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.WORKSPACE_UPDATE, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.WORKSPACE_DELETE, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.WORKSPACE_GET_ALL, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.WORKSPACE_GET_BY_ID, expect.any(Function));
  });

  it('create should return success', async () => {
    const mockWs = { _id: 'w1', name: 'Test' };
    vi.mocked(models.createWorkspace).mockResolvedValue(mockWs as any);

    const result = await handlers[IPC_CHANNELS.WORKSPACE_CREATE](null, { name: 'Test' });
    
    expect(models.createWorkspace).toHaveBeenCalledWith({ name: 'Test' });
    expect(result).toEqual({ success: true, data: mockWs });
  });

  it('create should handle error', async () => {
    vi.mocked(models.createWorkspace).mockRejectedValue(new Error('Fail'));
    const result = await handlers[IPC_CHANNELS.WORKSPACE_CREATE](null, { name: 'Test' });
    expect(result).toEqual({ success: false, error: 'Fail' });
  });
  
  it('update should return success', async () => {
    const mockWs = { _id: 'w1', name: 'New' };
    vi.mocked(models.updateWorkspace).mockResolvedValue(mockWs as any);

    const result = await handlers[IPC_CHANNELS.WORKSPACE_UPDATE](null, 'w1', { name: 'New' });
    expect(models.updateWorkspace).toHaveBeenCalledWith('w1', { name: 'New' });
    expect(result).toEqual({ success: true, data: mockWs });
  });

  it('delete should return success', async () => {
    vi.mocked(models.deleteWorkspace).mockResolvedValue(undefined);
    const result = await handlers[IPC_CHANNELS.WORKSPACE_DELETE](null, 'w1');
    expect(models.deleteWorkspace).toHaveBeenCalledWith('w1');
    expect(result).toEqual({ success: true });
  });

  it('getAll should return success', async () => {
    const list = [{ _id: 'w1' }];
    vi.mocked(models.getAllWorkspaces).mockResolvedValue(list as any);
    const result = await handlers[IPC_CHANNELS.WORKSPACE_GET_ALL](null);
    expect(result).toEqual({ success: true, data: list });
  });

  it('getById should return success', async () => {
    const ws = { _id: 'w1' };
    vi.mocked(models.getWorkspaceById).mockResolvedValue(ws as any);
    const result = await handlers[IPC_CHANNELS.WORKSPACE_GET_BY_ID](null, 'w1');
    expect(result).toEqual({ success: true, data: ws });
  });
});
