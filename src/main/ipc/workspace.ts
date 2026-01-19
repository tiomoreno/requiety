import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { Workspace } from '@shared/types';
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getAllWorkspaces,
  getWorkspaceById,
} from '../database/models';
import { LoggerService } from '../services/logger.service';

/**
 * Register all workspace IPC handlers
 */
export const registerWorkspaceHandlers = (): void => {
  // Create workspace
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_CREATE, async (_, data: Pick<Workspace, 'name'>) => {
    try {
      const workspace = await createWorkspace(data);
      return { success: true, data: workspace };
    } catch (error) {
      LoggerService.error('Error creating workspace:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Update workspace
  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_UPDATE,
    async (_, id: string, data: Partial<Pick<Workspace, 'name'>>) => {
      try {
        const workspace = await updateWorkspace(id, data);
        return { success: true, data: workspace };
      } catch (error) {
        LoggerService.error('Error updating workspace:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Delete workspace
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_DELETE, async (_, id: string) => {
    try {
      await deleteWorkspace(id);
      return { success: true };
    } catch (error) {
      LoggerService.error('Error deleting workspace:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get all workspaces
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET_ALL, async () => {
    try {
      const workspaces = await getAllWorkspaces();
      return { success: true, data: workspaces };
    } catch (error) {
      LoggerService.error('Error getting workspaces:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get workspace by ID
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET_BY_ID, async (_, id: string) => {
    try {
      const workspace = await getWorkspaceById(id);
      return { success: true, data: workspace };
    } catch (error) {
      LoggerService.error('Error getting workspace:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
};
