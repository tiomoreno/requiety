import { Settings, ApiResponse } from '@shared/types';

export const settingsService = {
  get: async (): Promise<Settings> => {
    const result = (await window.api.settings.get()) as unknown as ApiResponse<Settings>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load settings');
    }
    return result.data;
  },

  update: async (data: Partial<Settings>): Promise<Settings> => {
    const result = (await window.api.settings.update(data)) as unknown as ApiResponse<Settings>;
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update settings');
    }
    return result.data;
  },
};
