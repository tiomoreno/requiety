// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDataTransferHandlers } from './data-transfer';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { exportService } from '../services/export.service';
import { importService } from '../services/import.service';
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

  it('export should success', async () => {
      vi.mocked(exportService.exportWorkspace).mockResolvedValue({ data: { workspace: { name: 'W' } } } as any);
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({ filePath: '/path/file.json', canceled: false });
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const res = await handlers[IPC_CHANNELS.DATA_EXPORT](mockEvent, 'w1');
      
      expect(exportService.exportWorkspace).toHaveBeenCalledWith('w1');
      expect(dialog.showSaveDialog).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith('/path/file.json', expect.any(String), 'utf-8');
      expect(res).toEqual({ success: true });
  });

  it('export should handle cancel', async () => {
      vi.mocked(exportService.exportWorkspace).mockResolvedValue({ data: { workspace: { name: 'W' } } } as any);
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: true });
      
      const res = await handlers[IPC_CHANNELS.DATA_EXPORT](mockEvent, 'w1');
      expect(res).toEqual({ success: false, error: 'Cancelled' });
  });

  it('export should handle error', async () => {
      vi.mocked(exportService.exportWorkspace).mockRejectedValue(new Error('Export Fail'));
      const res = await handlers[IPC_CHANNELS.DATA_EXPORT](mockEvent, 'w1');
      expect(res.success).toBe(false);
  });

  it('import should success', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({ filePaths: ['/f.json'], canceled: false });
      vi.mocked(fs.readFile).mockResolvedValue('{}');
      vi.mocked(importService.importWorkspace).mockResolvedValue({ _id: 'w1' } as any);

      const res = await handlers[IPC_CHANNELS.DATA_IMPORT](mockEvent);
      
      expect(dialog.showOpenDialog).toHaveBeenCalled();
      expect(fs.readFile).toHaveBeenCalledWith('/f.json', 'utf-8');
      expect(importService.importWorkspace).toHaveBeenCalledWith({});
      expect(res).toEqual({ success: true, data: { _id: 'w1' } });
  });

  it('import should handle cancel', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({ canceled: true, filePaths: [] });
      const res = await handlers[IPC_CHANNELS.DATA_IMPORT](mockEvent);
      expect(res).toEqual({ success: false, error: 'Cancelled' });
  });
});
