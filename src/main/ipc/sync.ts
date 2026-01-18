import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
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

  // Export workspace data to the selected directory
  ipcMain.handle(IPC_CHANNELS.SYNC_EXPORT, async (_, workspaceId: string, directory: string) => {
    try {
      await SyncService.exportWorkspace(workspaceId, directory);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Import logic will be added here
};
