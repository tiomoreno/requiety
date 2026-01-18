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
  getSettings,
  getRequestById,
  getTokenByRequestId,
} from '../database/models';
import { TemplateEngine } from '../utils/template-engine';
import { HttpService } from '../http/client';
import { runAssertions } from './assertion.service';
import { ScriptService } from './script.service';
import { GrpcService } from './grpc.service';
import { generateId } from '../utils/id-generator';
import { saveResponseBody } from '../utils/file-manager';
import { OAuthService } from './oauth.service';

export class RequestExecutionService {
  /**
   * Execute a request with full flow:
   * 1. Resolve environment variables
   * 2. Run Pre-request Script
   * 3. Render template
   * 4. Handle Authentication (OAuth 2.0)
   * 5. Send HTTP or gRPC request
   * 6. Run Post-request Script
   * 7. Run assertions
   * 8. Save response and body
   */
  static async executeRequest(request: Request): Promise<Response> {
    const startTime = Date.now();
    const workspaceId = await getWorkspaceIdForRequest(request._id);
    let variables: Variable[] = [];
    let activeEnvId: string | null = null;

    if (workspaceId) {
      const activeEnv = await getActiveEnvironment(workspaceId);
      if (activeEnv) {
        variables = await getVariablesByEnvironment(activeEnv._id);
        activeEnvId = activeEnv._id;
      }
    }

    if (request.preRequestScript) {
      variables = await this.runScript(request.preRequestScript, variables, activeEnvId);
    }

    const renderedRequest = TemplateEngine.renderRequest(request, variables);

    // Handle Authentication
    if (renderedRequest.authentication.type === 'oauth2') {
      let token = await getTokenByRequestId(renderedRequest._id);

      // If token is expired, try to refresh it
      if (token && token.expiresAt && Date.now() >= token.expiresAt) {
        if (token.refreshToken) {
          token = await OAuthService.refreshToken(renderedRequest.authentication.oauth2, token.refreshToken, renderedRequest._id);
        } else {
          token = null; // Token expired, no refresh token
        }
      }

      if (!token) {
        throw new Error('OAuth 2.0 token is missing, expired, or invalid. Please acquire a new token.');
      }

      // Add Authorization header
      const authHeader: RequestHeader = {
        name: 'Authorization',
        value: `Bearer ${token.accessToken}`,
        enabled: true,
      };
      
      // Remove any existing auth header and add the new one
      renderedRequest.headers = renderedRequest.headers.filter(h => h.name.toLowerCase() !== 'authorization');
      renderedRequest.headers.push(authHeader);
    }


    // Calculate final headers (Host, etc) after rendering
    if (renderedRequest.headers) {
      renderedRequest.headers = renderedRequest.headers.map((h: RequestHeader) => {
        if (h.isAuto && h.enabled) {
          if (h.name.toLowerCase() === 'host') {
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

    // Handle gRPC Request
    if (renderedRequest.method === 'GRPC') {
      if (!renderedRequest.grpc?.protoFilePath || !renderedRequest.grpc.service || !renderedRequest.grpc.method) {
        throw new Error('Missing gRPC configuration: proto file, service, and method are required.');
      }
      
      const grpcResponse = await GrpcService.makeUnaryCall({
        protoFilePath: renderedRequest.grpc.protoFilePath,
        url: renderedRequest.url,
        service: renderedRequest.grpc.service,
        method: renderedRequest.grpc.method,
        body: renderedRequest.body.text || '{}',
      });

      const responseBody = JSON.stringify(grpcResponse, null, 2);
      const elapsedTime = Date.now() - startTime;

      const mockRawResponse: Response = {
        _id: generateId('Response'),
        type: 'Response',
        requestId: request._id,
        statusCode: 0, // gRPC status code is different, 0 means OK
        statusMessage: 'OK',
        headers: [],
        body: responseBody,
        bodyPath: '', // Will be set below
        elapsedTime,
        created: startTime,
        modified: startTime,
      };

      if (request.postRequestScript) {
        variables = await this.runScript(request.postRequestScript, variables, activeEnvId, mockRawResponse);
      }
      
      // No assertions for gRPC for now
      
      const bodyPath = await saveResponseBody(mockRawResponse._id, responseBody);
      const savedResponse = await createResponse({
        requestId: request._id,
        statusCode: mockRawResponse.statusCode,
        statusMessage: mockRawResponse.statusMessage,
        headers: mockRawResponse.headers,
        bodyPath,
        elapsedTime: mockRawResponse.elapsedTime,
        testResults: undefined,
      });

      return { ...savedResponse, body: responseBody };
    }

    // Handle HTTP Request
    const settings = await getSettings();
    const httpService = new HttpService({
      timeout: settings.timeout,
      validateSSL: settings.validateSSL,
      followRedirects: settings.followRedirects,
      maxRedirects: settings.maxRedirects,
    });

    const rawResponse = await httpService.sendRequest(renderedRequest);
    const responseBody = rawResponse.body || '';

    if (request.postRequestScript) {
      variables = await this.runScript(request.postRequestScript, variables, activeEnvId, rawResponse);
    }

    let testResults: TestResult | undefined;
    if (request.assertions && request.assertions.length > 0) {
      testResults = runAssertions(request.assertions, rawResponse, responseBody);
    }

    const bodyPath = await saveResponseBody(rawResponse._id, responseBody);
    const savedResponse = await createResponse({
      requestId: request._id,
      statusCode: rawResponse.statusCode,
      statusMessage: rawResponse.statusMessage,
      headers: rawResponse.headers,
      bodyPath,
      elapsedTime: rawResponse.elapsedTime,
      testResults,
    });

    return { ...savedResponse, body: responseBody };
  }

  private static async runScript(
    script: string,
    initialVariables: Variable[],
    envId: string | null,
    response?: Response
  ): Promise<Variable[]> {
    if (!envId) return initialVariables;

    const variables = [...initialVariables];
    const pendingUpdates = new Map<string, string>();

    const pm = {
      environment: {
        get: (key: string) => variables.find(v => v.key === key)?.value,
        set: (key: string, value: string) => {
          pendingUpdates.set(key, String(value));
        },
      },
      response: response ? {
        code: response.statusCode,
        status: response.statusMessage,
        headers: response.headers,
        body: response.body || null,
        json: () => {
          try {
            return JSON.parse(response.body || '{}');
          } catch {
            return null;
          }
        },
        text: () => response.body || null,
      } : undefined,
    };

    await ScriptService.executeScript(script, { pm });

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
          isSecret: false,
        });
        variables.push(newVar);
      }
    }
    return variables;
  }
}
