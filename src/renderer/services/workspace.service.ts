import type { Workspace, ApiResponse } from '@shared/types';

/**
 * Workspace service - wrapper around window.api.workspace
 */
export const workspaceService = {
  /**
   * Get all workspaces
   */
  async getAll(): Promise<Workspace[]> {
    const result = (await window.api.workspace.getAll()) as unknown as ApiResponse<Workspace[]>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get workspaces');
    }
    return result.data;
  },

  /**
   * Get workspace by ID
   */
  async getById(id: string): Promise<Workspace | null> {
    const result = (await window.api.workspace.getById(
      id
    )) as unknown as ApiResponse<Workspace | null>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get workspace');
    }
    return result.data || null;
  },

  /**
   * Create a new workspace
   */
  async create(name: string): Promise<Workspace> {
    const result = (await window.api.workspace.create({
      name,
    })) as unknown as ApiResponse<Workspace>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create workspace');
    }
    return result.data;
  },

  /**
   * Update workspace
   */
  async update(id: string, data: { name: string }): Promise<Workspace> {
    const result = (await window.api.workspace.update(
      id,
      data
    )) as unknown as ApiResponse<Workspace>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update workspace');
    }
    return result.data;
  },

  /**
   * Delete workspace
   */
  async delete(id: string): Promise<void> {
    const result = (await window.api.workspace.delete(id)) as unknown as ApiResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete workspace');
    }
  },
};
