// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerVariableHandlers } from './variable';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import * as models from '../database/models';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('../database/models');

describe('Variable IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerVariableHandlers();
  });

  it('create should success', async () => {
    const v = { _id: 'v1' };
    vi.mocked(models.createVariable).mockResolvedValue(v as any);
    const res = await handlers[IPC_CHANNELS.VARIABLE_CREATE](null, { key: 'K' });
    expect(res).toEqual({ success: true, data: v });
  });

  it('update should success', async () => {
    const v = { _id: 'v1', value: 'V' };
    vi.mocked(models.updateVariable).mockResolvedValue(v as any);
    const res = await handlers[IPC_CHANNELS.VARIABLE_UPDATE](null, 'v1', { value: 'V' });
    expect(res).toEqual({ success: true, data: v });
  });

  it('delete should success', async () => {
    vi.mocked(models.deleteVariable).mockResolvedValue(undefined);
    const res = await handlers[IPC_CHANNELS.VARIABLE_DELETE](null, 'v1');
    expect(res).toEqual({ success: true });
  });

  it('getByEnvironment should success', async () => {
    const list = [{ _id: 'v1' }];
    vi.mocked(models.getVariablesByEnvironment).mockResolvedValue(list as any);
    const res = await handlers[IPC_CHANNELS.VARIABLE_GET_BY_ENVIRONMENT](null, 'e1');
    expect(res).toEqual({ success: true, data: list });
  });
});
