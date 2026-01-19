import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { SyncService } from '../services/sync.service';

export const registerSyncHandlers = () => {
  // Let user select a directory for sync
  ipcMain.handle(IPC_CHANNELS.SYNC_SET_DIRECTORY, async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });
      if (canceled || filePaths.length === 0) {
        return { success: true, data: null };
      }
      return { success: true, data: filePaths[0] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Setup Git Sync for a workspace
  ipcMain.handle(
    IPC_CHANNELS.SYNC_SETUP,
    async (
      _,
      {
        workspaceId,
        url,
        branch,
        token,
        directory,
      }: { workspaceId: string; url: string; branch: string; token: string; directory: string }
    ) => {
      try {
        await SyncService.setup(workspaceId, url, branch, token, directory);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
  );

  // Pull changes from remote
  ipcMain.handle(IPC_CHANNELS.SYNC_PULL, async (_, workspaceId: string) => {
    try {
      await SyncService.pull(workspaceId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Push changes to remote
  ipcMain.handle(IPC_CHANNELS.SYNC_PUSH, async (_, workspaceId: string) => {
    try {
      await SyncService.push(workspaceId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
};
