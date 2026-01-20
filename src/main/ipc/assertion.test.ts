// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerAssertionHandlers } from './assertion';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import * as models from '../database/models';
import { ipcMain } from 'electron';

// Mock dependencies
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('../database/models');
vi.mock('../services/logger.service', () => ({
  LoggerService: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Assertion IPC Handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    vi.mocked(ipcMain.handle).mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });
    registerAssertionHandlers();
  });

  it('should register the assertions update handler', () => {
    expect(handlers[IPC_CHANNELS.ASSERTIONS_UPDATE]).toBeDefined();
  });

  it('should successfully update assertions', async () => {
    const requestId = 'req_123';
    const assertions = [
      {
        id: 'assert_1',
        source: 'status' as const,
        operator: 'equals' as const,
        expected: '200',
        enabled: true,
      },
      {
        id: 'assert_2',
        source: 'jsonBody' as const,
        property: '$.data.id',
        operator: 'exists' as const,
        expected: '',
        enabled: true,
      },
    ];

    const updatedRequest = {
      _id: requestId,
      name: 'Test Request',
      assertions,
    };

    vi.mocked(models.updateRequest).mockResolvedValue(updatedRequest as any);

    const result = await handlers[IPC_CHANNELS.ASSERTIONS_UPDATE](null, requestId, assertions);

    expect(models.updateRequest).toHaveBeenCalledWith(requestId, { assertions });
    expect(result).toEqual({ success: true, data: updatedRequest });
  });

  it('should handle empty assertions array', async () => {
    const requestId = 'req_123';
    const assertions: any[] = [];

    const updatedRequest = {
      _id: requestId,
      name: 'Test Request',
      assertions: [],
    };

    vi.mocked(models.updateRequest).mockResolvedValue(updatedRequest as any);

    const result = await handlers[IPC_CHANNELS.ASSERTIONS_UPDATE](null, requestId, assertions);

    expect(models.updateRequest).toHaveBeenCalledWith(requestId, { assertions: [] });
    expect(result).toEqual({ success: true, data: updatedRequest });
  });

  it('should handle database error', async () => {
    const requestId = 'req_123';
    const assertions = [
      {
        id: 'assert_1',
        source: 'status' as const,
        operator: 'equals' as const,
        expected: '200',
        enabled: true,
      },
    ];

    const errorMessage = 'Database connection failed';
    vi.mocked(models.updateRequest).mockRejectedValue(new Error(errorMessage));

    const result = await handlers[IPC_CHANNELS.ASSERTIONS_UPDATE](null, requestId, assertions);

    expect(result).toEqual({ success: false, error: errorMessage });
  });

  it('should handle non-Error thrown objects', async () => {
    const requestId = 'req_123';
    const assertions = [
      {
        id: 'assert_1',
        source: 'status' as const,
        operator: 'equals' as const,
        expected: '200',
        enabled: true,
      },
    ];

    vi.mocked(models.updateRequest).mockRejectedValue('String error');

    const result = await handlers[IPC_CHANNELS.ASSERTIONS_UPDATE](null, requestId, assertions);

    expect(result).toEqual({ success: false, error: 'String error' });
  });

  it('should handle request not found error', async () => {
    const requestId = 'non_existent_req';
    const assertions = [
      {
        id: 'assert_1',
        source: 'status' as const,
        operator: 'equals' as const,
        expected: '200',
        enabled: true,
      },
    ];

    vi.mocked(models.updateRequest).mockRejectedValue(new Error('Request not found'));

    const result = await handlers[IPC_CHANNELS.ASSERTIONS_UPDATE](null, requestId, assertions);

    expect(result).toEqual({ success: false, error: 'Request not found' });
  });
});
