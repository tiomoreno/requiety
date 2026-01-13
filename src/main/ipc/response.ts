import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import {
  getResponseHistory,
  getResponseById,
  deleteResponseHistory,
} from '../database/models';
import { readResponseBody } from '../utils/file-manager';

/**
 * Register all response IPC handlers
 */
export const registerResponseHandlers = (): void => {
  // Get response history
  ipcMain.handle(
    IPC_CHANNELS.RESPONSE_GET_HISTORY,
    async (_, requestId: string, limit?: number) => {
      try {
        const responses = await getResponseHistory(requestId, limit);
        return { success: true, data: responses };
      } catch (error) {
        console.error('Error getting response history:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Get response by ID
  ipcMain.handle(IPC_CHANNELS.RESPONSE_GET_BY_ID, async (_, id: string) => {
    try {
      const response = await getResponseById(id);
      if (!response) {
        return { success: false, error: 'Response not found' };
      }

      // Read the response body from file
      const body = await readResponseBody(response.bodyPath);

      return {
        success: true,
        data: {
          response,
          body,
        },
      };
    } catch (error) {
      console.error('Error getting response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Delete response history
  ipcMain.handle(
    IPC_CHANNELS.RESPONSE_DELETE_HISTORY,
    async (_, requestId: string) => {
      try {
        await deleteResponseHistory(requestId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting response history:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );
};
