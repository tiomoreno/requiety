import { Environment, ApiResponse } from '../../shared/types';

export const environmentService = {
  create: async (data: Pick<Environment, 'name' | 'workspaceId'>): Promise<Environment> => {
    const result = await window.api.environment.create(data) as unknown as ApiResponse<Environment>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create environment');
    }
    return result.data;
  },

  update: async (id: string, data: Partial<Pick<Environment, 'name'>>): Promise<Environment> => {
    const result = await window.api.environment.update(id, data) as unknown as ApiResponse<Environment>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update environment');
    }
    return result.data;
  },

  delete: async (id: string): Promise<void> => {
    const result = await window.api.environment.delete(id) as unknown as ApiResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete environment');
    }
  },

  activate: async (id: string): Promise<void> => {
    const result = await window.api.environment.activate(id) as unknown as ApiResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to activate environment');
    }
  },

  getByWorkspace: async (workspaceId: string): Promise<Environment[]> => {
    const result = await window.api.environment.getByWorkspace(workspaceId) as unknown as ApiResponse<Environment[]>;
    if (!result.success || !result.data) {
        // Return empty array if not found or some error that isn't critical? 
        // Or throw. API usually returns success: true, data: [] if empty.
        // If data is undefined but success is true, handle that.
      if (result.success && !result.data) return [];
      throw new Error(result.error || 'Failed to get environments');
    }
    return result.data;
  },
};
