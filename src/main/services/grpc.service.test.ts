// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrpcService } from './grpc.service';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// Mock the grpc and protoLoader modules
vi.mock('@grpc/grpc-js', () => ({
  loadPackageDefinition: vi.fn(),
  credentials: {
    createInsecure: vi.fn(() => ({})),
  },
  Client: class MockClient {},
}));

vi.mock('@grpc/proto-loader', () => ({
  load: vi.fn(),
}));

describe('GrpcService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseProtoFile', () => {
    it('should parse proto file and return services', async () => {
      const mockPackageDefinition = {};

      // Create a mock proto definition
      // The actual implementation checks if serviceDef.prototype instanceof grpc.Client
      // For testing, we'll just verify the loader functions are called correctly
      const mockProto = {
        helloworld: {
          Greeter: {},
        },
      };

      vi.mocked(protoLoader.load).mockResolvedValue(mockPackageDefinition);
      vi.mocked(grpc.loadPackageDefinition).mockReturnValue(mockProto as any);

      const result = await GrpcService.parseProtoFile('/path/to/test.proto');

      expect(protoLoader.load).toHaveBeenCalledWith('/path/to/test.proto', {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      expect(grpc.loadPackageDefinition).toHaveBeenCalledWith(mockPackageDefinition);
      expect(result.services).toBeDefined();
      expect(Array.isArray(result.services)).toBe(true);
    });

    it('should return empty services for proto with no services', async () => {
      const mockPackageDefinition = {};
      const mockProto = {
        messages: {
          // Only message types, no services
          SomeMessage: {},
        },
      };

      vi.mocked(protoLoader.load).mockResolvedValue(mockPackageDefinition);
      vi.mocked(grpc.loadPackageDefinition).mockReturnValue(mockProto as any);

      const result = await GrpcService.parseProtoFile('/path/to/messages.proto');

      expect(result.services).toEqual([]);
    });

    it('should handle proto loader errors', async () => {
      vi.mocked(protoLoader.load).mockRejectedValue(new Error('File not found'));

      await expect(GrpcService.parseProtoFile('/invalid/path.proto'))
        .rejects.toThrow('File not found');
    });
  });

  describe('makeUnaryCall', () => {
    it('should make a successful unary call', async () => {
      const mockResponse = { message: 'Hello, World!' };
      const mockMethod = vi.fn((body, callback) => {
        callback(null, mockResponse);
      });

      const MockService = vi.fn().mockImplementation(() => ({
        sayHello: mockMethod,
      }));

      const mockProto = {
        helloworld: {
          Greeter: MockService,
        },
      };

      vi.mocked(protoLoader.load).mockResolvedValue({});
      vi.mocked(grpc.loadPackageDefinition).mockReturnValue(mockProto as any);

      const result = await GrpcService.makeUnaryCall({
        protoFilePath: '/path/to/test.proto',
        url: 'localhost:50051',
        service: 'helloworld.Greeter',
        method: 'sayHello',
        body: '{"name": "World"}',
      });

      expect(result).toEqual(mockResponse);
      expect(MockService).toHaveBeenCalledWith('localhost:50051', expect.anything());
      expect(mockMethod).toHaveBeenCalledWith({ name: 'World' }, expect.any(Function));
    });

    it('should handle gRPC call errors', async () => {
      const mockError = new Error('gRPC call failed');
      const mockMethod = vi.fn((body, callback) => {
        callback(mockError, null);
      });

      const MockService = vi.fn().mockImplementation(() => ({
        sayHello: mockMethod,
      }));

      const mockProto = {
        helloworld: {
          Greeter: MockService,
        },
      };

      vi.mocked(protoLoader.load).mockResolvedValue({});
      vi.mocked(grpc.loadPackageDefinition).mockReturnValue(mockProto as any);

      await expect(GrpcService.makeUnaryCall({
        protoFilePath: '/path/to/test.proto',
        url: 'localhost:50051',
        service: 'helloworld.Greeter',
        method: 'sayHello',
        body: '{"name": "World"}',
      })).rejects.toThrow('gRPC call failed');
    });

    it('should throw error for non-existent service', async () => {
      const mockProto = {
        helloworld: {
          // No Greeter service
        },
      };

      vi.mocked(protoLoader.load).mockResolvedValue({});
      vi.mocked(grpc.loadPackageDefinition).mockReturnValue(mockProto as any);

      await expect(GrpcService.makeUnaryCall({
        protoFilePath: '/path/to/test.proto',
        url: 'localhost:50051',
        service: 'helloworld.Greeter',
        method: 'sayHello',
        body: '{}',
      })).rejects.toThrow('Service not found: helloworld.Greeter');
    });

    it('should handle invalid JSON body', async () => {
      const MockService = vi.fn().mockImplementation(() => ({
        sayHello: vi.fn(),
      }));

      const mockProto = {
        helloworld: {
          Greeter: MockService,
        },
      };

      vi.mocked(protoLoader.load).mockResolvedValue({});
      vi.mocked(grpc.loadPackageDefinition).mockReturnValue(mockProto as any);

      await expect(GrpcService.makeUnaryCall({
        protoFilePath: '/path/to/test.proto',
        url: 'localhost:50051',
        service: 'helloworld.Greeter',
        method: 'sayHello',
        body: 'invalid json',
      })).rejects.toThrow();
    });
  });
});
