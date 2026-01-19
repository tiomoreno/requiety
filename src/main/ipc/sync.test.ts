import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSyncHandlers } from './sync';
import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { SyncService } from '../services/sync.service';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('../services/sync.service', () => ({
  SyncService: {
    setup: vi.fn(),
    pull: vi.fn(),
    push: vi.fn(),
  },
}));

describe('Sync IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register all handlers', () => {
    registerSyncHandlers();

    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.SYNC_SET_DIRECTORY,
      expect.any(Function)
    );
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.SYNC_SETUP, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.SYNC_PULL, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.SYNC_PUSH, expect.any(Function));
  });

  describe('Handlers Execution', () => {
    // Helper to get the registered handler
    const getHandler = (channel: string) => {
      const call = vi.mocked(ipcMain.handle).mock.calls.find((c) => c[0] === channel);
      return call ? call[1] : null;
    };

    beforeEach(() => {
      registerSyncHandlers();
    });

    it('SYNC_SET_DIRECTORY - success', async () => {
      const handler = getHandler(IPC_CHANNELS.SYNC_SET_DIRECTORY);
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/dir'],
      } as any);

      const result = await handler({} as any);
      expect(result).toEqual({ success: true, data: '/path/to/dir' });
    });

    it('SYNC_SET_DIRECTORY - canceled', async () => {
      const handler = getHandler(IPC_CHANNELS.SYNC_SET_DIRECTORY);
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({ canceled: true, filePaths: [] } as any);

      const result = await handler({} as any);
      expect(result).toEqual({ success: true, data: null });
    });

    it('SYNC_SETUP - success', async () => {
      const handler = getHandler(IPC_CHANNELS.SYNC_SETUP);
      const params = {
        workspaceId: 'w1',
        url: 'http://git',
        branch: 'main',
        token: 'token',
        directory: '/dir',
      };

      const result = await handler({} as any, params);

      expect(SyncService.setup).toHaveBeenCalledWith('w1', 'http://git', 'main', 'token', '/dir');
      expect(result).toEqual({ success: true });
    });

    it('SYNC_SETUP - error', async () => {
      const handler = getHandler(IPC_CHANNELS.SYNC_SETUP);
      vi.mocked(SyncService.setup).mockRejectedValue(new Error('Setup failed'));

      const result = await handler({} as any, {} as any);
      expect(result).toEqual({ success: false, error: 'Setup failed' });
    });

    it('SYNC_PULL - success', async () => {
      const handler = getHandler(IPC_CHANNELS.SYNC_PULL);
      await handler({} as any, 'w1');
      expect(SyncService.pull).toHaveBeenCalledWith('w1');
    });

    it('SYNC_PUSH - success', async () => {
      const handler = getHandler(IPC_CHANNELS.SYNC_PUSH);
      await handler({} as any, 'w1');
      expect(SyncService.push).toHaveBeenCalledWith('w1');
    });
  });
});
