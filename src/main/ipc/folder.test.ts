// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerFolderHandlers } from './folder';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import * as models from '../database/models';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

vi.mock('../database/models');

describe('Folder IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerFolderHandlers();
  });

  it('create should success', async () => {
    const folder = { _id: 'f1' };
    vi.mocked(models.createFolder).mockResolvedValue(folder as any);
    const res = await handlers[IPC_CHANNELS.FOLDER_CREATE](null, { name: 'F' });
    expect(res).toEqual({ success: true, data: folder });
  });

  it('update should success', async () => {
    const folder = { _id: 'f1', name: 'New' };
    vi.mocked(models.updateFolder).mockResolvedValue(folder as any);
    const res = await handlers[IPC_CHANNELS.FOLDER_UPDATE](null, 'f1', { name: 'New' });
    expect(res).toEqual({ success: true, data: folder });
  });

  it('delete should success', async () => {
    vi.mocked(models.deleteFolder).mockResolvedValue(undefined);
    const res = await handlers[IPC_CHANNELS.FOLDER_DELETE](null, 'f1');
    expect(res).toEqual({ success: true });
  });

  it('move should success', async () => {
    const folder = { _id: 'f1' };
    vi.mocked(models.moveFolder).mockResolvedValue(folder as any);
    const res = await handlers[IPC_CHANNELS.FOLDER_MOVE](null, 'f1', 'p1');
    expect(res).toEqual({ success: true, data: folder });
  });

  it('getByWorkspace should success', async () => {
    const list = [{ _id: 'f1' }];
    vi.mocked(models.getFoldersByWorkspace).mockResolvedValue(list as any);
    const res = await handlers[IPC_CHANNELS.FOLDER_GET_BY_WORKSPACE](null, 'w1');
    expect(res).toEqual({ success: true, data: list });
  });

  it('create should return error', async () => {
      vi.mocked(models.createFolder).mockRejectedValue(new Error('Fail'));
      const res = await handlers[IPC_CHANNELS.FOLDER_CREATE](null, {});
      expect(res).toEqual({ success: false, error: 'Fail' });
  });
});
