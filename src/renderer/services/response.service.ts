import { Response, ApiResponse } from '../../shared/types';

export const responseService = {
  /**
   * Get response history for a request
   */
  async getHistory(requestId: string, limit: number = 20): Promise<Response[]> {
    const result = await window.api.response.getHistory(requestId, limit) as unknown as ApiResponse<Response[]>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get response history');
    }
    return result.data;
  },

  /**
   * Get response by ID
   */
  async getById(id: string): Promise<{ response: Response; body: string }> {
    const result = await window.api.response.getById(id) as unknown as ApiResponse<{ response: Response; body: string }>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get response');
    }
    return result.data;
  },

  /**
   * Delete response history
   */
  async deleteHistory(requestId: string): Promise<void> {
    const result = await window.api.response.deleteHistory(requestId) as unknown as ApiResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete response history');
    }
  },
};

