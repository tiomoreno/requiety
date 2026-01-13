import type { Folder, ApiResponse } from '../../shared/types';

/**
 * Folder service - wrapper around window.api.folder
 */
export const folderService = {
  /**
   * Get all folders in a workspace
   */
  async getByWorkspace(workspaceId: string): Promise<Folder[]> {
    const result = await window.api.folder.getByWorkspace(workspaceId) as unknown as ApiResponse<Folder[]>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get folders');
    }
    return result.data;
  },

  /**
   * Create a new folder
   */
  async create(data: {
    name: string;
    parentId: string;
    sortOrder: number;
  }): Promise<Folder> {
    const result = await window.api.folder.create(data) as ApiResponse<Folder>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create folder');
    }
    return result.data;
  },

  /**
   * Update folder
   */
  async update(id: string, data: { name?: string; sortOrder?: number }): Promise<Folder> {
    const result = await window.api.folder.update(id, data) as ApiResponse<Folder>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update folder');
    }
    return result.data;
  },

  /**
   * Delete folder
   */
  async delete(id: string): Promise<void> {
    const result = await window.api.folder.delete(id) as unknown as ApiResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete folder');
    }
  },

  /**
   * Move folder to new parent
   */
  async move(id: string, newParentId: string): Promise<Folder> {
    const result = await window.api.folder.move(id, newParentId) as ApiResponse<Folder>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to move folder');
    }
    return result.data;
  },
};
