import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { Request } from '../../shared/types';
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
        | 'name'
        | 'url'
        | 'method'
        | 'parentId'
        | 'sortOrder'
        | 'headers'
        | 'body'
        | 'authentication'
      >
    ) => {
      try {
        const request = await createRequest(data);
        return { success: true, data: request };
      } catch (error) {
        console.error('Error creating request:', error);
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
          | 'name'
          | 'url'
          | 'method'
          | 'sortOrder'
          | 'headers'
          | 'body'
          | 'authentication'
        >
      >
    ) => {
      try {
        const request = await updateRequest(id, data);
        return { success: true, data: request };
      } catch (error) {
        console.error('Error updating request:', error);
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
      console.error('Error deleting request:', error);
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
      console.error('Error duplicating request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get requests by workspace
  ipcMain.handle(
    IPC_CHANNELS.REQUEST_GET_BY_WORKSPACE,
    async (_, workspaceId: string) => {
      try {
        const requests = await getRequestsByWorkspace(workspaceId);
        return { success: true, data: requests };
      } catch (error) {
        console.error('Error getting requests:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Get request by ID
  ipcMain.handle(IPC_CHANNELS.REQUEST_GET_BY_ID, async (_, id: string) => {
    try {
      const request = await getRequestById(id);
      return { success: true, data: request };
    } catch (error) {
      console.error('Error getting request:', error);
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

      // 1. Resolve Environment Variables
      let variables: any[] = [];
      const workspaceId = await getWorkspaceIdForRequest(id);
      
      if (workspaceId) {
        const activeEnv = await getActiveEnvironment(workspaceId);
        if (activeEnv) {
          variables = await getVariablesByEnvironment(activeEnv._id);
        }
      }

      // 2. Render Request
      const renderedRequest = TemplateEngine.renderRequest(request, variables);

      // 3. Send Request
      const httpService = new HttpService();
      const response = await httpService.sendRequest(renderedRequest);

      // 4. Save Response
      // Save body to file
      const bodyPath = await saveResponseBody(
        response._id,
        response.body || ''
      );

      // Create response record in DB
      const savedResponse = await createResponse({
        requestId: request._id,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
        bodyPath,
        elapsedTime: response.elapsedTime,
      });

      // Return the saved response with the body content
      return { 
        success: true, 
        data: {
          ...savedResponse,
          body: response.body
        } 
      };
    } catch (error) {
      console.error('Error sending request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
};
