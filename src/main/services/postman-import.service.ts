import {
  createWorkspace,
  createEnvironment,
  createVariable,
  createFolder,
  createRequest,
} from '../database/models';
import type {
  Workspace,
  HttpMethod,
  RequestHeader,
  RequestBody,
  RequestBodyParam,
  Authentication,
  BodyType,
} from '../../shared/types';

// ============================================================================
// Postman Collection v2.1 Types
// ============================================================================

interface PostmanCollection {
  info: {
    name: string;
    _postman_id?: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
  auth?: PostmanAuth;
}

interface PostmanItem {
  name: string;
  item?: PostmanItem[]; // If folder
  request?: PostmanRequest; // If request
  response?: unknown[]; // Saved responses (ignored)
  auth?: PostmanAuth;
  event?: PostmanEvent[];
}

interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl | string;
  auth?: PostmanAuth;
  description?: string;
}

interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
  description?: string;
}

interface PostmanBody {
  mode: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql' | 'none';
  raw?: string;
  urlencoded?: PostmanKeyValue[];
  formdata?: PostmanFormDataItem[];
  graphql?: {
    query: string;
    variables?: string;
  };
  options?: {
    raw?: {
      language?: string; // json, xml, text, etc.
    };
  };
}

interface PostmanKeyValue {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
  description?: string;
}

interface PostmanFormDataItem {
  key: string;
  value?: string;
  type?: 'text' | 'file';
  src?: string; // File path for file type
  disabled?: boolean;
  description?: string;
}

interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string[];
  port?: string;
  path?: string[];
  query?: PostmanKeyValue[];
  variable?: PostmanKeyValue[];
}

interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
  description?: string;
}

interface PostmanAuth {
  type: string;
  basic?: PostmanKeyValue[];
  bearer?: PostmanKeyValue[];
  oauth2?: PostmanKeyValue[];
  apikey?: PostmanKeyValue[];
  // ... other auth types
}

interface PostmanEvent {
  listen: 'prerequest' | 'test';
  script?: {
    exec?: string[];
    type?: string;
  };
}

// ============================================================================
// Import Service
// ============================================================================

export class PostmanImportService {
  /**
   * Import a Postman Collection v2.1 and create workspace with all items
   */
  static async importCollection(collection: PostmanCollection): Promise<Workspace> {
    // Validate collection format
    if (!collection.info?.schema?.includes('v2.1') && !collection.info?.schema?.includes('v2.0')) {
      throw new Error('Unsupported Postman collection format. Please export as Collection v2.1');
    }

    // 1. Create Workspace
    const workspace = await createWorkspace({
      name: collection.info.name,
    });

    // 2. Import Collection Variables as Environment
    if (collection.variable && collection.variable.length > 0) {
      const env = await createEnvironment({
        name: 'Collection Variables',
        workspaceId: workspace._id,
      });

      for (const variable of collection.variable) {
        if (!variable.disabled) {
          await createVariable({
            environmentId: env._id,
            key: variable.key,
            value: variable.value || '',
            isSecret: false,
          });
        }
      }
    }

    // 3. Import Items (Folders and Requests) recursively
    await this.importItems(collection.item, workspace._id, collection.auth);

    return workspace;
  }

  /**
   * Recursively import Postman items (folders and requests)
   */
  private static async importItems(
    items: PostmanItem[],
    parentId: string,
    parentAuth?: PostmanAuth
  ): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.item && item.item.length > 0) {
        // It's a folder
        const folder = await createFolder({
          name: item.name,
          parentId,
          sortOrder: i,
        });

        // Inherit auth from parent if item has its own auth
        const effectiveAuth = item.auth || parentAuth;

        // Recursively import children
        await this.importItems(item.item, folder._id, effectiveAuth);
      } else if (item.request) {
        // It's a request
        await this.importRequest(item, parentId, i, parentAuth);
      }
    }
  }

  /**
   * Import a single Postman request
   */
  private static async importRequest(
    item: PostmanItem,
    parentId: string,
    sortOrder: number,
    parentAuth?: PostmanAuth
  ): Promise<void> {
    const postmanRequest = item.request!;

    // Parse URL
    const url = this.parseUrl(postmanRequest.url);

    // Parse Method
    const method = this.parseMethod(postmanRequest.method);

    // Parse Headers
    const headers = this.parseHeaders(postmanRequest.header);

    // Parse Body
    const body = this.parseBody(postmanRequest.body);

    // Parse Authentication (request-level > folder-level > collection-level)
    const effectiveAuth = postmanRequest.auth || item.auth || parentAuth;
    const authentication = this.parseAuth(effectiveAuth);

    // Parse Scripts
    const { preRequestScript, postRequestScript } = this.parseScripts(item.event);

    await createRequest({
      name: item.name,
      url,
      method,
      parentId,
      sortOrder,
      headers,
      body,
      authentication,
      preRequestScript,
      postRequestScript,
    });
  }

  /**
   * Parse Postman URL to string
   */
  private static parseUrl(url: PostmanUrl | string | undefined): string {
    if (!url) return '';

    if (typeof url === 'string') {
      return url;
    }

    if (url.raw) {
      return url.raw;
    }

    // Build URL from components
    let result = '';

    if (url.protocol) {
      result += `${url.protocol}://`;
    }

    if (url.host) {
      result += url.host.join('.');
    }

    if (url.port) {
      result += `:${url.port}`;
    }

    if (url.path) {
      result += '/' + url.path.join('/');
    }

    if (url.query && url.query.length > 0) {
      const queryParams = url.query
        .filter(q => !q.disabled)
        .map(q => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
        .join('&');
      if (queryParams) {
        result += `?${queryParams}`;
      }
    }

    return result;
  }

  /**
   * Parse Postman method to HttpMethod
   */
  private static parseMethod(method: string | undefined): HttpMethod {
    const m = (method || 'GET').toUpperCase();
    const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

    if (validMethods.includes(m as HttpMethod)) {
      return m as HttpMethod;
    }

    return 'GET';
  }

  /**
   * Parse Postman headers to RequestHeader[]
   */
  private static parseHeaders(headers: PostmanHeader[] | undefined): RequestHeader[] {
    if (!headers) return [];

    return headers.map(h => ({
      name: h.key,
      value: h.value,
      enabled: !h.disabled,
      description: h.description,
    }));
  }

  /**
   * Parse Postman body to RequestBody
   */
  private static parseBody(body: PostmanBody | undefined): RequestBody {
    if (!body || body.mode === 'none') {
      return { type: 'none' };
    }

    switch (body.mode) {
      case 'raw': {
        // Determine body type from options
        const language = body.options?.raw?.language || 'text';
        let bodyType: BodyType = 'raw';

        if (language === 'json') {
          bodyType = 'json';
        }

        return {
          type: bodyType,
          text: body.raw || '',
        };
      }

      case 'urlencoded': {
        const params: RequestBodyParam[] = (body.urlencoded || []).map(p => ({
          name: p.key,
          value: p.value,
          enabled: !p.disabled,
        }));

        return {
          type: 'form-urlencoded',
          params,
        };
      }

      case 'formdata': {
        const params: RequestBodyParam[] = (body.formdata || []).map(p => ({
          name: p.key,
          value: p.value || '',
          enabled: !p.disabled,
          type: p.type === 'file' ? 'file' : 'text',
          filePath: p.src,
        }));

        return {
          type: 'form-data',
          params,
        };
      }

      case 'graphql': {
        return {
          type: 'graphql',
          graphql: {
            query: body.graphql?.query || '',
            variables: body.graphql?.variables || '{}',
          },
        };
      }

      default:
        return { type: 'none' };
    }
  }

  /**
   * Parse Postman auth to Authentication
   */
  private static parseAuth(auth: PostmanAuth | undefined): Authentication {
    if (!auth) {
      return { type: 'none' };
    }

    switch (auth.type) {
      case 'basic': {
        const username = this.getAuthValue(auth.basic, 'username');
        const password = this.getAuthValue(auth.basic, 'password');

        return {
          type: 'basic',
          username,
          password,
        };
      }

      case 'bearer': {
        const token = this.getAuthValue(auth.bearer, 'token');

        return {
          type: 'bearer',
          token,
        };
      }

      case 'oauth2': {
        // OAuth2 is complex in Postman - we'll import basic config
        const accessToken = this.getAuthValue(auth.oauth2, 'accessToken');

        if (accessToken) {
          // If there's already a token, use bearer for simplicity
          return {
            type: 'bearer',
            token: accessToken,
          };
        }

        // Otherwise, try to import OAuth2 config
        return {
          type: 'oauth2',
          oauth2: {
            grantType: 'authorization_code',
            authUrl: this.getAuthValue(auth.oauth2, 'authUrl') || '',
            tokenUrl: this.getAuthValue(auth.oauth2, 'accessTokenUrl') || '',
            clientId: this.getAuthValue(auth.oauth2, 'clientId') || '',
            clientSecret: this.getAuthValue(auth.oauth2, 'clientSecret'),
            redirectUri: this.getAuthValue(auth.oauth2, 'redirect_uri') || 'http://localhost:8080/callback',
            scope: this.getAuthValue(auth.oauth2, 'scope'),
          },
        };
      }

      case 'apikey': {
        // API Key can be in header or query - we'll add as header
        const key = this.getAuthValue(auth.apikey, 'key');
        const value = this.getAuthValue(auth.apikey, 'value');
        const inLocation = this.getAuthValue(auth.apikey, 'in') || 'header';

        if (inLocation === 'header' && key && value) {
          // Return bearer-like with the API key
          return {
            type: 'bearer',
            token: value,
          };
        }

        return { type: 'none' };
      }

      case 'noauth':
      default:
        return { type: 'none' };
    }
  }

  /**
   * Get value from Postman auth key-value array
   */
  private static getAuthValue(authArray: PostmanKeyValue[] | undefined, key: string): string {
    if (!authArray) return '';
    const item = authArray.find(a => a.key === key);
    return item?.value || '';
  }

  /**
   * Parse Postman scripts (pre-request and test)
   */
  private static parseScripts(events: PostmanEvent[] | undefined): {
    preRequestScript?: string;
    postRequestScript?: string;
  } {
    if (!events || events.length === 0) {
      return {};
    }

    let preRequestScript: string | undefined;
    let postRequestScript: string | undefined;

    for (const event of events) {
      if (event.script?.exec && event.script.exec.length > 0) {
        const script = event.script.exec.join('\n');

        if (event.listen === 'prerequest') {
          preRequestScript = script;
        } else if (event.listen === 'test') {
          postRequestScript = script;
        }
      }
    }

    return { preRequestScript, postRequestScript };
  }

  /**
   * Validate if data is a Postman collection
   */
  static isPostmanCollection(data: unknown): data is PostmanCollection {
    if (!data || typeof data !== 'object') return false;

    const collection = data as Record<string, unknown>;

    // Check for Postman schema
    if (!collection.info || typeof collection.info !== 'object') return false;

    const info = collection.info as Record<string, unknown>;

    if (typeof info.schema !== 'string') return false;

    return info.schema.includes('getpostman.com') || info.schema.includes('postman');
  }
}
