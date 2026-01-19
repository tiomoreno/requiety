// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerEnvironmentHandlers } from './environment';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import * as models from '../database/models';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('../database/models');

describe('Environment IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerEnvironmentHandlers();
  });

  it('create should success', async () => {
    const env = { _id: 'e1' };
    vi.mocked(models.createEnvironment).mockResolvedValue(env as any);
    const res = await handlers[IPC_CHANNELS.ENVIRONMENT_CREATE](null, { name: 'E' });
    expect(res).toEqual({ success: true, data: env });
  });

  it('update should success', async () => {
    const env = { _id: 'e1', name: 'Up' };
    vi.mocked(models.updateEnvironment).mockResolvedValue(env as any);
    const res = await handlers[IPC_CHANNELS.ENVIRONMENT_UPDATE](null, 'e1', { name: 'Up' });
    expect(res).toEqual({ success: true, data: env });
  });

  it('delete should success', async () => {
    vi.mocked(models.deleteEnvironment).mockResolvedValue(undefined);
    const res = await handlers[IPC_CHANNELS.ENVIRONMENT_DELETE](null, 'e1');
    expect(res).toEqual({ success: true });
  });

  it('activate should success', async () => {
    vi.mocked(models.activateEnvironment).mockResolvedValue(undefined);
    const res = await handlers[IPC_CHANNELS.ENVIRONMENT_ACTIVATE](null, 'e1');
    expect(res).toEqual({ success: true });
  });

  it('getByWorkspace should success', async () => {
    const list = [{ _id: 'e1' }];
    vi.mocked(models.getEnvironmentsByWorkspace).mockResolvedValue(list as any);
    const res = await handlers[IPC_CHANNELS.ENVIRONMENT_GET_BY_WORKSPACE](null, 'w1');
    expect(res).toEqual({ success: true, data: list });
  });
});
