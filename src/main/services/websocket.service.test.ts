// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService } from './websocket.service';
import WebSocket from 'ws';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

vi.mock('ws');
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  ipcMain: { handle: vi.fn(), on: vi.fn() }
}));

describe('WebSocketService', () => {
    let mockWindow: any;
    let mockWs: any;
    const requestId = 'req1';

    beforeEach(() => {
        mockWindow = {
            webContents: { send: vi.fn() },
            isDestroyed: vi.fn().mockReturnValue(false)
        };
        WebSocketService.setWindow(mockWindow);
        
        mockWs = {
            on: vi.fn(),
            send: vi.fn(),
            close: vi.fn(),
            readyState: 1 // OPEN
        };
        
        vi.mocked(WebSocket).mockImplementation(() => mockWs as any);
    });

    afterEach(() => {
        WebSocketService.disconnect(requestId);
        vi.clearAllMocks();
    });

    it('should connect and handle open event', () => {
        WebSocketService.connect(requestId, 'ws://test.com');
        
        expect(WebSocket).toHaveBeenCalledWith('ws://test.com');
        
        // Check open handler
        const openCall = mockWs.on.mock.calls.find((c: any) => c[0] === 'open');
        expect(openCall).toBeDefined();
        
        // Trigger open
        openCall[1]();
        
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.WS_EVENT,
            expect.objectContaining({ type: 'status', data: 'connected' })
        );
    });

    it('should handle incoming messages', () => {
        WebSocketService.connect(requestId, 'ws://test.com');
        const msgCall = mockWs.on.mock.calls.find((c: any) => c[0] === 'message');
        
        msgCall[1]('hello');
        
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.WS_EVENT,
            expect.objectContaining({ type: 'incoming', data: 'hello' })
        );
    });

    it('should handle errors', () => {
        WebSocketService.connect(requestId, 'ws://test.com');
        const errCall = mockWs.on.mock.calls.find((c: any) => c[0] === 'error');
        
        errCall[1](new Error('fail'));
        
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.WS_EVENT,
            expect.objectContaining({ type: 'error', data: 'fail' })
        );
    });

    it('should handle close', () => {
        WebSocketService.connect(requestId, 'ws://test.com');
        const closeCall = mockWs.on.mock.calls.find((c: any) => c[0] === 'close');
        
        closeCall[1](1000, 'normal');
        
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.WS_EVENT,
            expect.objectContaining({ type: 'status', data: 'disconnected' })
        );
    });

    it('should send message if connected', () => {
        WebSocketService.connect(requestId, 'ws://test.com');
        mockWs.readyState = 1; // OPEN
        
        WebSocketService.send(requestId, 'ping');
        
        expect(mockWs.send).toHaveBeenCalledWith('ping');
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
        
        expect(mockWs.close).toHaveBeenCalled();
    });

    it('should handle connection error (constructor throw)', () => {
        vi.mocked(WebSocket).mockImplementation(() => { throw new Error('Init failed'); });
        
        WebSocketService.connect(requestId, 'ws://bad');
        
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.WS_EVENT,
            expect.objectContaining({ type: 'error', data: 'Init failed' })
        );
    });
});
