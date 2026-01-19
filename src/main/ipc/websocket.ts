import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { WebSocketService } from '../services/websocket.service';
import { LoggerService } from '../services/logger.service';

export function registerWebSocketHandlers() {
  ipcMain.on(IPC_CHANNELS.WS_CONNECT, (event, { requestId, url }) => {
    WebSocketService.connect(requestId, url);
  });

  ipcMain.on(IPC_CHANNELS.WS_DISCONNECT, (event, { requestId }) => {
    WebSocketService.disconnect(requestId);
  });

  ipcMain.on(IPC_CHANNELS.WS_SEND, (event, { requestId, message }) => {
    try {
      WebSocketService.send(requestId, message);
    } catch (error) {
      LoggerService.error('Failed to send WS message:', error);
    }
  });
}
