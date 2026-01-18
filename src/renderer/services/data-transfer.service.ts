import type { Request } from '@shared/types';

export const dataTransferService = {
  exportWorkspace: async (workspaceId: string): Promise<boolean> => {
    const result = await window.api.importExport.exportWorkspace(workspaceId);
    if (!result.success) {
      if (result.error !== 'Cancelled') {
        console.error('Export failed:', result.error);
        throw new Error(result.error);
      }
      return false;
    }
    return true;
  },

  importWorkspace: async (): Promise<boolean> => {
    const result = await window.api.importExport.importWorkspace();
    if (!result.success) {
      if (result.error !== 'Cancelled') {
        console.error('Import failed:', result.error);
        throw new Error(result.error);
      }
      return false;
    }
    return true;
  },

  importPostman: async (): Promise<boolean> => {
    const result = await window.api.importExport.importPostman();
    if (!result.success) {
      if (result.error !== 'Cancelled') {
        console.error('Postman import failed:', result.error);
        throw new Error(result.error);
      }
      return false;
    }
    return true;
  },

  importFromCurl: async (command: string, workspaceId: string): Promise<Request> => {
    const result = await window.api.importExport.importCurl(command, workspaceId);
    if (!result.success) {
      console.error('cURL import failed:', result.error);
      throw new Error(result.error || 'Failed to import cURL command');
    }
    return result.data!;
  },
};
