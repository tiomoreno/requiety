import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { Settings } from '@shared/types';
import { getSettings, updateSettings } from '../database/models';
import { LoggerService } from '../services/logger.service';

/**
 * Register all settings IPC handlers
 */
export const registerSettingsHandlers = (): void => {
  // Get settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    try {
      const settings = await getSettings();
      return { success: true, data: settings };
    } catch (error) {
      LoggerService.error('Error getting settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Update settings
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_, data: Partial<Omit<Settings, '_id' | 'type' | 'created' | 'modified'>>) => {
      try {
        const settings = await updateSettings(data);
        return { success: true, data: settings };
      } catch (error) {
        LoggerService.error('Error updating settings:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );
};
