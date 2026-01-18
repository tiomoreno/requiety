// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDataTransferHandlers } from './data-transfer';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { exportService } from '../services/export.service';
import { importService } from '../services/import.service';
import { PostmanImportService } from '../services/postman-import.service';
import { CurlImportService } from '../services/curl-import.service';
import * as models from '../database/models';
import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: { showSaveDialog: vi.fn(), showOpenDialog: vi.fn() },
  BrowserWindow: { fromWebContents: vi.fn() }
}));

vi.mock('fs/promises');
vi.mock('../services/export.service');
vi.mock('../services/import.service');
vi.mock('../services/postman-import.service');
vi.mock('../services/curl-import.service');
vi.mock('../database/models');

describe('Data Transfer IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};
  const mockEvent = { sender: {} };

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerDataTransferHandlers();

    // Default success window
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({} as any);
  });

  describe('Export Workspace', () => {
    it('should export successfully', async () => {
      vi.mocked(exportService.exportWorkspace).mockResolvedValue({ data: { workspace: { name: 'W' } } } as any);
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({ filePath: '/path/file.json', canceled: false });
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const res = await handlers[IPC_CHANNELS.DATA_EXPORT](mockEvent, 'w1');

      expect(exportService.exportWorkspace).toHaveBeenCalledWith('w1');
      expect(dialog.showSaveDialog).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith('/path/file.json', expect.any(String), 'utf-8');
      expect(res).toEqual({ success: true });
    });

    it('should handle cancel', async () => {
      vi.mocked(exportService.exportWorkspace).mockResolvedValue({ data: { workspace: { name: 'W' } } } as any);
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: true });

      const res = await handlers[IPC_CHANNELS.DATA_EXPORT](mockEvent, 'w1');
      expect(res).toEqual({ success: false, error: 'Cancelled' });
    });

    it('should handle error', async () => {
      vi.mocked(exportService.exportWorkspace).mockRejectedValue(new Error('Export Fail'));
      const res = await handlers[IPC_CHANNELS.DATA_EXPORT](mockEvent, 'w1');
      expect(res.success).toBe(false);
    });

    it('should handle missing window', async () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null);
      const res = await handlers[IPC_CHANNELS.DATA_EXPORT](mockEvent, 'w1');
      expect(res).toEqual({ success: false, error: 'No window found' });
    });
  });

  describe('Import Workspace', () => {
    it('should import successfully', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({ filePaths: ['/f.json'], canceled: false });
      vi.mocked(fs.readFile).mockResolvedValue('{}');
      vi.mocked(importService.importWorkspace).mockResolvedValue({ _id: 'w1' } as any);

      const res = await handlers[IPC_CHANNELS.DATA_IMPORT](mockEvent);

      expect(dialog.showOpenDialog).toHaveBeenCalled();
      expect(fs.readFile).toHaveBeenCalledWith('/f.json', 'utf-8');
      expect(importService.importWorkspace).toHaveBeenCalledWith({});
      expect(res).toEqual({ success: true, data: { _id: 'w1' } });
    });

    it('should handle cancel', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({ canceled: true, filePaths: [] });
      const res = await handlers[IPC_CHANNELS.DATA_IMPORT](mockEvent);
      expect(res).toEqual({ success: false, error: 'Cancelled' });
    });

    it('should handle missing window', async () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null);
      const res = await handlers[IPC_CHANNELS.DATA_IMPORT](mockEvent);
      expect(res).toEqual({ success: false, error: 'No window found' });
    });

    it('should handle parse error', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({ filePaths: ['/f.json'], canceled: false });
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');

      const res = await handlers[IPC_CHANNELS.DATA_IMPORT](mockEvent);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('Import Postman Collection', () => {
    const validPostmanCollection = {
      info: {
        name: 'My API',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
    };

    it('should import Postman collection successfully', async () => {
      const mockWorkspace = { _id: 'ws_1', name: 'My API' };
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        filePaths: ['/collection.json'],
        canceled: false,
      });
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(validPostmanCollection));
      vi.mocked(PostmanImportService.isPostmanCollection).mockReturnValue(true);
      vi.mocked(PostmanImportService.importCollection).mockResolvedValue(mockWorkspace as any);

      const res = await handlers[IPC_CHANNELS.IMPORT_POSTMAN](mockEvent);

      expect(dialog.showOpenDialog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'Import Postman Collection',
          filters: [{ name: 'JSON Files', extensions: ['json'] }],
        })
      );
      expect(PostmanImportService.isPostmanCollection).toHaveBeenCalledWith(validPostmanCollection);
      expect(PostmanImportService.importCollection).toHaveBeenCalledWith(validPostmanCollection);
      expect(res).toEqual({ success: true, data: mockWorkspace });
    });

    it('should handle cancel', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({ canceled: true, filePaths: [] });

      const res = await handlers[IPC_CHANNELS.IMPORT_POSTMAN](mockEvent);

      expect(res).toEqual({ success: false, error: 'Cancelled' });
      expect(PostmanImportService.importCollection).not.toHaveBeenCalled();
    });

    it('should reject invalid Postman collection', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        filePaths: ['/invalid.json'],
        canceled: false,
      });
      vi.mocked(fs.readFile).mockResolvedValue('{"not": "postman"}');
      vi.mocked(PostmanImportService.isPostmanCollection).mockReturnValue(false);

      const res = await handlers[IPC_CHANNELS.IMPORT_POSTMAN](mockEvent);

      expect(res).toEqual({
        success: false,
        error: 'Invalid Postman collection. Please export as Collection v2.1 format.',
      });
      expect(PostmanImportService.importCollection).not.toHaveBeenCalled();
    });

    it('should handle missing window', async () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null);

      const res = await handlers[IPC_CHANNELS.IMPORT_POSTMAN](mockEvent);

      expect(res).toEqual({ success: false, error: 'No window found' });
    });

    it('should handle import error', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        filePaths: ['/collection.json'],
        canceled: false,
      });
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(validPostmanCollection));
      vi.mocked(PostmanImportService.isPostmanCollection).mockReturnValue(true);
      vi.mocked(PostmanImportService.importCollection).mockRejectedValue(new Error('Import failed'));

      const res = await handlers[IPC_CHANNELS.IMPORT_POSTMAN](mockEvent);

      expect(res).toEqual({ success: false, error: 'Import failed' });
    });

    it('should handle JSON parse error', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        filePaths: ['/bad.json'],
        canceled: false,
      });
      vi.mocked(fs.readFile).mockResolvedValue('not valid json {{{');

      const res = await handlers[IPC_CHANNELS.IMPORT_POSTMAN](mockEvent);

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('Import cURL Command', () => {
    const mockParsedCurl = {
      url: 'https://api.example.com/users',
      method: 'GET' as const,
      headers: [{ name: 'Accept', value: 'application/json', enabled: true }],
      body: { type: 'none' as const },
      authentication: { type: 'none' as const },
    };

    const mockRequest = {
      _id: 'req_1',
      type: 'Request',
      name: 'Users',
      url: 'https://api.example.com/users',
      method: 'GET',
      parentId: 'ws_1',
      sortOrder: 0,
      headers: [{ name: 'Accept', value: 'application/json', enabled: true }],
      body: { type: 'none' },
      authentication: { type: 'none' },
      created: Date.now(),
      modified: Date.now(),
    };

    it('should import cURL command successfully', async () => {
      const curlCommand = 'curl -H "Accept: application/json" https://api.example.com/users';
      vi.mocked(CurlImportService.parse).mockReturnValue(mockParsedCurl);
      vi.mocked(CurlImportService.generateRequestName).mockReturnValue('Users');
      vi.mocked(models.createRequest).mockResolvedValue(mockRequest as any);

      const res = await handlers[IPC_CHANNELS.IMPORT_CURL](mockEvent, curlCommand, 'ws_1');

      expect(CurlImportService.parse).toHaveBeenCalledWith(curlCommand);
      expect(CurlImportService.generateRequestName).toHaveBeenCalledWith('https://api.example.com/users');
      expect(models.createRequest).toHaveBeenCalledWith({
        name: 'Users',
        url: 'https://api.example.com/users',
        method: 'GET',
        parentId: 'ws_1',
        sortOrder: 0,
        headers: mockParsedCurl.headers,
        body: mockParsedCurl.body,
        authentication: mockParsedCurl.authentication,
      });
      expect(res).toEqual({ success: true, data: mockRequest });
    });

    it('should handle parse error', async () => {
      vi.mocked(CurlImportService.parse).mockImplementation(() => {
        throw new Error('Invalid cURL command: must start with "curl"');
      });

      const res = await handlers[IPC_CHANNELS.IMPORT_CURL](mockEvent, 'wget https://example.com', 'ws_1');

      expect(res).toEqual({
        success: false,
        error: 'Invalid cURL command: must start with "curl"',
      });
      expect(models.createRequest).not.toHaveBeenCalled();
    });

    it('should handle database error', async () => {
      vi.mocked(CurlImportService.parse).mockReturnValue(mockParsedCurl);
      vi.mocked(CurlImportService.generateRequestName).mockReturnValue('Users');
      vi.mocked(models.createRequest).mockRejectedValue(new Error('Database error'));

      const res = await handlers[IPC_CHANNELS.IMPORT_CURL](mockEvent, 'curl https://api.example.com', 'ws_1');

      expect(res).toEqual({ success: false, error: 'Database error' });
    });

    it('should import POST request with JSON body', async () => {
      const postCurl = {
        url: 'https://api.example.com/users',
        method: 'POST' as const,
        headers: [{ name: 'Content-Type', value: 'application/json', enabled: true }],
        body: { type: 'json' as const, text: '{"name": "John"}' },
        authentication: { type: 'none' as const },
      };

      vi.mocked(CurlImportService.parse).mockReturnValue(postCurl);
      vi.mocked(CurlImportService.generateRequestName).mockReturnValue('Users');
      vi.mocked(models.createRequest).mockResolvedValue({ ...mockRequest, method: 'POST' } as any);

      const res = await handlers[IPC_CHANNELS.IMPORT_CURL](
        mockEvent,
        'curl -X POST -d \'{"name": "John"}\' https://api.example.com/users',
        'ws_1'
      );

      expect(res.success).toBe(true);
      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          body: { type: 'json', text: '{"name": "John"}' },
        })
      );
    });

    it('should import request with basic authentication', async () => {
      const authCurl = {
        url: 'https://api.example.com',
        method: 'GET' as const,
        headers: [],
        body: { type: 'none' as const },
        authentication: { type: 'basic' as const, username: 'admin', password: 'secret' },
      };

      vi.mocked(CurlImportService.parse).mockReturnValue(authCurl);
      vi.mocked(CurlImportService.generateRequestName).mockReturnValue('api.example.com');
      vi.mocked(models.createRequest).mockResolvedValue(mockRequest as any);

      const res = await handlers[IPC_CHANNELS.IMPORT_CURL](
        mockEvent,
        'curl -u admin:secret https://api.example.com',
        'ws_1'
      );

      expect(res.success).toBe(true);
      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          authentication: { type: 'basic', username: 'admin', password: 'secret' },
        })
      );
    });

    it('should use parentId correctly for folder or workspace', async () => {
      vi.mocked(CurlImportService.parse).mockReturnValue(mockParsedCurl);
      vi.mocked(CurlImportService.generateRequestName).mockReturnValue('Users');
      vi.mocked(models.createRequest).mockResolvedValue(mockRequest as any);

      // Test with folder parent
      await handlers[IPC_CHANNELS.IMPORT_CURL](mockEvent, 'curl https://api.example.com', 'folder_123');

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'folder_123',
        })
      );
    });
  });
});
