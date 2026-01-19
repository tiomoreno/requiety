import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { Request } from '@shared/types';
import {
  createRequest,
  updateRequest,
  deleteRequest,
  duplicateRequest,
  getRequestsByWorkspace,
  getRequestById,
  createResponse,
  getWorkspaceIdForRequest,
  getActiveEnvironment,
  getVariablesByEnvironment,
} from '../database/models';
import { HttpService } from '../http/client';
import { saveResponseBody } from '../utils/file-manager';
import { TemplateEngine } from '../utils/template-engine';
import { AssertionService } from '../services/assertion.service';
import { RequestExecutionService } from '../services/request.execution.service';
import { GraphQLService } from '../services/graphql.service';
import { LoggerService } from '../services/logger.service';

/**
 * Register all request IPC handlers
 */
export const registerRequestHandlers = (): void => {
  // Create request
  ipcMain.handle(
    IPC_CHANNELS.REQUEST_CREATE,
    async (
      _,
      data: Pick<
        Request,
        'name' | 'url' | 'method' | 'parentId' | 'sortOrder' | 'headers' | 'body' | 'authentication'
      >
    ) => {
      try {
        const request = await createRequest(data);
        return { success: true, data: request };
      } catch (error) {
        LoggerService.error('Error creating request:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Update request
  ipcMain.handle(
    IPC_CHANNELS.REQUEST_UPDATE,
    async (
      _,
      id: string,
      data: Partial<
        Pick<
          Request,
          'name' | 'url' | 'method' | 'sortOrder' | 'headers' | 'body' | 'authentication'
        >
      >
    ) => {
      try {
        const request = await updateRequest(id, data);
        return { success: true, data: request };
      } catch (error) {
        LoggerService.error('Error updating request:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Delete request
  ipcMain.handle(IPC_CHANNELS.REQUEST_DELETE, async (_, id: string) => {
    try {
      await deleteRequest(id);
      return { success: true };
    } catch (error) {
      LoggerService.error('Error deleting request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Duplicate request
  ipcMain.handle(IPC_CHANNELS.REQUEST_DUPLICATE, async (_, id: string) => {
    try {
      const request = await duplicateRequest(id);
      return { success: true, data: request };
    } catch (error) {
      LoggerService.error('Error duplicating request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get requests by workspace
  ipcMain.handle(IPC_CHANNELS.REQUEST_GET_BY_WORKSPACE, async (_, workspaceId: string) => {
    try {
      const requests = await getRequestsByWorkspace(workspaceId);
      return { success: true, data: requests };
    } catch (error) {
      LoggerService.error('Error getting requests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get request by ID
  ipcMain.handle(IPC_CHANNELS.REQUEST_GET_BY_ID, async (_, id: string) => {
    try {
      const request = await getRequestById(id);
      return { success: true, data: request };
    } catch (error) {
      LoggerService.error('Error getting request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Send request
  ipcMain.handle(IPC_CHANNELS.REQUEST_SEND, async (_, id: string) => {
    try {
      const request = await getRequestById(id);
      if (!request) {
        throw new Error('Request not found');
      }

      // Execute request using shared service
      const response = await RequestExecutionService.executeRequest(request);

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      LoggerService.error('Error sending request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GraphQL Introspection
  ipcMain.handle(
    IPC_CHANNELS.GRAPHQL_INTROSPECT,
    async (_, { url, headers }: { url: string; headers: any }) => {
      try {
        const data = await GraphQLService.introspect(url, headers);
        return { success: true, data };
      } catch (error) {
        LoggerService.error('Error in GraphQL introspection:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );
};
