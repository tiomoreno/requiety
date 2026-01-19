// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerWebSocketHandlers } from './websocket';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { WebSocketService } from '../services/websocket.service';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../services/websocket.service');

describe('WebSocket IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.on).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerWebSocketHandlers();
  });

  it('should register connect', () => {
    expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.WS_CONNECT, expect.any(Function));

    handlers[IPC_CHANNELS.WS_CONNECT](null, { requestId: 'r1', url: 'u' });
    expect(WebSocketService.connect).toHaveBeenCalledWith('r1', 'u');
  });

  it('should register disconnect', () => {
    expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.WS_DISCONNECT, expect.any(Function));

    handlers[IPC_CHANNELS.WS_DISCONNECT](null, { requestId: 'r1' });
    expect(WebSocketService.disconnect).toHaveBeenCalledWith('r1');
  });

  it('should register send', () => {
    expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.WS_SEND, expect.any(Function));

    handlers[IPC_CHANNELS.WS_SEND](null, { requestId: 'r1', message: 'm' });
    expect(WebSocketService.send).toHaveBeenCalledWith('r1', 'm');
  });

  it('send should handle error', () => {
    vi.mocked(WebSocketService.send).mockImplementation(() => {
      throw new Error('Fail');
    });
    expect(() =>
      handlers[IPC_CHANNELS.WS_SEND](null, { requestId: 'r1', message: 'm' })
    ).not.toThrow();
  });
});
