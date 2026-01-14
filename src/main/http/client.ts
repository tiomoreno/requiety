import axios, { type AxiosRequestConfig, type AxiosResponse, type Method } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from '../../shared/types';

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
      const headers = this.prepareHeaders(request);
      const { data, contentType } = this.prepareBody(request);

      if (contentType && !this.hasHeader(headers, 'Content-Type')) {
        headers['Content-Type'] = contentType;
      }

      const config: AxiosRequestConfig = {
        url: request.url,
        method: request.method as Method,
        headers,
        data,
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

    // Prepare response body string
    const bodyStr = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data);
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
  private prepareBody(request: Request): { data?: any; contentType?: string } {
    if (!request.body || request.body.type === 'none') return {};

    switch (request.body.type) {
      case 'json':
        return {
          data: request.body.text ?? '',
          contentType: 'application/json',
        };
      case 'raw':
        return { data: request.body.text ?? '' };
      case 'form-urlencoded': {
        const searchParams = new URLSearchParams();
        request.body.params?.forEach((param) => {
          if (param.enabled && param.name) {
            searchParams.append(param.name, param.value ?? '');
          }
        });
        return {
          data: searchParams.toString(),
          contentType: 'application/x-www-form-urlencoded',
        };
      }
      case 'form-data': {
        const enabledParams =
          request.body.params?.filter((param) => param.enabled && param.name) ?? [];

        if (typeof FormData !== 'undefined') {
          const formData = new FormData();
          enabledParams.forEach((param) => {
            formData.append(param.name, param.value ?? '');
          });
          return { data: formData };
        }

        const searchParams = new URLSearchParams();
        enabledParams.forEach((param) => {
          searchParams.append(param.name, param.value ?? '');
        });

        return {
          data: searchParams.toString(),
          contentType: 'application/x-www-form-urlencoded',
        };
      }
      case 'graphql': {
        const query = request.body.graphql?.query || '';
        let variables = {};
        try {
          if (request.body.graphql?.variables) {
            variables = JSON.parse(request.body.graphql.variables);
          }
        } catch (e) {
          console.warn('Invalid GraphQL variables JSON', e);
        }
        return {
          data: JSON.stringify({ query, variables }),
          contentType: 'application/json',
        };
      }
      default:
        return { data: request.body.text ?? '' };
    }
  }

  private hasHeader(headers: Record<string, string>, headerName: string): boolean {
    const target = headerName.toLowerCase();
    return Object.keys(headers).some((key) => key.toLowerCase() === target);
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
