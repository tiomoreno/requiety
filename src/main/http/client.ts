import axios, { type AxiosRequestConfig, type AxiosResponse, type Method } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, AuthType } from '../../shared/types';
import app from 'electron'; // Just to have access to versions if needed, or remove if unused

/**
 * Service to handle HTTP requests
 */
export class HttpService {
  /**
   * Send a request
   */
  async sendRequest(request: Request): Promise<Response> {
    const startTime = Date.now();
    let response: AxiosResponse | null = null;
    let error: any = null;

    try {
      const config: AxiosRequestConfig = {
        url: request.url,
        method: request.method as Method,
        headers: this.prepareHeaders(request),
        data: this.prepareBody(request),
        timeout: 30000, // TODO: Make configurable from settings
        validateStatus: () => true, // Don't throw on error status codes
        transformResponse: [(data) => data], // Don't parse JSON automatically yet, we want raw body
      };

      // Add auth
      this.addAuthentication(config, request);

      response = await axios(config);
    } catch (err: any) {
      error = err;
    }

    const endTime = Date.now();
    const elapsedTime = endTime - startTime;

    if (error) {
       // Network error or timeout (axios throws for these even with validateStatus: true)
      return {
        _id: uuidv4(),
        type: 'Response',
        requestId: request._id,
        statusCode: 0,
        statusMessage: error.message || 'Network Error',
        headers: [],
        body: '',
        bodyPath: '', // We'll handle file storage later if needed
        elapsedTime,
        created: Date.now(),
        modified: Date.now(), 
      };
    }

    if (!response) {
      throw new Error('No response received');
    }

    // Process headers
    const headers = Object.entries(response.headers).map(([name, value]) => ({
      name,
      value: String(value),
    }));

    // Calculate size (approximate)
    const bodyStr = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data);
    const size = Buffer.byteLength(bodyStr, 'utf8');

    return {
      _id: uuidv4(),
      type: 'Response',
      requestId: request._id,
      statusCode: response.status,
      statusMessage: response.statusText,
      headers,
      body: bodyStr,
      bodyPath: '', 
      elapsedTime,
      created: Date.now(),
      modified: Date.now(),
    };
  }

  /**
   * Prepare headers from request
   */
  private prepareHeaders(request: Request): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Default headers
    headers['User-Agent'] = 'Requiety/1.0.0';

    // User headers
    if (request.headers) {
      request.headers.forEach(h => {
        if (h.enabled && h.name) {
          headers[h.name] = h.value;
        }
      });
    }

    return headers;
  }

  /**
   * Prepare body based on content type
   */
  private prepareBody(request: Request): any {
    if (!request.body) return undefined;

    // TODO: Handle different body types (form-data, url-encoded, etc)
    // For now, just return raw JSON/Text
    if (request.body && typeof request.body === 'string') {
        return request.body;
    }
    
     // If the body structure from types.ts is more complex (e.g. { type: 'json', content: '...' })
     // we need to adjust here. Assuming simple string or object for MVP based on current types context.
     // Let's check types.ts if we need to be more specific. 
     // For safety, let's assume it might be the object structure from the PRD/Types
     
     if (typeof request.body === 'object' && 'content' in request.body) {
         // @ts-ignore
         return request.body.content;
     }

    return request.body;
  }

  /**
   * Add authentication to request config
   */
  private addAuthentication(config: AxiosRequestConfig, request: Request): void {
    if (!request.authentication) return;

    if (request.authentication.type === 'bearer' && request.authentication.token) {
      if (!config.headers) config.headers = {};
      config.headers['Authorization'] = `Bearer ${request.authentication.token}`;
    }

    if (request.authentication.type === 'basic') {
      config.auth = {
        username: request.authentication.username || '',
        password: request.authentication.password || '',
      };
    }
  }
}
