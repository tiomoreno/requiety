import type {
  HttpMethod,
  RequestHeader,
  RequestBody,
  RequestBodyParam,
  Authentication,
} from '@shared/types';

export interface ParsedCurlCommand {
  url: string;
  method: HttpMethod;
  headers: RequestHeader[];
  body: RequestBody;
  authentication: Authentication;
}

/**
 * Utility to parse cURL commands and convert them to request format
 */
export class CurlParser {
  /**
   * Parse a cURL command string into a request object
   */
  static parse(curlCommand: string): ParsedCurlCommand {
    // Normalize the command - remove line continuations and extra whitespace
    const normalized = this.normalizeCommand(curlCommand);

    // Tokenize the command
    const tokens = this.tokenize(normalized);

    // Validate it's a curl command
    if (tokens.length === 0 || tokens[0].toLowerCase() !== 'curl') {
      throw new Error('Invalid cURL command: must start with "curl"');
    }

    // Parse tokens
    let url = '';
    let method: HttpMethod = 'GET';
    const headers: RequestHeader[] = [];
    let bodyText = '';
    let bodyType: 'none' | 'json' | 'form-urlencoded' | 'form-data' | 'raw' = 'none';
    const formParams: RequestBodyParam[] = [];
    let authentication: Authentication = { type: 'none' };

    let i = 1; // Skip 'curl'
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.startsWith('-')) {
        // It's a flag
        const flag = token;

        switch (flag) {
          case '-X':
          case '--request':
            i++;
            if (i < tokens.length) {
              method = this.parseMethod(tokens[i]);
            }
            break;

          case '-H':
          case '--header':
            i++;
            if (i < tokens.length) {
              const header = this.parseHeader(tokens[i]);
              if (header) {
                headers.push(header);
              }
            }
            break;

          case '-d':
          case '--data':
          case '--data-raw':
          case '--data-binary':
            i++;
            if (i < tokens.length) {
              bodyText = tokens[i];
              // Try to detect if it's JSON
              if (this.isJson(bodyText)) {
                bodyType = 'json';
              } else if (bodyText.includes('=') && !bodyText.startsWith('{')) {
                bodyType = 'form-urlencoded';
              } else {
                bodyType = 'raw';
              }
              // If we have data but no explicit method, default to POST
              if (method === 'GET') {
                method = 'POST';
              }
            }
            break;

          case '--data-urlencode':
            i++;
            if (i < tokens.length) {
              if (bodyText) {
                bodyText += '&' + tokens[i];
              } else {
                bodyText = tokens[i];
              }
              bodyType = 'form-urlencoded';
              if (method === 'GET') {
                method = 'POST';
              }
            }
            break;

          case '-F':
          case '--form':
            i++;
            if (i < tokens.length) {
              const param = this.parseFormParam(tokens[i]);
              if (param) {
                formParams.push(param);
              }
              bodyType = 'form-data';
              if (method === 'GET') {
                method = 'POST';
              }
            }
            break;

          case '-u':
          case '--user':
            i++;
            if (i < tokens.length) {
              authentication = this.parseBasicAuth(tokens[i]);
            }
            break;

          case '-A':
          case '--user-agent':
            i++;
            if (i < tokens.length) {
              headers.push({
                name: 'User-Agent',
                value: tokens[i],
                enabled: true,
              });
            }
            break;

          case '-e':
          case '--referer':
            i++;
            if (i < tokens.length) {
              headers.push({
                name: 'Referer',
                value: tokens[i],
                enabled: true,
              });
            }
            break;

          case '-b':
          case '--cookie':
            i++;
            if (i < tokens.length) {
              headers.push({
                name: 'Cookie',
                value: tokens[i],
                enabled: true,
              });
            }
            break;

          case '--compressed':
            headers.push({
              name: 'Accept-Encoding',
              value: 'gzip, deflate, br',
              enabled: true,
            });
            break;

          case '-I':
          case '--head':
            method = 'HEAD';
            break;

          case '-G':
          case '--get':
            method = 'GET';
            break;

          case '-L':
          case '--location':
          case '-k':
          case '--insecure':
          case '-s':
          case '--silent':
          case '-S':
          case '--show-error':
          case '-v':
          case '--verbose':
          case '-i':
          case '--include':
            // These flags are ignored but valid
            break;

          case '-o':
          case '--output':
          case '-O':
          case '--remote-name':
          case '--connect-timeout':
          case '-m':
          case '--max-time':
          case '--retry':
          case '-w':
          case '--write-out':
            // These flags have values we ignore
            i++;
            break;

          default:
            // Unknown flag, skip
            if (!token.startsWith('--') && token.length === 2) {
              // Short flag might have value attached (e.g., -XPOST)
              const shortFlag = token.substring(0, 2);
              const value = token.substring(2);
              if (shortFlag === '-X' && value) {
                method = this.parseMethod(value);
              }
            }
            break;
        }
      } else {
        // It's likely a URL
        if (!url && (token.startsWith('http') || token.startsWith('/') || token.includes('.'))) {
          url = token;
        }
      }

      i++;
    }

    // Build body
    let body: RequestBody = { type: 'none' };
    if (bodyType === 'form-data' && formParams.length > 0) {
      body = {
        type: 'form-data',
        params: formParams,
      };
    } else if (bodyType === 'form-urlencoded' && bodyText) {
      body = {
        type: 'form-urlencoded',
        params: this.parseUrlEncodedParams(bodyText),
      };
    } else if (bodyType === 'json' && bodyText) {
      body = {
        type: 'json',
        text: bodyText,
      };
    } else if (bodyType === 'raw' && bodyText) {
      body = {
        type: 'raw',
        text: bodyText,
      };
    }

    // Check for Authorization header and convert to auth type
    const authHeaderIndex = headers.findIndex((h) => h.name.toLowerCase() === 'authorization');
    if (authHeaderIndex !== -1 && authentication.type === 'none') {
      const authHeader = headers[authHeaderIndex];
      const authValue = authHeader.value;

      if (authValue.toLowerCase().startsWith('bearer ')) {
        authentication = {
          type: 'bearer',
          token: authValue.substring(7).trim(),
        };
        headers.splice(authHeaderIndex, 1);
      } else if (authValue.toLowerCase().startsWith('basic ')) {
        const decoded = Buffer.from(authValue.substring(6).trim(), 'base64').toString('utf-8');
        const [username, password] = decoded.split(':');
        authentication = {
          type: 'basic',
          username: username || '',
          password: password || '',
        };
        headers.splice(authHeaderIndex, 1);
      }
    }

    if (!url) {
      throw new Error('Invalid cURL command: no URL found');
    }

    return {
      url,
      method,
      headers,
      body,
      authentication,
    };
  }

  /**
   * Normalize command by removing line continuations
   */
  private static normalizeCommand(command: string): string {
    // Use new RegExp with proper escaping
    // We want \s+ in the regex, so we need \\s+ in the string literal.
    return command
      .replace(new RegExp('\\\\\\r?\\n', 'g'), ' ') // Backslash newline
      .replace(new RegExp('\\r?\\n', 'g'), ' ') // Newline
      .replace(new RegExp('\\s+', 'g'), ' ') // Whitespace
      .trim();
  }

  /**
   * Tokenize command respecting quotes
   */
  private static tokenize(command: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Parse HTTP method
   */
  private static parseMethod(method: string): HttpMethod {
    const m = method.toUpperCase();
    const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (validMethods.includes(m as HttpMethod)) {
      return m as HttpMethod;
    }
    return 'GET';
  }

  /**
   * Parse a header string like "Content-Type: application/json"
   */
  private static parseHeader(headerStr: string): RequestHeader | null {
    const colonIndex = headerStr.indexOf(':');
    if (colonIndex === -1) return null;

    const name = headerStr.substring(0, colonIndex).trim();
    const value = headerStr.substring(colonIndex + 1).trim();

    if (!name) return null;

    return {
      name,
      value,
      enabled: true,
    };
  }

  /**
   * Parse form parameter like "field=value" or "file=@/path/to/file"
   */
  private static parseFormParam(paramStr: string): RequestBodyParam | null {
    const eqIndex = paramStr.indexOf('=');
    if (eqIndex === -1) return null;

    const name = paramStr.substring(0, eqIndex).trim();
    let value = paramStr.substring(eqIndex + 1).trim();
    let type: 'text' | 'file' = 'text';
    let filePath: string | undefined;

    // Check if it's a file upload
    if (value.startsWith('@')) {
      type = 'file';
      filePath = value.substring(1);
      value = '';
    }

    return {
      name,
      value,
      enabled: true,
      type,
      filePath,
    };
  }

  /**
   * Parse URL-encoded parameters
   */
  private static parseUrlEncodedParams(data: string): RequestBodyParam[] {
    const params: RequestBodyParam[] = [];
    const pairs = data.split('&');

    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) {
        params.push({
          name: decodeURIComponent(pair),
          value: '',
          enabled: true,
        });
      } else {
        params.push({
          name: decodeURIComponent(pair.substring(0, eqIndex)),
          value: decodeURIComponent(pair.substring(eqIndex + 1)),
          enabled: true,
        });
      }
    }

    return params;
  }

  /**
   * Parse basic auth string like "username:password"
   */
  private static parseBasicAuth(authStr: string): Authentication {
    const colonIndex = authStr.indexOf(':');
    if (colonIndex === -1) {
      return {
        type: 'basic',
        username: authStr,
        password: '',
      };
    }

    return {
      type: 'basic',
      username: authStr.substring(0, colonIndex),
      password: authStr.substring(colonIndex + 1),
    };
  }

  /**
   * Check if a string is valid JSON
   */
  private static isJson(str: string): boolean {
    const trimmed = str.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
    }
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a request name from URL
   */
  static generateRequestName(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      if (path === '/' || path === '') {
        return urlObj.hostname;
      }

      // Get last meaningful segment
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        // Capitalize first letter
        return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
      }

      return urlObj.hostname;
    } catch {
      return 'New Request';
    }
  }
}
