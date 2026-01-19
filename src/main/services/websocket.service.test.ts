// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService } from './websocket.service';
import { IPC_CHANNELS } from '@shared/ipc-channels';

// Define proper event handler types
type WebSocketEventHandler = (...args: unknown[]) => void;
type EventHandlersMap = Record<string, WebSocketEventHandler>;

// Use vi.hoisted for mock state
const { mockWsInstance, getEventHandlers } = vi.hoisted(() => {
  let eventHandlers: EventHandlersMap = {};

  const mockWsInstance = {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1, // OPEN
  };

  // Function to get current handlers (for test assertions)
  const getEventHandlers = () => eventHandlers;

  // Reset function
  const resetHandlers = () => {
    eventHandlers = {};
  };

  return { mockWsInstance, getEventHandlers, resetHandlers };
});

// Mock WebSocket as a class that properly registers handlers
vi.mock('ws', () => {
  return {
    default: class MockWebSocket {
      static OPEN = 1;
      static CLOSED = 3;

      send = mockWsInstance.send;
      close = mockWsInstance.close;
      readyState = mockWsInstance.readyState;

      private handlers: EventHandlersMap = {};

      constructor(_url: string) {
        // Store reference to handlers in the shared object
        const sharedHandlers = getEventHandlers();
        // Clear previous handlers
        Object.keys(sharedHandlers).forEach((key) => delete sharedHandlers[key]);
        // Use shared handlers
        this.handlers = sharedHandlers;
      }

      on(event: string, handler: WebSocketEventHandler) {
        this.handlers[event] = handler;
        return this;
      }
    },
    WebSocket: class MockWebSocket {
      static OPEN = 1;
      static CLOSED = 3;

      send = mockWsInstance.send;
      close = mockWsInstance.close;
      readyState = mockWsInstance.readyState;

      private handlers: EventHandlersMap = {};

      constructor(_url: string) {
        const sharedHandlers = getEventHandlers();
        Object.keys(sharedHandlers).forEach((key) => delete sharedHandlers[key]);
        this.handlers = sharedHandlers;
      }

      on(event: string, handler: WebSocketEventHandler) {
        this.handlers[event] = handler;
        return this;
      }
    },
  };
});

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

describe('WebSocketService', () => {
  let mockWindow: {
    webContents: { send: ReturnType<typeof vi.fn> };
    isDestroyed: ReturnType<typeof vi.fn>;
  };
  const requestId = 'req1';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset event handlers
    const handlers = getEventHandlers();
    Object.keys(handlers).forEach((key) => delete handlers[key]);

    mockWindow = {
      webContents: { send: vi.fn() },
      isDestroyed: vi.fn().mockReturnValue(false),
    };
    WebSocketService.setWindow(mockWindow as unknown as Electron.BrowserWindow);
    mockWsInstance.readyState = 1; // OPEN
  });

  afterEach(() => {
    try {
      WebSocketService.disconnect(requestId);
    } catch {
      // Ignore if not connected
    }
  });

  it('should connect and handle open event', () => {
    WebSocketService.connect(requestId, 'ws://test.com');

    const handlers = getEventHandlers();
    expect(handlers['open']).toBeDefined();
    handlers['open']();

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.WS_EVENT,
      expect.objectContaining({ type: 'status', data: 'connected' })
    );
  });

  it('should handle incoming messages', () => {
    WebSocketService.connect(requestId, 'ws://test.com');

    const handlers = getEventHandlers();
    expect(handlers['message']).toBeDefined();
    handlers['message']('hello');

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.WS_EVENT,
      expect.objectContaining({ type: 'incoming', data: 'hello' })
    );
  });

  it('should handle errors', () => {
    WebSocketService.connect(requestId, 'ws://test.com');

    const handlers = getEventHandlers();
    expect(handlers['error']).toBeDefined();
    handlers['error'](new Error('fail'));

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.WS_EVENT,
      expect.objectContaining({ type: 'error', data: 'fail' })
    );
  });

  it('should handle close', () => {
    WebSocketService.connect(requestId, 'ws://test.com');

    const handlers = getEventHandlers();
    expect(handlers['close']).toBeDefined();
    handlers['close'](1000, 'normal');

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.WS_EVENT,
      expect.objectContaining({ type: 'status', data: 'disconnected' })
    );
  });

  it('should send message if connected', () => {
    WebSocketService.connect(requestId, 'ws://test.com');

    WebSocketService.send(requestId, 'ping');

    expect(mockWsInstance.send).toHaveBeenCalledWith('ping');
    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.WS_EVENT,
      expect.objectContaining({ type: 'outgoing', data: 'ping' })
    );
  });

  it('should throw if sending when not connected', () => {
    expect(() => WebSocketService.send('unknown', 'msg')).toThrow('WebSocket is not connected');
  });

  it('should disconnect', () => {
    WebSocketService.connect(requestId, 'ws://test.com');
    WebSocketService.disconnect(requestId);

    expect(mockWsInstance.close).toHaveBeenCalled();
  });
});
