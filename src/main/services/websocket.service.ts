import { WebSocket } from 'ws';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import crypto from 'crypto';

interface ActiveConnection {
  ws: WebSocket;
  requestId: string;
}

interface WebSocketPayload {
  requestId: string;
  type: 'incoming' | 'outgoing' | 'info' | 'error' | 'status';
  data: string;
  timestamp: number;
  id?: string;
}

export class WebSocketService {
  private static connections: Map<string, ActiveConnection> = new Map();
  private static window: BrowserWindow | null = null;

  static setWindow(window: BrowserWindow) {
    this.window = window;
  }

  static connect(requestId: string, url: string) {
    // Close existing connection if any
    this.disconnect(requestId);

    try {
      const ws = new WebSocket(url);
      this.connections.set(requestId, { ws, requestId });

      ws.on('open', () => {
        this.sendToRenderer(requestId, 'info', 'Connected to ' + url);
        this.sendToRenderer(requestId, 'status', 'connected');
      });

      ws.on('message', (data) => {
        this.sendToRenderer(requestId, 'incoming', data.toString());
      });

      ws.on('error', (error) => {
        this.sendToRenderer(requestId, 'error', error.message);
      });

      ws.on('close', (code, reason) => {
        this.sendToRenderer(requestId, 'info', `Disconnected: ${code} - ${reason}`);
        this.sendToRenderer(requestId, 'status', 'disconnected');
        this.connections.delete(requestId);
      });
    } catch (error) {
      this.sendToRenderer(
        requestId,
        'error',
        error instanceof Error ? error.message : 'Connection failed'
      );
    }
  }

  static disconnect(requestId: string) {
    const connection = this.connections.get(requestId);
    if (connection) {
      connection.ws.close();
      this.connections.delete(requestId);
    }
  }

  static send(requestId: string, message: string) {
    const connection = this.connections.get(requestId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(message);
      this.sendToRenderer(requestId, 'outgoing', message);
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  private static sendToRenderer(
    requestId: string,
    type: 'incoming' | 'outgoing' | 'info' | 'error' | 'status',
    data: string
  ) {
    if (this.window && !this.window.isDestroyed()) {
      const payload: WebSocketPayload = { requestId, type, data, timestamp: Date.now() };
      if (type !== 'status') {
        payload.id = crypto.randomUUID();
      }
      this.window.webContents.send(IPC_CHANNELS.WS_EVENT, payload);
    }
  }
}
