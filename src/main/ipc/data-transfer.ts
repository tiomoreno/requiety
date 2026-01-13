import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { exportService } from '../services/export.service';
import { importService } from '../services/import.service';
import * as fs from 'fs/promises';

export function registerDataTransferHandlers() {
  // Export Workspace
  ipcMain.handle(IPC_CHANNELS.DATA_EXPORT, async (event, workspaceId: string) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return { success: false, error: 'No window found' };

      // 1. Get Data
      const exportData = await exportService.exportWorkspace(workspaceId);
      const jsonString = JSON.stringify(exportData, null, 2);

      // 2. Show Save Dialog
      const { filePath, canceled } = await dialog.showSaveDialog(window, {
        title: 'Export Workspace',
        defaultPath: `workspace-${exportData.data.workspace.name.replace(/\s+/g, '-').toLowerCase()}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (canceled || !filePath) {
        return { success: false, error: 'Cancelled' };
      }

      // 3. Write File
      await fs.writeFile(filePath, jsonString, 'utf-8');

      return { success: true };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  // Import Workspace
  ipcMain.handle(IPC_CHANNELS.DATA_IMPORT, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return { success: false, error: 'No window found' };

      // 1. Show Open Dialog
      const { filePaths, canceled } = await dialog.showOpenDialog(window, {
        title: 'Import Workspace',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (canceled || !filePaths.length) {
        return { success: false, error: 'Cancelled' };
      }

      // 2. Read File
      const content = await fs.readFile(filePaths[0], 'utf-8');
      const jsonData = JSON.parse(content);

      // 3. Import
      const newWorkspace = await importService.importWorkspace(jsonData);

      return { success: true, data: newWorkspace };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Import failed' };
    }
  });
}
