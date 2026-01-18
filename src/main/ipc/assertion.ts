import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { updateRequest } from '../database/models';
import type { Assertion } from '../../shared/types';

export const registerAssertionHandlers = () => {
  ipcMain.handle(
    IPC_CHANNELS.ASSERTIONS_UPDATE,
    async (event, requestId: string, assertions: Assertion[]) => {
      try {
        const updatedRequest = await updateRequest(requestId, { assertions });
        return { success: true, data: updatedRequest };
      } catch (error) {
        console.error('Failed to update assertions:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
  );
};
