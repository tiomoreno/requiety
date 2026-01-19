import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { Folder } from '@shared/types';
import {
  createFolder,
  updateFolder,
  deleteFolder,
  moveFolder,
  getFoldersByWorkspace,
} from '../database/models';
import { LoggerService } from '../services/logger.service';

/**
 * Register all folder IPC handlers
 */
export const registerFolderHandlers = (): void => {
  // Create folder
  ipcMain.handle(
    IPC_CHANNELS.FOLDER_CREATE,
    async (_, data: Pick<Folder, 'name' | 'parentId' | 'sortOrder'>) => {
      try {
        const folder = await createFolder(data);
        return { success: true, data: folder };
      } catch (error) {
        LoggerService.error('Error creating folder:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Update folder
  ipcMain.handle(
    IPC_CHANNELS.FOLDER_UPDATE,
    async (_, id: string, data: Partial<Pick<Folder, 'name' | 'sortOrder'>>) => {
      try {
        const folder = await updateFolder(id, data);
        return { success: true, data: folder };
      } catch (error) {
        LoggerService.error('Error updating folder:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Delete folder
  ipcMain.handle(IPC_CHANNELS.FOLDER_DELETE, async (_, id: string) => {
    try {
      await deleteFolder(id);
      return { success: true };
    } catch (error) {
      LoggerService.error('Error deleting folder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Move folder
  ipcMain.handle(IPC_CHANNELS.FOLDER_MOVE, async (_, id: string, newParentId: string) => {
    try {
      const folder = await moveFolder(id, newParentId);
      return { success: true, data: folder };
    } catch (error) {
      LoggerService.error('Error moving folder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get folders by workspace
  ipcMain.handle(IPC_CHANNELS.FOLDER_GET_BY_WORKSPACE, async (_, workspaceId: string) => {
    try {
      const folders = await getFoldersByWorkspace(workspaceId);
      return { success: true, data: folders };
    } catch (error) {
      LoggerService.error('Error getting folders:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
};
