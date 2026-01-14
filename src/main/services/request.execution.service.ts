import { v4 as uuidv4 } from 'uuid';
import { 
  Request, 
  Response, 
  TestResult,
  Variable,
  RequestHeader
} from '../../shared/types';
import {
  getWorkspaceIdForRequest,
  getActiveEnvironment,
  getVariablesByEnvironment,
  createResponse,
  updateVariable,
  createVariable,
} from '../database/models';
import { TemplateEngine } from '../utils/template-engine';
import { HttpService } from '../http/client';
import { saveResponseBody } from '../utils/file-manager';
import { AssertionService } from './assertion.service';
import { ScriptService } from './script.service';

export class RequestExecutionService {
  /**
   * Execute a request with full flow:
   * 1. Resolve environment variables
   * 2. Run Pre-request Script
   * 3. Render template
   * 4. Send HTTP request
   * 5. Run Post-request Script
   * 6. Run assertions
   * 7. Save response and body
   */
  static async executeRequest(request: Request): Promise<Response> {
    try {
      // 1. Resolve Environment Variables
      let variables: Variable[] = [];
      let activeEnvId: string | null = null;
      const workspaceId = await getWorkspaceIdForRequest(request._id);
      
      if (workspaceId) {
        const activeEnv = await getActiveEnvironment(workspaceId);
        if (activeEnv) {
          variables = await getVariablesByEnvironment(activeEnv._id);
          activeEnvId = activeEnv._id;
        }
      }

      // 2. Run Pre-request Script
      if (request.preRequestScript && activeEnvId) {
        await this.runScript(request.preRequestScript, variables, activeEnvId);
      }

      // 3. Render Request
      const renderedRequest = TemplateEngine.renderRequest(request, variables);

      // 4. Send Request (with auto headers calculation)
      const httpService = new HttpService();
      
      // Calculate final headers (Host, etc)
      if (renderedRequest.headers) {
         renderedRequest.headers = renderedRequest.headers.map((h: RequestHeader) => {
           if (h.isAuto && h.enabled) {
              if (h.name === 'Host') {
                 try {
                   const url = new URL(renderedRequest.url);
                   return { ...h, value: url.host };
                 } catch (e) {
                   return h; // Fallback if URL is invalid
                 }
              }
           }
           return h;
         });
      }

      const rawResponse = await httpService.sendRequest(renderedRequest);

      // 5. Run Post-request Script
      if (request.postRequestScript && activeEnvId) {
        await this.runScript(request.postRequestScript, variables, activeEnvId, rawResponse);
      }

      // 6. Run Assertions (if any)
      let testResults: TestResult | undefined;
      if (request.assertions && request.assertions.length > 0) {
        testResults = await AssertionService.runAssertions(rawResponse, request.assertions);
        rawResponse.testResults = testResults;
      }

      // 7. Save Response
      // Save body to file
      const bodyPath = await saveResponseBody(
        rawResponse._id,
        rawResponse.body || ''
      );

      // Create response record in DB
      const savedResponse = await createResponse({
        requestId: request._id,
        statusCode: rawResponse.statusCode,
        statusMessage: rawResponse.statusMessage,
        headers: rawResponse.headers,
        bodyPath,
        elapsedTime: rawResponse.elapsedTime,
        testResults,
      });

      // Return the saved response with the body content (in-memory)
      return { 
        ...savedResponse,
        body: rawResponse.body
      };
    } catch (error) {
      console.error('Error executing request:', error);
      throw error;
    }
  }

  private static async runScript(
    script: string, 
    variables: Variable[], 
    envId: string, 
    response?: Response
  ) {
    const pendingUpdates = new Map<string, string>();

    const pm = {
      environment: {
        get: (key: string) => variables.find(v => v.key === key)?.value,
        set: (key: string, value: string) => {
          pendingUpdates.set(key, String(value));
        }
      },
      // Convenience alias
      variables: {
        get: (key: string) => variables.find(v => v.key === key)?.value,
        set: (key: string, value: string) => {
          pendingUpdates.set(key, String(value));
        }
      },
      response: response ? {
        code: response.statusCode,
        status: response.statusMessage,
        headers: response.headers,
        body: response.body, // Text body
        json: () => {
          try {
            return JSON.parse(response.body || '{}');
          } catch {
            return null;
          }
        },
        text: () => response.body
      } : undefined
    };

    await ScriptService.executeScript(script, { pm });

    // Flush updates to DB and local variables
    for (const [key, value] of pendingUpdates.entries()) {
      const existing = variables.find(v => v.key === key);
      if (existing) {
        await updateVariable(existing._id, { value });
        existing.value = value;
      } else {
        const newVar = await createVariable({
          environmentId: envId,
          key,
          value,
          isSecret: false
        });
        variables.push(newVar);
      }
    }
  }
}
