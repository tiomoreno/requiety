// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PostmanParser } from './postman.parser';

describe('PostmanParser', () => {
  describe('isPostmanCollection', () => {
    it('should return true for valid Postman collection v2.1', () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      };

      expect(PostmanParser.isPostmanCollection(collection)).toBe(true);
    });

    it('should return true for valid Postman collection v2.0', () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
        },
        item: [],
      };

      expect(PostmanParser.isPostmanCollection(collection)).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(PostmanParser.isPostmanCollection(null)).toBe(false);
      expect(PostmanParser.isPostmanCollection({})).toBe(false);
      expect(PostmanParser.isPostmanCollection({ info: {} })).toBe(false);
      expect(PostmanParser.isPostmanCollection({ info: { schema: 'invalid' } })).toBe(false);
    });
  });

  describe('Parsing', () => {
    it('should parse URL object', () => {
      const url = {
        raw: 'https://api.example.com/users?page=1',
        protocol: 'https',
        host: ['api', 'example', 'com'],
        path: ['users'],
        query: [{ key: 'page', value: '1' }],
      };

      const result = PostmanParser.parseUrl(url);
      expect(result).toBe('https://api.example.com/users?page=1');
    });

    it('should parse string URL', () => {
      const result = PostmanParser.parseUrl('https://api.example.com');
      expect(result).toBe('https://api.example.com');
    });

    it('should parse headers', () => {
      const headers = [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Disabled', value: 'skip', disabled: true },
      ];

      const result = PostmanParser.parseHeaders(headers);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Content-Type',
        value: 'application/json',
        enabled: true,
        description: undefined,
      });
      expect(result[1]).toEqual({
        name: 'Disabled',
        value: 'skip',
        enabled: false,
        description: undefined,
      });
    });

    it('should parse JSON body', () => {
      const body = {
        mode: 'raw' as const,
        raw: '{"name": "test"}',
        options: {
          raw: { language: 'json' },
        },
      };

      const result = PostmanParser.parseBody(body);

      expect(result).toEqual({
        type: 'json',
        text: '{"name": "test"}',
      });
    });

    it('should parse form-urlencoded body', () => {
      const body = {
        mode: 'urlencoded' as const,
        urlencoded: [{ key: 'name', value: 'test' }],
      };

      const result = PostmanParser.parseBody(body);

      expect(result).toEqual({
        type: 'form-urlencoded',
        params: [{ name: 'name', value: 'test', enabled: true }],
      });
    });

    it('should parse basic auth', () => {
      const auth = {
        type: 'basic',
        basic: [
          { key: 'username', value: 'admin' },
          { key: 'password', value: 'secret' },
        ],
      };

      const result = PostmanParser.parseAuth(auth);

      expect(result).toEqual({
        type: 'basic',
        username: 'admin',
        password: 'secret',
      });
    });

    it('should parse scripts', () => {
      const events = [
        {
          listen: 'prerequest' as const,
          script: {
            exec: ['log("pre")', 'var x = 1'],
            type: 'text/javascript',
          },
        },
      ];

      const result = PostmanParser.parseScripts(events);

      expect(result.preRequestScript).toBe('log("pre")\nvar x = 1');
      expect(result.postRequestScript).toBeUndefined();
    });
  });
});
