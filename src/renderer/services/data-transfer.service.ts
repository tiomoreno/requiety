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
};
