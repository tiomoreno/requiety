import type { Request } from '@shared/types';
import { logger } from '../utils/logger';

export const dataTransferService = {
  exportWorkspace: async (workspaceId: string): Promise<boolean> => {
    const result = await window.api.importExport.exportWorkspace(workspaceId);
    if (!result.success) {
      if (result.error !== 'Cancelled') {
        logger.error('Export failed:', result.error);
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
        logger.error('Import failed:', result.error);
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
        logger.error('Postman import failed:', result.error);
        throw new Error(result.error);
      }
      return false;
    }
    return true;
  },

  importFromCurl: async (command: string, workspaceId: string): Promise<Request> => {
    const result = await window.api.importExport.importCurl(command, workspaceId);
    if (!result.success) {
      logger.error('cURL import failed:', result.error);
      throw new Error(result.error || 'Failed to import cURL command');
    }
    return result.data!;
  },
};
