import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { RunnerService } from '../services/runner.service';
import { LoggerService } from '../services/logger.service';

export const registerRunnerHandlers = (): void => {
  ipcMain.handle(
    IPC_CHANNELS.RUNNER_START,
    async (event, { targetId, type }: { targetId: string; type: 'folder' | 'workspace' }) => {
      try {
        const window =
          BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
        const result = await RunnerService.startRun(window, targetId, type);
        return { success: true, data: result };
      } catch (error) {
        LoggerService.error('Error starting runner:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.RUNNER_STOP, async () => {
    try {
      RunnerService.stopRun();
      return { success: true };
    } catch (error) {
      LoggerService.error('Error stopping runner:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
};
