import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockService } from './mock.service';
import * as dbModels from '../database/models';
import express from 'express';
import { Server } from 'http';

// Mock database models
vi.mock('../database/models', () => ({
  getMockRoutesByWorkspace: vi.fn(),
}));

// Mock express
const mockApp = {
  use: vi.fn(),
  listen: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  head: vi.fn(),
  options: vi.fn(),
};

// Mock Server
const mockServer = {
  close: vi.fn((cb) => cb && cb()),
} as unknown as Server;

vi.mock('express', () => {
  const expressFn = vi.fn(() => mockApp);
  (expressFn as any).json = vi.fn(() => 'jsonMiddleware');
  (expressFn as any).text = vi.fn(() => 'textMiddleware');
  (expressFn as any).urlencoded = vi.fn(() => 'urlencodedMiddleware');
  return { default: expressFn };
});

describe('MockServerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.clearLogs();
    // Reset internal state if needed (not directly possible as it is private, but stop() helps)
  });

  afterEach(async () => {
    await mockService.stop();
  });

  it('should be a singleton', () => {
    const instance1 = mockService;
    // @ts-expect-error - accessing private constructor via static method
    const instance2 = (mockService.constructor as any).getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should start the server with configured routes', async () => {
    const workspaceId = 'ws_1';
    const routes = [
      {
        _id: 'route_1',
        path: '/test',
        method: 'GET',
        statusCode: 200,
        body: '{"message": "success"}',
        enabled: true,
        workspaceId,
        type: 'MockRoute',
        created: Date.now(),
        modified: Date.now(),
      },
      {
        _id: 'route_2',
        path: '/disabled',
        method: 'POST',
        statusCode: 201,
        body: '{}',
        enabled: false,
        workspaceId,
        type: 'MockRoute',
        created: Date.now(),
        modified: Date.now(),
      },
    ];

    vi.mocked(dbModels.getMockRoutesByWorkspace).mockResolvedValue(routes as any);

    mockApp.listen.mockImplementation((port: number, cb: () => void) => {
      cb();
      return mockServer;
    });

    await mockService.start(workspaceId, 3031);

    expect(express).toHaveBeenCalled();
    expect(mockApp.use).toHaveBeenCalledWith('jsonMiddleware');
    expect(mockApp.use).toHaveBeenCalledWith('textMiddleware');
    expect(mockApp.use).toHaveBeenCalledWith('urlencodedMiddleware');

    // Check if GET route was registered
    expect(mockApp.get).toHaveBeenCalledWith('/test', expect.any(Function));

    // Check if POST route was NOT registered (disabled)
    expect(mockApp.post).not.toHaveBeenCalledWith('/disabled', expect.any(Function));

    expect(mockApp.listen).toHaveBeenCalledWith(3031, expect.any(Function));

    const status = mockService.getStatus();
    expect(status.isRunning).toBe(true);
    expect(status.port).toBe(3031);
  });

  it('should stop the server', async () => {
    const workspaceId = 'ws_1';
    vi.mocked(dbModels.getMockRoutesByWorkspace).mockResolvedValue([]);

    mockApp.listen.mockImplementation((port, cb) => {
      cb();
      return mockServer;
    });

    (mockServer.close as any).mockImplementation((cb: () => void) => cb());

    await mockService.start(workspaceId);
    expect(mockService.getStatus().isRunning).toBe(true);

    await mockService.stop();
    expect(mockServer.close).toHaveBeenCalled();
    expect(mockService.getStatus().isRunning).toBe(false);
  });

  it('should restart if already running', async () => {
    const workspaceId = 'ws_1';
    vi.mocked(dbModels.getMockRoutesByWorkspace).mockResolvedValue([]);

    mockApp.listen.mockImplementation((port, cb) => {
      cb();
      return mockServer;
    });
    (mockServer.close as any).mockImplementation((cb: () => void) => cb());

    await mockService.start(workspaceId);
    await mockService.start(workspaceId); // Restart

    expect(mockServer.close).toHaveBeenCalled();
    expect(mockApp.listen).toHaveBeenCalledTimes(2);
  });

  it('should log requests', async () => {
    const workspaceId = 'ws_1';
    vi.mocked(dbModels.getMockRoutesByWorkspace).mockResolvedValue([]);

    mockApp.listen.mockImplementation((port, cb) => {
      cb();
      return mockServer;
    });

    await mockService.start(workspaceId);

    // Find the logger middleware (first one after body parsers)
    // We expect 3 body parsers + 1 logger + 1 fallback
    // But implementation adds logger first in middleware stack?
    // Let's check implementation: app.use(logger) is called.

    // In the implementation:
    // this.app.use(express.json()); ...
    // this.app.use((req, res, next) => { ... logger ... });

    const loggerMiddleware = mockApp.use.mock.calls.find(
      (call) => typeof call[0] === 'function'
    )?.[0];
    expect(loggerMiddleware).toBeDefined();

    const req = { method: 'GET', path: '/api', headers: { 'x-test': '1' } };
    const res = {};
    const next = vi.fn();

    // Execute middleware
    loggerMiddleware(req, res, next);

    const logs = mockService.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      method: 'GET',
      path: '/api',
      headers: { 'x-test': '1' },
    });
    expect(next).toHaveBeenCalled();
  });

  it('should handle route execution (success JSON)', async () => {
    const workspaceId = 'ws_1';
    const routes = [
      {
        _id: 'r1',
        path: '/json',
        method: 'GET',
        statusCode: 200,
        body: '{"foo":"bar"}',
        enabled: true,
        workspaceId,
        type: 'MockRoute',
        created: 0,
        modified: 0,
      },
    ];

    vi.mocked(dbModels.getMockRoutesByWorkspace).mockResolvedValue(routes as any);

    mockApp.listen.mockImplementation((p, cb) => {
      cb();
      return mockServer;
    });
    await mockService.start(workspaceId);

    const routeHandler = mockApp.get.mock.calls[0][1];

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
    };

    routeHandler({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('should handle route execution (fallback text)', async () => {
    const workspaceId = 'ws_1';
    const routes = [
      {
        _id: 'r1',
        path: '/text',
        method: 'POST',
        statusCode: 400,
        body: 'Invalid JSON',
        enabled: true,
        workspaceId,
        type: 'MockRoute',
        created: 0,
        modified: 0,
      },
    ];

    vi.mocked(dbModels.getMockRoutesByWorkspace).mockResolvedValue(routes as any);

    mockApp.listen.mockImplementation((p, cb) => {
      cb();
      return mockServer;
    });
    await mockService.start(workspaceId);

    const routeHandler = mockApp.post.mock.calls[0][1];

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
    };

    routeHandler({}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid JSON');
  });
});
