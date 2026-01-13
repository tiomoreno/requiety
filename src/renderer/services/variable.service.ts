import { Variable, ApiResponse } from '../../shared/types';

export const variableService = {
  create: async (data: Pick<Variable, 'environmentId' | 'key' | 'value' | 'isSecret'>): Promise<Variable> => {
    const result = await window.api.variable.create(data) as unknown as ApiResponse<Variable>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create variable');
    }
    return result.data;
  },

  update: async (id: string, data: Partial<Pick<Variable, 'key' | 'value' | 'isSecret'>>): Promise<Variable> => {
    const result = await window.api.variable.update(id, data) as unknown as ApiResponse<Variable>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update variable');
    }
    return result.data;
  },

  delete: async (id: string): Promise<void> => {
    const result = await window.api.variable.delete(id) as unknown as ApiResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete variable');
    }
  },

  getByEnvironment: async (environmentId: string): Promise<Variable[]> => {
    const result = await window.api.variable.getByEnvironment(environmentId) as unknown as ApiResponse<Variable[]>;
    if (!result.success || !result.data) {
      if (result.success && !result.data) return [];
      throw new Error(result.error || 'Failed to get variables');
    }
    return result.data;
  },
};
