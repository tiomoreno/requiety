import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { Environment } from '@shared/types';
import {
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  activateEnvironment,
  getEnvironmentsByWorkspace,
} from '../database/models';
import { LoggerService } from '../services/logger.service';

/**
 * Register all environment IPC handlers
 */
export const registerEnvironmentHandlers = (): void => {
  // Create environment
  ipcMain.handle(
    IPC_CHANNELS.ENVIRONMENT_CREATE,
    async (_, data: Pick<Environment, 'name' | 'workspaceId'>) => {
      try {
        const environment = await createEnvironment(data);
        return { success: true, data: environment };
      } catch (error) {
        LoggerService.error('Error creating environment:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Update environment
  ipcMain.handle(
    IPC_CHANNELS.ENVIRONMENT_UPDATE,
    async (_, id: string, data: Partial<Pick<Environment, 'name'>>) => {
      try {
        const environment = await updateEnvironment(id, data);
        return { success: true, data: environment };
      } catch (error) {
        LoggerService.error('Error updating environment:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Delete environment
  ipcMain.handle(IPC_CHANNELS.ENVIRONMENT_DELETE, async (_, id: string) => {
    try {
      await deleteEnvironment(id);
      return { success: true };
    } catch (error) {
      LoggerService.error('Error deleting environment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Activate environment
  ipcMain.handle(IPC_CHANNELS.ENVIRONMENT_ACTIVATE, async (_, id: string) => {
    try {
      await activateEnvironment(id);
      return { success: true };
    } catch (error) {
      LoggerService.error('Error activating environment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get environments by workspace
  ipcMain.handle(IPC_CHANNELS.ENVIRONMENT_GET_BY_WORKSPACE, async (_, workspaceId: string) => {
    try {
      const environments = await getEnvironmentsByWorkspace(workspaceId);
      return { success: true, data: environments };
    } catch (error) {
      LoggerService.error('Error getting environments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
};
