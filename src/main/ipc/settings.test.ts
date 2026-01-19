// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSettingsHandlers } from './settings';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import * as models from '../database/models';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('../database/models');

describe('Settings IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerSettingsHandlers();
  });

  it('get should success', async () => {
    const s = { theme: 'dark' };
    vi.mocked(models.getSettings).mockResolvedValue(s as any);
    const res = await handlers[IPC_CHANNELS.SETTINGS_GET](null);
    expect(res).toEqual({ success: true, data: s });
  });

  it('update should success', async () => {
    const s = { theme: 'light' };
    vi.mocked(models.updateSettings).mockResolvedValue(s as any);
    const res = await handlers[IPC_CHANNELS.SETTINGS_UPDATE](null, { theme: 'light' });
    expect(res).toEqual({ success: true, data: s });
  });

  it('get should handle error', async () => {
    vi.mocked(models.getSettings).mockRejectedValue(new Error('Fail'));
    const res = await handlers[IPC_CHANNELS.SETTINGS_GET](null);
    expect(res.success).toBe(false);
  });
});
