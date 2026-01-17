// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunnerService } from './runner.service';
import { RequestExecutionService } from './request.execution.service';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import * as dbModule from '../database';

// Mocks
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  ipcMain: { on: vi.fn(), handle: vi.fn() }
}));

vi.mock('./request.execution.service');
vi.mock('../database', () => ({
  getDatabase: vi.fn()
}));

describe('RunnerService', () => {
    let mockWindow: any;
    let mockRequestDb: any;
    let mockFolderDb: any;

    const mockRequest = {
        _id: 'r1',
        name: 'Req 1',
        sortOrder: 1,
        parentId: 'f1'
    };

    const mockFolder = {
        _id: 'f1',
        name: 'Folder 1',
        parentId: 'root'
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Window
        mockWindow = {
            isDestroyed: vi.fn().mockReturnValue(false),
            webContents: {
                send: vi.fn()
            }
        };

        // Mock DB
        mockRequestDb = {
            find: vi.fn((q, cb) => cb(null, [mockRequest]))
        };
        mockFolderDb = {
            find: vi.fn((q, cb) => cb(null, [])) // No subfolders by default
        };

        vi.mocked(dbModule.getDatabase).mockImplementation((type) => {
            if (type === 'Request') return mockRequestDb;
            if (type === 'Folder') return mockFolderDb;
            return { find: vi.fn() } as any;
        });

        // Mock Execution
        vi.mocked(RequestExecutionService.executeRequest).mockResolvedValue({
            _id: 'res1',
            requestId: 'r1',
            statusCode: 200,
            elapsedTime: 100,
            testResults: { passed: 1, failed: 0, results: [] }
        } as any);
        
        // Reset Runner state (it's static) - difficult since it's private.
        // We assume startRun resets state or throws if running.
        // Since tests run sequentially/isolated mostly, usually fine but if a previous test failed it might leave it 'running'.
        // We can expose a reset method or use `vi.spyOn` if needed, but let's try direct usage.
    });

    it('should start a run and execute requests', async () => {
        const result = await RunnerService.startRun(mockWindow, 'f1', 'folder');

        expect(result.status).toBe('completed');
        expect(result.totalRequests).toBe(1);
        expect(result.passedRequests).toBe(1);
        expect(result.failedRequests).toBe(0);
        
        expect(RequestExecutionService.executeRequest).toHaveBeenCalledWith(expect.objectContaining({ _id: 'r1' }));
    });

    it('should emit progress events', async () => {
        await RunnerService.startRun(mockWindow, 'f1', 'folder');

        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.RUNNER_ON_PROGRESS,
            expect.objectContaining({
                total: 1,
                completed: 1,
                passed: 1
            })
        );
    });

    it('should handle failures', async () => {
        vi.mocked(RequestExecutionService.executeRequest).mockResolvedValue({
            statusCode: 500,
            testResults: { passed: 0, failed: 1, results: [] },
            elapsedTime: 50
        } as any);

        const result = await RunnerService.startRun(mockWindow, 'f1', 'folder');
        
        expect(result.failedRequests).toBe(1);
        expect(result.passedRequests).toBe(0);
        expect(result.results[0].status).toBe('fail');
    });

    it('should handle execution errors', async () => {
        vi.mocked(RequestExecutionService.executeRequest).mockRejectedValue(new Error('Crash'));

        const result = await RunnerService.startRun(mockWindow, 'f1', 'folder');

        expect(result.failedRequests).toBe(1);
        expect(result.results[0].status).toBe('error');
    });

    it('should fetch requests recursively', async () => {
        // Setup hierarchy:
        // root -> F1 (sub) -> R1
        // root -> R2 (direct)
        
        const r1 = { _id: 'r1', name: 'R1', parentId: 'f1', sortOrder: 0 };
        const r2 = { _id: 'r2', name: 'R2', parentId: 'root', sortOrder: 1 };
        const f1 = { _id: 'f1', parentId: 'root' };
        
        mockRequestDb.find.mockImplementation((q: any, cb: any) => {
            if (q.parentId === 'root') cb(null, [r2]);
            else if (q.parentId === 'f1') cb(null, [r1]);
            else cb(null, []);
        });
        
        mockFolderDb.find.mockImplementation((q: any, cb: any) => {
             if (q.parentId === 'root') cb(null, [f1]);
             else cb(null, []);
        });

        const result = await RunnerService.startRun(mockWindow, 'root', 'folder');
        
        expect(result.totalRequests).toBe(2);
        // Ensure sorted
        expect(result.results[0].requestName).toBe('R1'); // R1 is inside F1, R2 is direct.
        // Flattening logic: direct requests (R2) + subfolders (F1->R1).
        // Runner logic: [...direct, ...subGroup].
        // So R2 comes first in list, then R1.
        // THEN sort by sortOrder.
        // R1 order 0, R2 order 1. So R1 should be first.
        
        expect(result.results[0].requestId).toBe('r1');
        expect(result.results[1].requestId).toBe('r2');
    });

    it('should stop mid-run', async () => {
        // Mock 2 requests
        mockRequestDb.find = vi.fn((q, cb) => cb(null, [
             { _id: 'r1', name: 'R1', parentId: 'f1', sortOrder: 1 },
             { _id: 'r2', name: 'R2', parentId: 'f1', sortOrder: 2 }
        ]));
        
        // Mock executeRequest to be slow allow stopping
        vi.mocked(RequestExecutionService.executeRequest).mockImplementation(async () => {
            // Trigger stop during first request
            RunnerService.stopRun();
            return { statusCode: 200 } as any;
        });

        const result = await RunnerService.startRun(mockWindow, 'f1', 'folder');
        
        expect(result.status).toBe('stopped');
        // Should execute first one, then check shouldStop and break loop
        // It might execute the one where stop was called, but not the next one.
        // Depending on check placement.
        // Check is at start of loop.
        // Loop 1: check false. Execute R1 (which calls stop). Loop 1 ends.
        // Loop 2: check true. Break.
        
        expect(result.totalRequests).toBe(2);
        // Only 1 executed ?
        // Or 2 if stop set too late?
        // executed R1. Loop continues. R2.. wait.
        
        // Actually executeRequest is awaited.
        // So R1 finishes.
        // check runs for R2. Stop is true. Break.
        // So 1 completed.
        expect(result.results).toHaveLength(1);
    });
});
