import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { exportService } from '../services/export.service';
import { importService } from '../services/import.service';
import { PostmanImportService } from '../services/postman-import.service';
import { CurlParser } from '../utils/parsers/curl.parser';
import { createRequest } from '../database/models';
import * as fs from 'fs/promises';
import { LoggerService } from '../services/logger.service';

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
      LoggerService.error('Export failed:', error);
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
      LoggerService.error('Import failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Import failed' };
    }
  });

  // Import Postman Collection
  ipcMain.handle(IPC_CHANNELS.IMPORT_POSTMAN, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return { success: false, error: 'No window found' };

      // 1. Show Open Dialog
      const { filePaths, canceled } = await dialog.showOpenDialog(window, {
        title: 'Import Postman Collection',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (canceled || !filePaths.length) {
        return { success: false, error: 'Cancelled' };
      }

      // 2. Read File
      const content = await fs.readFile(filePaths[0], 'utf-8');
      const jsonData = JSON.parse(content);

      // 3. Validate it's a Postman collection
      if (!PostmanImportService.isPostmanCollection(jsonData)) {
        return {
          success: false,
          error: 'Invalid Postman collection. Please export as Collection v2.1 format.',
        };
      }

      // 4. Import
      const newWorkspace = await PostmanImportService.importCollection(jsonData);

      return { success: true, data: newWorkspace };
    } catch (error) {
      LoggerService.error('Postman import failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Import failed' };
    }
  });

  // Import cURL Command
  ipcMain.handle(
    IPC_CHANNELS.IMPORT_CURL,
    async (_event, curlCommand: string, parentId: string) => {
      try {
        // 1. Parse cURL command
        const parsed = CurlParser.parse(curlCommand);

        // 2. Generate request name from URL
        const name = CurlParser.generateRequestName(parsed.url);

        // 3. Create request
        const request = await createRequest({
          name,
          url: parsed.url,
          method: parsed.method,
          parentId,
          sortOrder: 0,
          headers: parsed.headers,
          body: parsed.body,
          authentication: parsed.authentication,
        });

        return { success: true, data: request };
      } catch (error) {
        LoggerService.error('cURL import failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Import failed' };
      }
    }
  );
}
