// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCursor = {
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

const mockDb = {
  insert: vi.fn(),
  find: vi.fn(() => mockCursor),
  findOne: vi.fn(),
  remove: vi.fn(),
};

vi.mock('../index', () => ({
  getDatabase: vi.fn(() => mockDb),
  dbOperation: vi.fn((op) => {
    return new Promise((resolve, reject) => {
      op((err: unknown, result: unknown) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }),
}));

import {
  createResponse,
  getResponseHistory,
  getResponseById,
  deleteResponse,
  deleteResponseHistory,
} from './response.repository';

describe('response.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockImplementation((doc, cb) => cb(null, doc));
    mockDb.findOne.mockImplementation((query, cb) => cb(null, null));
    mockDb.remove.mockImplementation((query, opts, cb) => cb(null, 1));
    mockCursor.exec.mockImplementation((cb) => cb(null, []));
  });

  describe('createResponse', () => {
    it('should create a response with generated id and timestamps', async () => {
      const responseData = {
        requestId: 'req_123',
        statusCode: 200,
        statusMessage: 'OK',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        elapsedTime: 150,
        bodyPath: '/path/to/body.json',
      };

      const result = await createResponse(responseData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.stringMatching(/^res_/),
          type: 'Response',
          requestId: 'req_123',
          statusCode: 200,
          statusMessage: 'OK',
          elapsedTime: 150,
          created: expect.any(Number),
          modified: expect.any(Number),
        }),
        expect.any(Function)
      );
      expect(result.statusCode).toBe(200);
      expect(result.type).toBe('Response');
    });

    it('should create response with error status codes', async () => {
      const responseData = {
        requestId: 'req_123',
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        headers: [],
        elapsedTime: 50,
        bodyPath: '/path/to/error.json',
      };

      const result = await createResponse(responseData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          statusMessage: 'Internal Server Error',
        }),
        expect.any(Function)
      );
      expect(result.statusCode).toBe(500);
    });
  });

  describe('getResponseHistory', () => {
    it('should return response history sorted by created date descending with default limit', async () => {
      const responses = [
        { _id: 'res_3', requestId: 'req_123', statusCode: 200, created: 3000 },
        { _id: 'res_2', requestId: 'req_123', statusCode: 201, created: 2000 },
        { _id: 'res_1', requestId: 'req_123', statusCode: 500, created: 1000 },
      ];

      mockCursor.exec.mockImplementation((cb) => cb(null, responses));

      const result = await getResponseHistory('req_123');

      expect(mockDb.find).toHaveBeenCalledWith({ requestId: 'req_123' });
      expect(mockCursor.sort).toHaveBeenCalledWith({ created: -1 });
      expect(mockCursor.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(responses);
      expect(result).toHaveLength(3);
    });

    it('should respect custom limit parameter', async () => {
      const responses = [
        { _id: 'res_5', requestId: 'req_123', statusCode: 200, created: 5000 },
        { _id: 'res_4', requestId: 'req_123', statusCode: 200, created: 4000 },
        { _id: 'res_3', requestId: 'req_123', statusCode: 200, created: 3000 },
        { _id: 'res_2', requestId: 'req_123', statusCode: 200, created: 2000 },
        { _id: 'res_1', requestId: 'req_123', statusCode: 200, created: 1000 },
      ];

      mockCursor.exec.mockImplementation((cb) => cb(null, responses));

      const result = await getResponseHistory('req_123', 5);

      expect(mockCursor.limit).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(5);
    });

    it('should return empty array when no responses exist', async () => {
      mockCursor.exec.mockImplementation((cb) => cb(null, []));

      const result = await getResponseHistory('req_123');

      expect(result).toEqual([]);
    });
  });

  describe('getResponseById', () => {
    it('should return response by id', async () => {
      const response = {
        _id: 'res_123',
        type: 'Response',
        requestId: 'req_123',
        statusCode: 200,
        statusMessage: 'OK',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        elapsedTime: 150,
      };

      mockDb.findOne.mockImplementation((query, cb) => cb(null, response));

      const result = await getResponseById('res_123');

      expect(mockDb.findOne).toHaveBeenCalledWith({ _id: 'res_123' }, expect.any(Function));
      expect(result).toEqual(response);
    });

    it('should return null when response not found', async () => {
      mockDb.findOne.mockImplementation((query, cb) => cb(null, null));

      const result = await getResponseById('res_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteResponse', () => {
    it('should delete a single response', async () => {
      await deleteResponse('res_123');

      expect(mockDb.remove).toHaveBeenCalledWith({ _id: 'res_123' }, {}, expect.any(Function));
    });
  });

  describe('deleteResponseHistory', () => {
    it('should delete all responses for a request', async () => {
      await deleteResponseHistory('req_123');

      expect(mockDb.remove).toHaveBeenCalledWith(
        { requestId: 'req_123' },
        { multi: true },
        expect.any(Function)
      );
    });
  });
});
