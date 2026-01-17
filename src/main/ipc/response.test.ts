// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerResponseHandlers } from './response';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import * as models from '../database/models';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

vi.mock('../database/models');
vi.mock('../utils/file-manager', () => ({
  readResponseBody: vi.fn().mockResolvedValue('{}')
}));

describe('Response IPC Handlers', () => {
  let handlers: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerResponseHandlers();
  });

  it('getHistory should success', async () => {
    const list = [{ _id: 'r1' }];
    vi.mocked(models.getResponseHistory).mockResolvedValue(list as any);
    const res = await handlers[IPC_CHANNELS.RESPONSE_GET_HISTORY](null, 'req1', 20);
    expect(res).toEqual({ success: true, data: list });
  });

  it('getById should success', async () => {
    const resObj = { _id: 'r1' };
    vi.mocked(models.getResponseById).mockResolvedValue(resObj as any);
    // Assuming getResponseById returns the response object with body loaded or separate?
    // Let's check model... usually it reads file.
    // Ideally mock return.
    const result = await handlers[IPC_CHANNELS.RESPONSE_GET_BY_ID](null, 'r1');
    expect(result).toEqual({ success: true, data: { response: resObj, body: '{}' } });
  });

  it('deleteHistory should success', async () => {
    vi.mocked(models.deleteResponseHistory).mockResolvedValue(undefined);
    const res = await handlers[IPC_CHANNELS.RESPONSE_DELETE_HISTORY](null, 'req1');
    expect(res).toEqual({ success: true });
  });

  it('getHistory should handle error', async () => {
      vi.mocked(models.getResponseHistory).mockRejectedValue(new Error('Fail'));
      const res = await handlers[IPC_CHANNELS.RESPONSE_GET_HISTORY](null, 'req1');
      expect(res.success).toBe(false);
  });
});
