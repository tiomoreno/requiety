// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerRequestHandlers } from './request';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import * as models from '../database/models';
import { RequestExecutionService } from '../services/request.execution.service';
import { GraphQLService } from '../services/graphql.service';
import { ipcMain } from 'electron';

// Mock dependencies
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

vi.mock('../database/models');
vi.mock('../services/request.execution.service');
vi.mock('../services/graphql.service');
vi.mock('../http/client');
vi.mock('../utils/file-manager');
vi.mock('../utils/template-engine');
vi.mock('../services/assertion.service');

describe('Request IPC Handlers', () => {
  let handlers: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerRequestHandlers();
  });

  it('should register handlers', () => {
      expect(handlers[IPC_CHANNELS.REQUEST_CREATE]).toBeDefined();
      expect(handlers[IPC_CHANNELS.REQUEST_UPDATE]).toBeDefined();
      expect(handlers[IPC_CHANNELS.REQUEST_DELETE]).toBeDefined();
      expect(handlers[IPC_CHANNELS.REQUEST_DUPLICATE]).toBeDefined();
      expect(handlers[IPC_CHANNELS.REQUEST_GET_BY_WORKSPACE]).toBeDefined();
      expect(handlers[IPC_CHANNELS.REQUEST_GET_BY_ID]).toBeDefined();
      expect(handlers[IPC_CHANNELS.REQUEST_SEND]).toBeDefined();
      expect(handlers[IPC_CHANNELS.GRAPHQL_INTROSPECT]).toBeDefined();
  });

  it('create should success', async () => {
      const req = { _id: 'r1' };
      vi.mocked(models.createRequest).mockResolvedValue(req as any);
      const res = await handlers[IPC_CHANNELS.REQUEST_CREATE](null, { name: 'R' });
      expect(res).toEqual({ success: true, data: req });
  });

  it('update should success', async () => {
    const req = { _id: 'r1', name: 'New' };
    vi.mocked(models.updateRequest).mockResolvedValue(req as any);
    const res = await handlers[IPC_CHANNELS.REQUEST_UPDATE](null, 'r1', { name: 'New' });
    expect(res).toEqual({ success: true, data: req });
  });

  it('delete should success', async () => {
    vi.mocked(models.deleteRequest).mockResolvedValue(undefined);
    const res = await handlers[IPC_CHANNELS.REQUEST_DELETE](null, 'r1');
    expect(res).toEqual({ success: true });
  });

  it('duplicate should success', async () => {
    const req = { _id: 'r2' };
    vi.mocked(models.duplicateRequest).mockResolvedValue(req as any);
    const res = await handlers[IPC_CHANNELS.REQUEST_DUPLICATE](null, 'r1');
    expect(res).toEqual({ success: true, data: req });
  });

  it('getByWorkspace should success', async () => {
    const list = [{ _id: 'r1' }];
    vi.mocked(models.getRequestsByWorkspace).mockResolvedValue(list as any);
    const res = await handlers[IPC_CHANNELS.REQUEST_GET_BY_WORKSPACE](null, 'w1');
    expect(res).toEqual({ success: true, data: list });
  });

  it('getById should success', async () => {
    const req = { _id: 'r1' };
    vi.mocked(models.getRequestById).mockResolvedValue(req as any);
    const res = await handlers[IPC_CHANNELS.REQUEST_GET_BY_ID](null, 'r1');
    expect(res).toEqual({ success: true, data: req });
  });

  it('send should execute request', async () => {
      const req = { _id: 'r1' };
      const apiRes = { _id: 'res1' };
      
      vi.mocked(models.getRequestById).mockResolvedValue(req as any);
      vi.mocked(RequestExecutionService.executeRequest).mockResolvedValue(apiRes as any);
      
      const res = await handlers[IPC_CHANNELS.REQUEST_SEND](null, 'r1');
      
      expect(models.getRequestById).toHaveBeenCalledWith('r1');
      expect(RequestExecutionService.executeRequest).toHaveBeenCalledWith(req);
      expect(res).toEqual({ success: true, data: apiRes });
  });

  it('send should error if request missing', async () => {
      vi.mocked(models.getRequestById).mockResolvedValue(null);
      const res = await handlers[IPC_CHANNELS.REQUEST_SEND](null, 'r1');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Request not found');
  });

  it('graphql introspect should success', async () => {
      const schema = { types: [] };
      vi.mocked(GraphQLService.introspect).mockResolvedValue(schema);
      
      const res = await handlers[IPC_CHANNELS.GRAPHQL_INTROSPECT](null, { url: 'u', headers: {} });
      expect(GraphQLService.introspect).toHaveBeenCalledWith('u', {});
      expect(res).toEqual({ success: true, data: schema });
  });
});
