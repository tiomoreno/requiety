import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { mockService } from '../services/mock.service';
import {
  createMockRoute,
  deleteMockRoute,
  getMockRoutesByWorkspace,
  updateMockRoute,
} from '../database/models';
import { MockRoute } from '@shared/types';

export const registerMockHandlers = () => {
  ipcMain.handle(
    IPC_CHANNELS.MOCK_SERVER_START,
    async (_, { workspaceId, port }: { workspaceId: string; port: number }) => {
      try {
        await mockService.start(workspaceId, port);
        return { success: true, data: mockService.getStatus() };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.MOCK_SERVER_STOP, async () => {
    try {
      await mockService.stop();
      return { success: true, data: mockService.getStatus() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MOCK_SERVER_GET_STATUS, () => {
    return { success: true, data: mockService.getStatus() };
  });

  ipcMain.handle(IPC_CHANNELS.MOCK_SERVER_GET_LOGS, () => {
    return { success: true, data: mockService.getLogs() };
  });

  ipcMain.handle(IPC_CHANNELS.MOCK_SERVER_CLEAR_LOGS, () => {
    mockService.clearLogs();
    return { success: true };
  });

  // CRUD for Mock Routes
  ipcMain.handle(IPC_CHANNELS.MOCK_ROUTE_GET_BY_WORKSPACE, async (_, workspaceId: string) => {
    try {
      const routes = await getMockRoutesByWorkspace(workspaceId);
      return { success: true, data: routes };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.MOCK_ROUTE_CREATE,
    async (_, data: Omit<MockRoute, '_id' | 'type' | 'created' | 'modified'>) => {
      try {
        const newRoute = await createMockRoute(data);
        // Restart server to apply new route
        await mockService.start(data.workspaceId);
        return { success: true, data: newRoute };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.MOCK_ROUTE_UPDATE,
    async (
      _,
      {
        id,
        data,
      }: { id: string; data: Partial<Omit<MockRoute, '_id' | 'type' | 'created' | 'modified'>> }
    ) => {
      try {
        const updatedRoute = await updateMockRoute(id, data);
        // Restart server to apply updated route
        await mockService.start(updatedRoute.workspaceId);
        return { success: true, data: updatedRoute };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.MOCK_ROUTE_DELETE,
    async (_, { id, workspaceId }: { id: string; workspaceId: string }) => {
      try {
        await deleteMockRoute(id);
        // Restart server to remove route
        await mockService.start(workspaceId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
  );
};
