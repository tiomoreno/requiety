import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestService } from './request.service';
import { HttpMethod } from '../../shared/types';

// Mock window.api
const mockRequestApi = {
  getByWorkspace: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  duplicate: vi.fn(),
  send: vi.fn(),
};

vi.stubGlobal('window', {
  api: {
    request: mockRequestApi
  }
});

describe('requestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getByWorkspace', () => {
    it('should call api.request.getByWorkspace', async () => {
      const mockRequests = [{ _id: '1', name: 'Req 1' }];
      mockRequestApi.getByWorkspace.mockResolvedValue({ success: true, data: mockRequests });

      const result = await requestService.getByWorkspace('ws_1');
      expect(mockRequestApi.getByWorkspace).toHaveBeenCalledWith('ws_1');
      expect(result).toEqual(mockRequests);
    });

    it('should throw error on failure', async () => {
      mockRequestApi.getByWorkspace.mockResolvedValue({ success: false, error: 'Failed' });
      await expect(requestService.getByWorkspace('ws_1')).rejects.toThrow('Failed');
    });
  });

  describe('create', () => {
    it('should call api.request.create', async () => {
      const newRequest = {
        name: 'New Req',
        url: 'http://test.com',
        method: 'GET' as HttpMethod,
        parentId: 'root',
        sortOrder: 0,
        headers: [],
        body: { type: 'none' } as any,
        authentication: { type: 'none' } as any
      };
      
      const createdRequest = { ...newRequest, _id: '123' };
      mockRequestApi.create.mockResolvedValue({ success: true, data: createdRequest });

      const result = await requestService.create(newRequest);
      expect(mockRequestApi.create).toHaveBeenCalledWith(newRequest);
      expect(result).toEqual(createdRequest);
    });
  });

  describe('update', () => {
    it('should call api.request.update', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedRequest = { _id: '1', name: 'Updated Name' };
      
      mockRequestApi.update.mockResolvedValue({ success: true, data: updatedRequest });

      const result = await requestService.update('1', updateData);
      expect(mockRequestApi.update).toHaveBeenCalledWith('1', updateData);
      expect(result).toEqual(updatedRequest);
    });
  });

  describe('delete', () => {
    it('should call api.request.delete', async () => {
      mockRequestApi.delete.mockResolvedValue({ success: true });
      await requestService.delete('1');
      expect(mockRequestApi.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('send', () => {
      it('should call api.request.send', async () => {
          const mockResponse = { statusCode: 200 };
          mockRequestApi.send.mockResolvedValue({ success: true, data: mockResponse });
          
          const result = await requestService.send('1');
          expect(mockRequestApi.send).toHaveBeenCalledWith('1');
          expect(result).toEqual(mockResponse);
      });
  });
});
