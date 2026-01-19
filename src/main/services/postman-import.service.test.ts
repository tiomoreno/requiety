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

  describe('importCollection', () => {
    it('should create workspace with collection name', async () => {
      const collection = {
        info: {
          name: 'My API Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      };

      await PostmanImportService.importCollection(collection as any);

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

      await PostmanImportService.importCollection(collection as any);

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

      await PostmanImportService.importCollection(collection as any);

      expect(models.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Get Users',
          method: 'GET',
          url: 'https://api.example.com/users',
          parentId: 'ws_1',
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

      await PostmanImportService.importCollection(collection as any);

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

      await PostmanImportService.importCollection(collection as any);

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
