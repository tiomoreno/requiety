// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDataTransferHandlers } from './data-transfer';
import { CurlParser, type ParsedCurlCommand } from '../utils/parsers/curl.parser';
import * as models from '../database/models';
import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';

// Mock dependencies
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: { showSaveDialog: vi.fn(), showOpenDialog: vi.fn() },
  BrowserWindow: { fromWebContents: vi.fn() },
}));

vi.mock('../services/export.service');
vi.mock('../services/import.service');
vi.mock('../services/postman-import.service');
vi.mock('../utils/parsers/curl.parser'); // Mock Parser instead of Service
vi.mock('../database/models');
vi.mock('fs/promises');

describe('Data Transfer IPC Handlers', () => {
  const mockWindow = { webContents: { id: 1 } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(mockWindow as BrowserWindow);
  });

  // ... (Export tests omitted for brevity, keeping only Import cURL tests related to change)

  describe('Import cURL Command', () => {
    const getHandler = () => {
      registerDataTransferHandlers();
      const call = vi
        .mocked(ipcMain.handle)
        .mock.calls.find((c) => c[0] === IPC_CHANNELS.IMPORT_CURL);
      return call ? call[1] : null;
    };

    it('should handle parse error', async () => {
      const handler = getHandler();
      if (!handler) throw new Error('Handler not found');
      vi.mocked(CurlParser.parse).mockImplementation(() => {
        throw new Error('Invalid cURL command: must start with "curl"');
      });

      const result = await handler({} as IpcMainInvokeEvent, 'invalid', 'ws_1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid cURL');
    });

    it('should create request from cURL', async () => {
      const handler = getHandler();
      if (!handler) throw new Error('Handler not found');
      const mockParsed = {
        url: 'https://api.example.com',
        method: 'GET',
        headers: [],
        body: { type: 'none' },
        authentication: { type: 'none' },
      };

      vi.mocked(CurlParser.parse).mockReturnValue(mockParsed as ParsedCurlCommand);
      vi.mocked(CurlParser.generateRequestName).mockReturnValue('Example');
      vi.mocked(models.createRequest).mockResolvedValue({ _id: 'req_1', name: 'Example' } as any);

      const result = await handler({} as IpcMainInvokeEvent, 'curl ...', 'ws_1');

      expect(CurlParser.parse).toHaveBeenCalledWith('curl ...');
      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Example',
          url: 'https://api.example.com',
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ _id: 'req_1', name: 'Example' });
    });

    it('should handle database error', async () => {
      const handler = getHandler();
      if (!handler) throw new Error('Handler not found');
      vi.mocked(CurlParser.parse).mockReturnValue({ url: 'http://test' } as ParsedCurlCommand);
      vi.mocked(models.createRequest).mockRejectedValue(new Error('Database error'));

      const result = await handler({} as IpcMainInvokeEvent, 'curl ...', 'ws_1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
