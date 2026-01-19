// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { CurlParser } from './curl.parser';

describe('CurlParser', () => {
  describe('parse', () => {
    describe('basic commands', () => {
      it('should parse simple GET request', () => {
        const result = CurlParser.parse('curl https://api.example.com/users');

        expect(result.url).toBe('https://api.example.com/users');
        expect(result.method).toBe('GET');
        expect(result.headers).toEqual([]);
        expect(result.body.type).toBe('none');
        expect(result.authentication.type).toBe('none');
      });

      it('should parse command with explicit GET method', () => {
        const result = CurlParser.parse('curl -X GET https://api.example.com');

        expect(result.method).toBe('GET');
      });

      it('should parse command with --request flag', () => {
        const result = CurlParser.parse('curl --request POST https://api.example.com');

        expect(result.method).toBe('POST');
      });

      it('should parse all HTTP methods', () => {
        expect(CurlParser.parse('curl -X POST https://example.com').method).toBe('POST');
        expect(CurlParser.parse('curl -X PUT https://example.com').method).toBe('PUT');
        expect(CurlParser.parse('curl -X DELETE https://example.com').method).toBe('DELETE');
        expect(CurlParser.parse('curl -X PATCH https://example.com').method).toBe('PATCH');
        expect(CurlParser.parse('curl -X HEAD https://example.com').method).toBe('HEAD');
        expect(CurlParser.parse('curl -X OPTIONS https://example.com').method).toBe('OPTIONS');
      });

      it('should throw error for non-curl commands', () => {
        expect(() => CurlParser.parse('wget https://example.com')).toThrow('Invalid cURL command');
      });

      it('should throw error for missing URL', () => {
        expect(() => CurlParser.parse('curl -X GET')).toThrow('no URL found');
      });

      it('should handle URL without http prefix', () => {
        const result = CurlParser.parse('curl api.example.com/users');
        expect(result.url).toBe('api.example.com/users');
      });
    });

    describe('headers', () => {
      it('should parse single header with -H', () => {
        const result = CurlParser.parse(
          'curl -H "Content-Type: application/json" https://api.example.com'
        );

        expect(result.headers).toEqual([
          { name: 'Content-Type', value: 'application/json', enabled: true },
        ]);
      });

      it('should parse multiple headers', () => {
        const result = CurlParser.parse(
          'curl -H "Content-Type: application/json" -H "Accept: application/json" https://api.example.com'
        );

        expect(result.headers).toHaveLength(2);
        expect(result.headers[0]).toEqual({
          name: 'Content-Type',
          value: 'application/json',
          enabled: true,
        });
        expect(result.headers[1]).toEqual({
          name: 'Accept',
          value: 'application/json',
          enabled: true,
        });
      });

      it('should parse header with --header flag', () => {
        const result = CurlParser.parse(
          'curl --header "X-Custom-Header: my-value" https://api.example.com'
        );

        expect(result.headers).toHaveLength(1);
        expect(result.headers[0].name).toBe('X-Custom-Header');
        expect(result.headers[0].value).toBe('my-value');
      });

      it('should parse User-Agent with -A flag', () => {
        const result = CurlParser.parse('curl -A "My Custom Agent" https://api.example.com');

        expect(result.headers).toContainEqual({
          name: 'User-Agent',
          value: 'My Custom Agent',
          enabled: true,
        });
      });

      it('should parse Referer with -e flag', () => {
        const result = CurlParser.parse('curl -e "https://referrer.com" https://api.example.com');

        expect(result.headers).toContainEqual({
          name: 'Referer',
          value: 'https://referrer.com',
          enabled: true,
        });
      });

      it('should parse Cookie with -b flag', () => {
        const result = CurlParser.parse('curl -b "session=abc123" https://api.example.com');

        expect(result.headers).toContainEqual({
          name: 'Cookie',
          value: 'session=abc123',
          enabled: true,
        });
      });

      it('should add Accept-Encoding with --compressed flag', () => {
        const result = CurlParser.parse('curl --compressed https://api.example.com');

        expect(result.headers).toContainEqual({
          name: 'Accept-Encoding',
          value: 'gzip, deflate, br',
          enabled: true,
        });
      });
    });

    describe('body', () => {
      it('should parse JSON body with -d flag', () => {
        const result = CurlParser.parse('curl -d \'{"name": "John"}\' https://api.example.com');

        expect(result.body.type).toBe('json');
        expect(result.body.text).toBe('{"name": "John"}');
        expect(result.method).toBe('POST'); // Should default to POST
      });

      it('should parse body with --data flag', () => {
        const result = CurlParser.parse('curl --data \'{"test": true}\' https://api.example.com');

        expect(result.body.type).toBe('json');
        expect(result.body.text).toBe('{"test": true}');
      });

      it('should parse body with --data-raw flag', () => {
        const result = CurlParser.parse('curl --data-raw "raw data" https://api.example.com');

        expect(result.body.type).toBe('raw');
        expect(result.body.text).toBe('raw data');
      });

      it('should parse form-urlencoded body', () => {
        const result = CurlParser.parse(
          'curl -d "username=john&password=secret" https://api.example.com/login'
        );

        expect(result.body.type).toBe('form-urlencoded');
        expect(result.body.params).toHaveLength(2);
        expect(result.body.params?.[0]).toEqual({ name: 'username', value: 'john', enabled: true });
        expect(result.body.params?.[1]).toEqual({
          name: 'password',
          value: 'secret',
          enabled: true,
        });
      });

      it('should parse --data-urlencode flag', () => {
        const result = CurlParser.parse(
          'curl --data-urlencode "name=John Doe" https://api.example.com'
        );

        expect(result.body.type).toBe('form-urlencoded');
        expect(result.body.params).toContainEqual({
          name: 'name',
          value: 'John Doe',
          enabled: true,
        });
      });

      it('should parse form-data with -F flag', () => {
        const result = CurlParser.parse(
          'curl -F "name=John" -F "email=john@example.com" https://api.example.com'
        );

        expect(result.body.type).toBe('form-data');
        expect(result.body.params).toHaveLength(2);
        expect(result.body.params?.[0]).toEqual({
          name: 'name',
          value: 'John',
          enabled: true,
          type: 'text',
          filePath: undefined,
        });
      });

      it('should parse file upload in form-data', () => {
        const result = CurlParser.parse(
          'curl -F "file=@/path/to/file.txt" https://api.example.com'
        );

        expect(result.body.type).toBe('form-data');
        expect(result.body.params?.[0]).toEqual({
          name: 'file',
          value: '',
          enabled: true,
          type: 'file',
          filePath: '/path/to/file.txt',
        });
      });

      it('should keep explicit method when data is present', () => {
        const result = CurlParser.parse(
          'curl -X PUT -d \'{"update": true}\' https://api.example.com'
        );

        expect(result.method).toBe('PUT');
      });
    });

    describe('authentication', () => {
      it('should parse basic auth with -u flag', () => {
        const result = CurlParser.parse('curl -u admin:password123 https://api.example.com');

        expect(result.authentication).toEqual({
          type: 'basic',
          username: 'admin',
          password: 'password123',
        });
      });

      it('should parse basic auth with --user flag', () => {
        const result = CurlParser.parse('curl --user john:secret https://api.example.com');

        expect(result.authentication).toEqual({
          type: 'basic',
          username: 'john',
          password: 'secret',
        });
      });

      it('should parse basic auth without password', () => {
        const result = CurlParser.parse('curl -u username https://api.example.com');

        expect(result.authentication).toEqual({
          type: 'basic',
          username: 'username',
          password: '',
        });
      });

      it('should convert Authorization Bearer header to bearer auth', () => {
        const result = CurlParser.parse(
          'curl -H "Authorization: Bearer my-jwt-token" https://api.example.com'
        );

        expect(result.authentication).toEqual({
          type: 'bearer',
          token: 'my-jwt-token',
        });
        expect(
          result.headers.find((h) => h.name.toLowerCase() === 'authorization')
        ).toBeUndefined();
      });

      it('should convert Authorization Basic header to basic auth', () => {
        // base64("admin:secret") = "YWRtaW46c2VjcmV0"
        const result = CurlParser.parse(
          'curl -H "Authorization: Basic YWRtaW46c2VjcmV0" https://api.example.com'
        );

        expect(result.authentication).toEqual({
          type: 'basic',
          username: 'admin',
          password: 'secret',
        });
        expect(
          result.headers.find((h) => h.name.toLowerCase() === 'authorization')
        ).toBeUndefined();
      });
    });

    describe('special flags', () => {
      it('should set HEAD method with -I flag', () => {
        const result = CurlParser.parse('curl -I https://api.example.com');
        expect(result.method).toBe('HEAD');
      });

      it('should set HEAD method with --head flag', () => {
        const result = CurlParser.parse('curl --head https://api.example.com');
        expect(result.method).toBe('HEAD');
      });

      it('should set GET method with -G flag', () => {
        const result = CurlParser.parse('curl -G https://api.example.com');
        expect(result.method).toBe('GET');
      });

      it('should have -d override -G flag method', () => {
        const result = CurlParser.parse('curl -G -d "query=test" https://api.example.com');
        expect(result.method).toBe('POST');
        expect(result.body.type).toBe('form-urlencoded');
      });

      it('should ignore -L/--location flag', () => {
        const result = CurlParser.parse('curl -L https://api.example.com');
        expect(result.url).toBe('https://api.example.com');
      });

      it('should ignore -k/--insecure flag', () => {
        const result = CurlParser.parse('curl -k https://api.example.com');
        expect(result.url).toBe('https://api.example.com');
      });

      it('should ignore -s/--silent flag', () => {
        const result = CurlParser.parse('curl -s https://api.example.com');
        expect(result.url).toBe('https://api.example.com');
      });

      it('should ignore -v/--verbose flag', () => {
        const result = CurlParser.parse('curl -v https://api.example.com');
        expect(result.url).toBe('https://api.example.com');
      });

      it('should ignore -o/--output flag with value', () => {
        const result = CurlParser.parse('curl -o output.txt https://api.example.com');
        expect(result.url).toBe('https://api.example.com');
      });
    });

    describe('multiline and escaping', () => {
      it('should handle line continuations with backslash', () => {
        const result = CurlParser.parse(`curl \
          -X POST \
          -H "Content-Type: application/json" \
          https://api.example.com`);

        expect(result.method).toBe('POST');
        expect(result.headers[0].name).toBe('Content-Type');
        expect(result.url).toBe('https://api.example.com');
      });

      it('should handle single quoted strings', () => {
        const result = CurlParser.parse('curl -d \'{"name": "John"}\' https://api.example.com');

        expect(result.body.text).toBe('{"name": "John"}');
      });

      it('should handle double quoted strings', () => {
        const result = CurlParser.parse('curl -d "hello world" https://api.example.com');

        expect(result.body.text).toBe('hello world');
      });

      it('should handle escaped characters', () => {
        const result = CurlParser.parse(
          'curl -H "Content-Type: text\\/plain" https://api.example.com'
        );

        expect(result.headers[0].value).toBe('text/plain');
      });
    });

    describe('complex real-world examples', () => {
      it('should parse typical POST request with JSON', () => {
        const result = CurlParser.parse(`
          curl -X POST https://api.example.com/users \
            -H 'Content-Type: application/json' \
            -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' \
            -d '{"name": "John", "email": "john@example.com"}'
        `);

        expect(result.method).toBe('POST');
        expect(result.url).toBe('https://api.example.com/users');
        expect(result.headers).toContainEqual({
          name: 'Content-Type',
          value: 'application/json',
          enabled: true,
        });
        expect(result.authentication.type).toBe('bearer');
        expect(result.body.type).toBe('json');
      });

      it('should parse GitHub API example', () => {
        const result = CurlParser.parse(`
          curl -X GET https://api.github.com/repos/owner/repo/issues \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ghp_xxxxxxxxxxxx" \
            -H "X-GitHub-Api-Version: 2022-11-28"
        `);

        expect(result.method).toBe('GET');
        expect(result.url).toBe('https://api.github.com/repos/owner/repo/issues');
        expect(result.headers).toHaveLength(2); // Authorization converted to auth
        expect(result.authentication.type).toBe('bearer');
      });

      it('should parse form submission with file upload', () => {
        const result = CurlParser.parse(`
          curl -X POST https://api.example.com/upload \
            -F "file=@/path/to/image.png" \
            -F "description=My image" \
            -F "tags=photo,nature"
        `);

        expect(result.method).toBe('POST');
        expect(result.body.type).toBe('form-data');
        expect(result.body.params).toHaveLength(3);
        expect(result.body.params?.[0].type).toBe('file');
        expect(result.body.params?.[1].type).toBe('text');
      });
    });
  });

  describe('generateRequestName', () => {
    it('should use last path segment', () => {
      expect(CurlParser.generateRequestName('https://api.example.com/users')).toBe('Users');
      expect(CurlParser.generateRequestName('https://api.example.com/api/v1/products')).toBe(
        'Products'
      );
    });

    it('should use hostname for root path', () => {
      expect(CurlParser.generateRequestName('https://api.example.com')).toBe('api.example.com');
      expect(CurlParser.generateRequestName('https://api.example.com/')).toBe('api.example.com');
    });

    it('should capitalize first letter', () => {
      expect(CurlParser.generateRequestName('https://api.example.com/items')).toBe('Items');
    });

    it('should return default for invalid URLs', () => {
      expect(CurlParser.generateRequestName('not-a-url')).toBe('New Request');
    });
  });
});
