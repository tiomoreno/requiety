// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window = {
      api: {
        settings: {
          get: vi.fn(),
          update: vi.fn(),
        },
      },
    } as any;
  });

  it('get should return settings', async () => {
    const mockSettings = { theme: 'dark' };
    vi.mocked(window.api.settings.get).mockResolvedValue({ success: true, data: mockSettings });
    const result = await settingsService.get();
    expect(result).toEqual(mockSettings);
  });

  it('get should throw on failure', async () => {
    vi.mocked(window.api.settings.get).mockResolvedValue({ success: false });
    await expect(settingsService.get()).rejects.toThrow('Failed to load settings');
  });

  it('update should return updated settings', async () => {
    const mockSettings = { theme: 'light' };
    vi.mocked(window.api.settings.update).mockResolvedValue({ success: true, data: mockSettings });
    const result = await settingsService.update({ theme: 'light' });
    expect(result).toEqual(mockSettings);
  });

  it('update should throw on failure', async () => {
    vi.mocked(window.api.settings.update).mockResolvedValue({ success: false });
    await expect(settingsService.update({})).rejects.toThrow('Failed to update settings');
  });
});
