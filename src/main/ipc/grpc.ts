import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { GrpcService } from '../services/grpc.service';

export const registerGrpcHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.GRPC_SELECT_PROTO_FILE, async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Protocol Buffers', extensions: ['proto'] }],
      });
      if (canceled || filePaths.length === 0) {
        return { success: true, data: null };
      }
      return { success: true, data: filePaths[0] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GRPC_PARSE_PROTO, async (_, filePath: string) => {
    try {
      const parsedData = await GrpcService.parseProtoFile(filePath);
      return { success: true, data: parsedData };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
};
