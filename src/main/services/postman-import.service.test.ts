// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostmanImportService } from './postman-import.service';
import * as models from '../database/models';

// Mock database models
vi.mock('../database/models');

describe('PostmanImportService', () => {
  const mockWorkspace = {
    _id: 'ws_1',
    type: 'Workspace',
    name: 'Test Collection',
    created: Date.now(),
    modified: Date.now(),
  };

  const mockEnvironment = {
    _id: 'env_1',
    type: 'Environment',
    name: 'Collection Variables',
    workspaceId: 'ws_1',
    isActive: false,
    created: Date.now(),
    modified: Date.now(),
  };

  const mockFolder = {
    _id: 'folder_1',
    type: 'Folder',
    name: 'Test Folder',
    parentId: 'ws_1',
    sortOrder: 0,
    created: Date.now(),
    modified: Date.now(),
  };

  const mockRequest = {
    _id: 'req_1',
    type: 'Request',
    name: 'Test Request',
    url: 'https://api.example.com',
    method: 'GET',
    parentId: 'ws_1',
    sortOrder: 0,
    headers: [],
    body: { type: 'none' },
    authentication: { type: 'none' },
    created: Date.now(),
    modified: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(models.createWorkspace).mockResolvedValue(mockWorkspace as any);
    vi.mocked(models.createEnvironment).mockResolvedValue(mockEnvironment as any);
    vi.mocked(models.createVariable).mockResolvedValue({} as any);
    vi.mocked(models.createFolder).mockResolvedValue(mockFolder as any);
    vi.mocked(models.createRequest).mockResolvedValue(mockRequest as any);
  });

  describe('isPostmanCollection', () => {
    it('should return true for valid Postman collection v2.1', () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      };

      expect(PostmanImportService.isPostmanCollection(collection)).toBe(true);
    });

    it('should return true for valid Postman collection v2.0', () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
        },
        item: [],
      };

      expect(PostmanImportService.isPostmanCollection(collection)).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(PostmanImportService.isPostmanCollection(null)).toBe(false);
      expect(PostmanImportService.isPostmanCollection({})).toBe(false);
      expect(PostmanImportService.isPostmanCollection({ info: {} })).toBe(false);
      expect(PostmanImportService.isPostmanCollection({ info: { schema: 'invalid' } })).toBe(false);
    });
  });

  describe('importCollection', () => {
    it('should create workspace with collection name', async () => {
      const collection = {
        info: {
          name: 'My API Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createWorkspace).toHaveBeenCalledWith({
        name: 'My API Collection',
      });
    });

    it('should import collection variables as environment', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
        variable: [
          { key: 'baseUrl', value: 'https://api.example.com' },
          { key: 'apiKey', value: 'secret123' },
          { key: 'disabled', value: 'skip', disabled: true },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createEnvironment).toHaveBeenCalledWith({
        name: 'Collection Variables',
        workspaceId: 'ws_1',
      });

      expect(models.createVariable).toHaveBeenCalledTimes(2); // disabled one skipped
      expect(models.createVariable).toHaveBeenCalledWith({
        environmentId: 'env_1',
        key: 'baseUrl',
        value: 'https://api.example.com',
        isSecret: false,
      });
    });

    it('should import simple GET request', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'Get Users',
            request: {
              method: 'GET',
              url: 'https://api.example.com/users',
            },
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Get Users',
          method: 'GET',
          url: 'https://api.example.com/users',
          parentId: 'ws_1',
        })
      );
    });

    it('should import request with URL object', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'Complex URL',
            request: {
              method: 'GET',
              url: {
                raw: 'https://api.example.com/users?page=1',
                protocol: 'https',
                host: ['api', 'example', 'com'],
                path: ['users'],
                query: [{ key: 'page', value: '1' }],
              },
            },
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/users?page=1',
        })
      );
    });

    it('should import request headers', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'With Headers',
            request: {
              method: 'GET',
              url: 'https://api.example.com',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer token123' },
                { key: 'Disabled', value: 'skip', disabled: true },
              ],
            },
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: [
            { name: 'Content-Type', value: 'application/json', enabled: true, description: undefined },
            { name: 'Authorization', value: 'Bearer token123', enabled: true, description: undefined },
            { name: 'Disabled', value: 'skip', enabled: false, description: undefined },
          ],
        })
      );
    });

    it('should import JSON body', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'POST with JSON',
            request: {
              method: 'POST',
              url: 'https://api.example.com/users',
              body: {
                mode: 'raw',
                raw: '{"name": "John", "email": "john@example.com"}',
                options: {
                  raw: { language: 'json' },
                },
              },
            },
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            type: 'json',
            text: '{"name": "John", "email": "john@example.com"}',
          },
        })
      );
    });

    it('should import form-urlencoded body', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'Form Data',
            request: {
              method: 'POST',
              url: 'https://api.example.com/login',
              body: {
                mode: 'urlencoded',
                urlencoded: [
                  { key: 'username', value: 'john' },
                  { key: 'password', value: 'secret' },
                ],
              },
            },
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            type: 'form-urlencoded',
            params: [
              { name: 'username', value: 'john', enabled: true },
              { name: 'password', value: 'secret', enabled: true },
            ],
          },
        })
      );
    });

    it('should import GraphQL body', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'GraphQL Query',
            request: {
              method: 'POST',
              url: 'https://api.example.com/graphql',
              body: {
                mode: 'graphql',
                graphql: {
                  query: 'query { users { id name } }',
                  variables: '{"limit": 10}',
                },
              },
            },
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            type: 'graphql',
            graphql: {
              query: 'query { users { id name } }',
              variables: '{"limit": 10}',
            },
          },
        })
      );
    });

    it('should import basic authentication', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'With Basic Auth',
            request: {
              method: 'GET',
              url: 'https://api.example.com',
              auth: {
                type: 'basic',
                basic: [
                  { key: 'username', value: 'admin' },
                  { key: 'password', value: 'secret' },
                ],
              },
            },
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          authentication: {
            type: 'basic',
            username: 'admin',
            password: 'secret',
          },
        })
      );
    });

    it('should import bearer token authentication', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'With Bearer',
            request: {
              method: 'GET',
              url: 'https://api.example.com',
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: 'my-jwt-token' }],
              },
            },
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          authentication: {
            type: 'bearer',
            token: 'my-jwt-token',
          },
        })
      );
    });

    it('should import folders with requests', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'Users API',
            item: [
              {
                name: 'List Users',
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/users',
                },
              },
              {
                name: 'Create User',
                request: {
                  method: 'POST',
                  url: 'https://api.example.com/users',
                },
              },
            ],
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createFolder).toHaveBeenCalledWith({
        name: 'Users API',
        parentId: 'ws_1',
        sortOrder: 0,
      });

      expect(models.createRequest).toHaveBeenCalledTimes(2);
      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'List Users',
          parentId: 'folder_1',
        })
      );
    });

    it('should import nested folders', async () => {
      let folderCount = 0;
      vi.mocked(models.createFolder).mockImplementation(async (data) => ({
        _id: `folder_${++folderCount}`,
        type: 'Folder',
        ...data,
        created: Date.now(),
        modified: Date.now(),
      } as any));

      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'API',
            item: [
              {
                name: 'v1',
                item: [
                  {
                    name: 'Get Data',
                    request: { method: 'GET', url: 'https://api.example.com/v1/data' },
                  },
                ],
              },
            ],
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createFolder).toHaveBeenCalledTimes(2);
      expect(models.createFolder).toHaveBeenNthCalledWith(1, expect.objectContaining({ name: 'API' }));
      expect(models.createFolder).toHaveBeenNthCalledWith(2, expect.objectContaining({ name: 'v1', parentId: 'folder_1' }));
    });

    it('should import pre-request and test scripts', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'With Scripts',
            request: {
              method: 'GET',
              url: 'https://api.example.com',
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: ['console.log("pre");', 'pm.environment.set("token", "123");'],
                  type: 'text/javascript',
                },
              },
              {
                listen: 'test',
                script: {
                  exec: ['pm.test("Status 200", function() {', '  pm.response.to.have.status(200);', '});'],
                  type: 'text/javascript',
                },
              },
            ],
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          preRequestScript: 'console.log("pre");\npm.environment.set("token", "123");',
          postRequestScript: 'pm.test("Status 200", function() {\n  pm.response.to.have.status(200);\n});',
        })
      );
    });

    it('should throw error for unsupported collection format', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v1.0.0/collection.json',
        },
        item: [],
      };

      await expect(PostmanImportService.importCollection(collection as any))
        .rejects.toThrow('Unsupported Postman collection format');
    });

    it('should inherit authentication from collection level', async () => {
      const collection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        auth: {
          type: 'bearer',
          bearer: [{ key: 'token', value: 'collection-token' }],
        },
        item: [
          {
            name: 'Inherits Auth',
            request: {
              method: 'GET',
              url: 'https://api.example.com',
            },
          },
        ],
      };

      await PostmanImportService.importCollection(collection);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          authentication: {
            type: 'bearer',
            token: 'collection-token',
          },
        })
      );
    });
  });
});
