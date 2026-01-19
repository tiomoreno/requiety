import { MockRoute } from '@shared/types';

const api = window.api.mock;

export const mockService = {
  start: (workspaceId: string, port: number) => api.start(workspaceId, port),
  stop: () => api.stop(),
  getStatus: () => api.getStatus(),
  getLogs: () => api.getLogs(),
  clearLogs: () => api.clearLogs(),

  getRoutes: (workspaceId: string) => api.getRoutes(workspaceId),
  createRoute: (data: Omit<MockRoute, '_id' | 'type' | 'created' | 'modified'>) =>
    api.createRoute(data),
  updateRoute: (
    id: string,
    data: Partial<Omit<MockRoute, '_id' | 'type' | 'created' | 'modified'>>
  ) => api.updateRoute(id, data),
  deleteRoute: (id: string, workspaceId: string) => api.deleteRoute(id, workspaceId),
};
