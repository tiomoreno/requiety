import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { Variable } from '../../shared/types';
import {
  createVariable,
  updateVariable,
  deleteVariable,
  getVariablesByEnvironment,
} from '../database/models';

/**
 * Register all variable IPC handlers
 */
export const registerVariableHandlers = (): void => {
  // Create variable
  ipcMain.handle(
    IPC_CHANNELS.VARIABLE_CREATE,
    async (
      _,
      data: Pick<Variable, 'environmentId' | 'key' | 'value' | 'isSecret'>
    ) => {
      try {
        const variable = await createVariable(data);
        return { success: true, data: variable };
      } catch (error) {
        console.error('Error creating variable:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Update variable
  ipcMain.handle(
    IPC_CHANNELS.VARIABLE_UPDATE,
    async (
      _,
      id: string,
      data: Partial<Pick<Variable, 'key' | 'value' | 'isSecret'>>
    ) => {
      try {
        const variable = await updateVariable(id, data);
        return { success: true, data: variable };
      } catch (error) {
        console.error('Error updating variable:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Delete variable
  ipcMain.handle(IPC_CHANNELS.VARIABLE_DELETE, async (_, id: string) => {
    try {
      await deleteVariable(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting variable:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get variables by environment
  ipcMain.handle(
    IPC_CHANNELS.VARIABLE_GET_BY_ENVIRONMENT,
    async (_, environmentId: string) => {
      try {
        const variables = await getVariablesByEnvironment(environmentId);
        return { success: true, data: variables };
      } catch (error) {
        console.error('Error getting variables:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );
};
