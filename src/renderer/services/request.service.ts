import type { Request, Response, RequestBody, Authentication } from '@shared/types';

/**
 * Request service - wrapper around window.api.request
 */
export const requestService = {
  /**
   * Get all requests in a workspace
   */
  async getByWorkspace(workspaceId: string): Promise<Request[]> {
    const result = await window.api.request.getByWorkspace(workspaceId);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get requests');
    }
    return result.data;
  },

  /**
   * Get request by ID
   */
  async getById(id: string): Promise<Request | null> {
    const result = await window.api.request.getById(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get request');
    }
    return result.data || null;
  },

  /**
   * Create a new request
   */
  async create(data: {
    name: string;
    url: string;
    method: HttpMethod;
    parentId: string;
    sortOrder: number;
    headers: Array<{ name: string; value: string; enabled: boolean }>;
    body: RequestBody;
    authentication: Authentication;
  }): Promise<Request> {
    const result = await window.api.request.create(data);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create request');
    }
    return result.data;
  },

  /**
   * Update request
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      url: string;
      method: HttpMethod;
      sortOrder: number;
      headers: Array<{ name: string; value: string; enabled: boolean }>;
      body: RequestBody;
      authentication: Authentication;
    }>
  ): Promise<Request> {
    const result = await window.api.request.update(id, data);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update request');
    }
    return result.data;
  },

  /**
   * Delete request
   */
  async delete(id: string): Promise<void> {
    const result = await window.api.request.delete(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete request');
    }
  },

  /**
   * Duplicate request
   */
  async duplicate(id: string): Promise<Request> {
    const result = await window.api.request.duplicate(id);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to duplicate request');
    }
    return result.data;
  },

  /**
   * Send request
   */
  async send(id: string): Promise<Response> {
    const result = await window.api.request.send(id);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to send request');
    }
    return result.data;
  },
};
