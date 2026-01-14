import { BrowserWindow } from 'electron';
import { 
  CollectionRunResult, 
  Request, 
  RunProgress, 
  RunnerStatus 
} from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { RequestExecutionService } from './request.execution.service';

export class RunnerService {
  private static status: RunnerStatus = 'idle';
  private static shouldStop: boolean = false;

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
          failed: failedRequests
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
            assertionResults: response.testResults
          });

        } catch (error) {
          failedRequests++;
          results.push({
            requestId: request._id,
            requestName: request.name,
            status: 'error',
            duration: 0
          });
          console.error(`Runner error for request ${request.name}:`, error);
        }

        completedRequests++;
        
        // Notify Progress
        this.emitProgress(window, {
          total: totalRequests,
          completed: completedRequests,
          currentRequestName: request.name,
          passed: passedRequests,
          failed: failedRequests
        });

        // Small delay to prevent UI freeze
        await new Promise(resolve => setTimeout(resolve, 50)); 
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
        results
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
  private static async fetchRequestsFlattened(targetId: string, type: 'folder' | 'workspace'): Promise<Request[]> {
     return await this.getAllRequestsRecursive(targetId);
  }

  private static async getAllRequestsRecursive(parentId: string): Promise<Request[]> {
     // Use dynamic import to avoid potential circular deps or load issues in some envs
     const requestDb = await import('../database').then(m => m.getDatabase('Request'));
     const directRequests = await new Promise<Request[]>((resolve, reject) => {
         requestDb.find({ parentId }, (err: any, docs: Request[]) => {
             if (err) reject(err);
             else resolve(docs);
         });
     });

     const folderDb = await import('../database').then(m => m.getDatabase('Folder'));
     const subFolders = await new Promise<any[]>((resolve, reject) => {
         folderDb.find({ parentId }, (err: any, docs: any[]) => {
             if (err) reject(err);
             else resolve(docs);
         });
     });

     let allRequests = [...directRequests];

    // Parallel recursive fetch
    const subRequestPromises = subFolders.map(folder => this.getAllRequestsRecursive(folder._id));
    const subResultGroups = await Promise.all(subRequestPromises);
    
    for (const group of subResultGroups) {
        allRequests = allRequests.concat(group);
    }
    
    // Sort by sortOrder
    return allRequests.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
