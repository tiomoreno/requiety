// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerRunnerHandlers } from './runner';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { RunnerService } from '../services/runner.service';
import { ipcMain, BrowserWindow } from 'electron';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  BrowserWindow: { fromWebContents: vi.fn(), getAllWindows: vi.fn() },
}));

vi.mock('../services/runner.service');

describe('Runner IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};
  const mockEvent = { sender: {} };

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerRunnerHandlers();

    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({} as any);
  });

  it('start should success', async () => {
    vi.mocked(RunnerService.startRun).mockResolvedValue({ status: 'completed' } as any);

    const res = await handlers[IPC_CHANNELS.RUNNER_START](mockEvent, {
      targetId: 't1',
      type: 'folder',
    });

    expect(RunnerService.startRun).toHaveBeenCalledWith(expect.anything(), 't1', 'folder');
    expect(res).toEqual({ success: true, data: { status: 'completed' } });
  });

  it('start should handle error', async () => {
    vi.mocked(RunnerService.startRun).mockRejectedValue(new Error('Fail'));
    const res = await handlers[IPC_CHANNELS.RUNNER_START](mockEvent, { targetId: 't1' });
    expect(res.success).toBe(false);
  });

  it('stop should success', async () => {
    const res = await handlers[IPC_CHANNELS.RUNNER_STOP](mockEvent);
    expect(RunnerService.stopRun).toHaveBeenCalled();
    expect(res).toEqual({ success: true });
  });

  it('stop should handle error', async () => {
    vi.mocked(RunnerService.stopRun).mockImplementation(() => {
      throw new Error('Fail');
    });
    const res = await handlers[IPC_CHANNELS.RUNNER_STOP](mockEvent);
    expect(res.success).toBe(false);
  });
});
