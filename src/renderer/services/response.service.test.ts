// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { responseService } from './response.service';

describe('ResponseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window = {
      api: {
        response: {
          getHistory: vi.fn(),
          getById: vi.fn(),
          deleteHistory: vi.fn(),
        },
      },
    } as any;
  });

  it('getHistory should return responses', async () => {
    const mockRes = [{ _id: 'r1' }];
    vi.mocked(window.api.response.getHistory).mockResolvedValue({ success: true, data: mockRes });
    const result = await responseService.getHistory('req1');
    expect(result).toEqual(mockRes);
  });

  it('getHistory should throw on failure', async () => {
    vi.mocked(window.api.response.getHistory).mockResolvedValue({ success: false });
    await expect(responseService.getHistory('req1')).rejects.toThrow(
      'Failed to get response history'
    );
  });

  it('getById should return response and body', async () => {
    const mockData = { response: { _id: 'r1' }, body: '{}' };
    vi.mocked(window.api.response.getById).mockResolvedValue({ success: true, data: mockData });
    const result = await responseService.getById('r1');
    expect(result).toEqual(mockData);
  });

  it('deleteHistory should succeed', async () => {
    vi.mocked(window.api.response.deleteHistory).mockResolvedValue({ success: true });
    await responseService.deleteHistory('req1');
    expect(window.api.response.deleteHistory).toHaveBeenCalledWith('req1');
  });
});
