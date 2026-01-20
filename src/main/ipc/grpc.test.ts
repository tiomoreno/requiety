// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerGrpcHandlers } from './grpc';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { GrpcService } from '../services/grpc.service';
import { ipcMain, dialog } from 'electron';

// Mock dependencies
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('../services/grpc.service');

describe('gRPC IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerGrpcHandlers();
  });

  describe('Handler Registration', () => {
    it('should register the select proto file handler', () => {
      expect(handlers[IPC_CHANNELS.GRPC_SELECT_PROTO_FILE]).toBeDefined();
    });

    it('should register the parse proto handler', () => {
      expect(handlers[IPC_CHANNELS.GRPC_PARSE_PROTO]).toBeDefined();
    });
  });

  describe('GRPC_SELECT_PROTO_FILE', () => {
    it('should return selected file path when user selects a file', async () => {
      const filePath = '/path/to/service.proto';
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: [filePath],
      });

      const result = await handlers[IPC_CHANNELS.GRPC_SELECT_PROTO_FILE](null);

      expect(dialog.showOpenDialog).toHaveBeenCalledWith({
        properties: ['openFile'],
        filters: [{ name: 'Protocol Buffers', extensions: ['proto'] }],
      });
      expect(result).toEqual({ success: true, data: filePath });
    });

    it('should return null when user cancels file selection', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const result = await handlers[IPC_CHANNELS.GRPC_SELECT_PROTO_FILE](null);

      expect(result).toEqual({ success: true, data: null });
    });

    it('should return null when no file is selected', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: [],
      });

      const result = await handlers[IPC_CHANNELS.GRPC_SELECT_PROTO_FILE](null);

      expect(result).toEqual({ success: true, data: null });
    });

    it('should handle dialog error', async () => {
      const errorMessage = 'Dialog failed to open';
      vi.mocked(dialog.showOpenDialog).mockRejectedValue(new Error(errorMessage));

      const result = await handlers[IPC_CHANNELS.GRPC_SELECT_PROTO_FILE](null);

      expect(result).toEqual({ success: false, error: errorMessage });
    });

    it('should handle non-Error thrown objects', async () => {
      vi.mocked(dialog.showOpenDialog).mockRejectedValue('Unexpected error');

      const result = await handlers[IPC_CHANNELS.GRPC_SELECT_PROTO_FILE](null);

      expect(result).toEqual({ success: false, error: 'Unexpected error' });
    });
  });

  describe('GRPC_PARSE_PROTO', () => {
    it('should successfully parse a proto file', async () => {
      const filePath = '/path/to/service.proto';
      const parsedData = {
        services: [
          {
            name: 'mypackage.MyService',
            methods: ['GetUser', 'CreateUser', 'UpdateUser'],
          },
          {
            name: 'mypackage.AnotherService',
            methods: ['DoSomething'],
          },
        ],
      };

      vi.mocked(GrpcService.parseProtoFile).mockResolvedValue(parsedData);

      const result = await handlers[IPC_CHANNELS.GRPC_PARSE_PROTO](null, filePath);

      expect(GrpcService.parseProtoFile).toHaveBeenCalledWith(filePath);
      expect(result).toEqual({ success: true, data: parsedData });
    });

    it('should handle parse error for invalid proto file', async () => {
      const filePath = '/path/to/invalid.proto';
      const errorMessage = 'Proto file parse error: syntax error';

      vi.mocked(GrpcService.parseProtoFile).mockRejectedValue(new Error(errorMessage));

      const result = await handlers[IPC_CHANNELS.GRPC_PARSE_PROTO](null, filePath);

      expect(GrpcService.parseProtoFile).toHaveBeenCalledWith(filePath);
      expect(result).toEqual({ success: false, error: errorMessage });
    });

    it('should handle file not found error', async () => {
      const filePath = '/path/to/nonexistent.proto';
      const errorMessage = 'ENOENT: no such file or directory';

      vi.mocked(GrpcService.parseProtoFile).mockRejectedValue(new Error(errorMessage));

      const result = await handlers[IPC_CHANNELS.GRPC_PARSE_PROTO](null, filePath);

      expect(result).toEqual({ success: false, error: errorMessage });
    });

    it('should handle non-Error thrown objects', async () => {
      const filePath = '/path/to/service.proto';

      vi.mocked(GrpcService.parseProtoFile).mockRejectedValue('Parse failed');

      const result = await handlers[IPC_CHANNELS.GRPC_PARSE_PROTO](null, filePath);

      expect(result).toEqual({ success: false, error: 'Parse failed' });
    });

    it('should return empty services array for proto without services', async () => {
      const filePath = '/path/to/messages-only.proto';
      const parsedData = {
        services: [],
      };

      vi.mocked(GrpcService.parseProtoFile).mockResolvedValue(parsedData);

      const result = await handlers[IPC_CHANNELS.GRPC_PARSE_PROTO](null, filePath);

      expect(result).toEqual({ success: true, data: parsedData });
    });
  });
});
