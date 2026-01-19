import { BrowserWindow } from 'electron';
import { CollectionRunResult, Request, RunProgress, RunnerStatus } from '@shared/types';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { RequestExecutionService } from './request.execution.service';
import { LoggerService } from './logger.service';

export class RunnerService {
  private static status: RunnerStatus = 'idle';
  private static shouldStop = false;

  /**
   * Start a collection run
   */
  static async startRun(
    window: BrowserWindow,
    targetId: string, // folderId or workspaceId
    type: 'folder' | 'workspace'
  ): Promise<CollectionRunResult> {
    if (this.status === 'running') {
      throw new Error('Runner is already active');
    }

    this.status = 'running';
    this.shouldStop = false;
    const startTime = Date.now();

    try {
      // 1. Fetch Requests
      const requests = await this.fetchRequestsFlattened(targetId, type);
      const totalRequests = requests.length;
      let completedRequests = 0;
      let passedRequests = 0;
      let failedRequests = 0;
      const results: CollectionRunResult['results'] = [];

      // 2. Iterate and Execute
      for (const request of requests) {
        if (this.shouldStop) {
          this.status = 'stopped';
          break;
        }

        // Notify Start of Request (optional, but good for UI)
        this.emitProgress(window, {
          total: totalRequests,
          completed: completedRequests,
          currentRequestName: request.name,
          passed: passedRequests,
          failed: failedRequests,
        });

        try {
          const response = await RequestExecutionService.executeRequest(request);

          const hasFailures = response.testResults && response.testResults.failed > 0;
          const status = hasFailures ? 'fail' : 'pass';

          if (status === 'pass') passedRequests++;
          else failedRequests++;

          results.push({
            requestId: request._id,
            requestName: request.name,
            status,
            statusCode: response.statusCode,
            duration: response.elapsedTime,
            assertionResults: response.testResults,
          });
        } catch (error) {
          failedRequests++;
          results.push({
            requestId: request._id,
            requestName: request.name,
            status: 'error',
            duration: 0,
          });
          LoggerService.error(`Runner error for request ${request.name}:`, error);
        }

        completedRequests++;

        // Notify Progress
        this.emitProgress(window, {
          total: totalRequests,
          completed: completedRequests,
          currentRequestName: request.name,
          passed: passedRequests,
          failed: failedRequests,
        });

        // Small delay to prevent UI freeze
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const endTime = Date.now();
      const finalStatus: RunnerStatus = this.shouldStop ? 'stopped' : 'completed';

      this.status = 'idle'; // Reset status

      return {
        status: finalStatus,
        totalRequests,
        passedRequests,
        failedRequests,
        startTime,
        endTime,
        results,
      };
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  static stopRun() {
    if (this.status === 'running') {
      this.shouldStop = true;
    }
  }

  private static emitProgress(window: BrowserWindow, progress: RunProgress) {
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.RUNNER_ON_PROGRESS, progress);
    }
  }

  /**
   * Helper to fetch all requests in a folder/workspace recursively
   */
  private static async fetchRequestsFlattened(
    targetId: string,
    type: 'folder' | 'workspace'
  ): Promise<Request[]> {
    const { getRequestsByWorkspace, getFoldersByWorkspace } = await import('../database/models');

    if (type === 'workspace') {
      const requests = await getRequestsByWorkspace(targetId);
      return requests.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // For folders, we need to get all child requests recursively.
    const allRequests: Request[] = [];
    const folderQueue: string[] = [targetId];

    // This can be optimized, but for now a simple BFS-like traversal is fine.
    // We can reuse getRequestsByWorkspace if we can get all folder IDs first.
    const { getDatabase, dbOperation } = await import('../database');

    const folderDb = getDatabase('Folder');
    const requestDb = getDatabase('Request');

    let currentParentId = folderQueue.shift();
    while (currentParentId) {
      // Get requests in current folder
      const requestsInFolder = await dbOperation<Request[]>((cb) =>
        requestDb.find({ parentId: currentParentId }, cb)
      );
      allRequests.push(...requestsInFolder);

      // Get subfolders and add to queue
      const subFolders = await dbOperation<any[]>((cb) =>
        folderDb.find({ parentId: currentParentId }, cb)
      );
      for (const sub of subFolders) {
        folderQueue.push(sub._id);
      }

      currentParentId = folderQueue.shift();
    }

    return allRequests.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
