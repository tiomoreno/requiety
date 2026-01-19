import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerMockHandlers } from './mock';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { mockService } from '../services/mock.service';
import * as dbModels from '../database/models';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('../services/mock.service', () => ({
  mockService: {
    start: vi.fn(),
    stop: vi.fn(),
    getStatus: vi.fn(),
    getLogs: vi.fn(),
    clearLogs: vi.fn(),
  },
}));

vi.mock('../database/models', () => ({
  createMockRoute: vi.fn(),
  deleteMockRoute: vi.fn(),
  getMockRoutesByWorkspace: vi.fn(),
  updateMockRoute: vi.fn(),
}));

describe('Mock IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerMockHandlers();
  });

  const getHandler = (channel: string) => {
    const call = vi.mocked(ipcMain.handle).mock.calls.find((c) => c[0] === channel);
    return call ? call[1] : null;
  };

  it('MOCK_SERVER_START', async () => {
    const handler = getHandler(IPC_CHANNELS.MOCK_SERVER_START);
    vi.mocked(mockService.getStatus).mockReturnValue({ isRunning: true, port: 3030 });

    const result = await handler({} as any, { workspaceId: 'w1', port: 3030 });

    expect(mockService.start).toHaveBeenCalledWith('w1', 3030);
    expect(result).toEqual({ success: true, data: { isRunning: true, port: 3030 } });
  });

  it('MOCK_SERVER_STOP', async () => {
    const handler = getHandler(IPC_CHANNELS.MOCK_SERVER_STOP);
    vi.mocked(mockService.getStatus).mockReturnValue({ isRunning: false, port: 3030 });

    const result = await handler({} as any);

    expect(mockService.stop).toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: { isRunning: false, port: 3030 } });
  });

  it('MOCK_ROUTE_GET_BY_WORKSPACE', async () => {
    const handler = getHandler(IPC_CHANNELS.MOCK_ROUTE_GET_BY_WORKSPACE);
    const routes = [{ id: 'r1' }];
    vi.mocked(dbModels.getMockRoutesByWorkspace).mockResolvedValue(routes as any);

    const result = await handler({} as any, 'w1');
    expect(result).toEqual({ success: true, data: routes });
  });

  it('MOCK_ROUTE_CREATE', async () => {
    const handler = getHandler(IPC_CHANNELS.MOCK_ROUTE_CREATE);
    const newRoute = { id: 'r1', workspaceId: 'w1' };
    vi.mocked(dbModels.createMockRoute).mockResolvedValue(newRoute as any);

    const result = await handler({} as any, { workspaceId: 'w1', path: '/test' });

    expect(dbModels.createMockRoute).toHaveBeenCalledWith({ workspaceId: 'w1', path: '/test' });
    // Should restart server to apply changes
    expect(mockService.start).toHaveBeenCalledWith('w1');
    expect(result).toEqual({ success: true, data: newRoute });
  });

  it('MOCK_ROUTE_UPDATE', async () => {
    const handler = getHandler(IPC_CHANNELS.MOCK_ROUTE_UPDATE);
    const updatedRoute = { id: 'r1', workspaceId: 'w1' };
    vi.mocked(dbModels.updateMockRoute).mockResolvedValue(updatedRoute as any);

    const result = await handler({} as any, { id: 'r1', data: { enabled: true } });

    expect(dbModels.updateMockRoute).toHaveBeenCalledWith('r1', { enabled: true });
    expect(mockService.start).toHaveBeenCalledWith('w1');
    expect(result).toEqual({ success: true, data: updatedRoute });
  });

  it('MOCK_ROUTE_DELETE', async () => {
    const handler = getHandler(IPC_CHANNELS.MOCK_ROUTE_DELETE);

    const result = await handler({} as any, { id: 'r1', workspaceId: 'w1' });

    expect(dbModels.deleteMockRoute).toHaveBeenCalledWith('r1');
    expect(mockService.start).toHaveBeenCalledWith('w1');
    expect(result).toEqual({ success: true });
  });
});
