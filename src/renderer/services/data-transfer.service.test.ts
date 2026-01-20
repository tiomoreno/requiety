// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataTransferService } from './data-transfer.service';

describe('DataTransferService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window = {
      api: {
        importExport: {
          exportWorkspace: vi.fn(),
          importWorkspace: vi.fn(),
        },
      },
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('exportWorkspace should return true on success', async () => {
    vi.mocked(window.api.importExport.exportWorkspace).mockResolvedValue({ success: true });
    const result = await dataTransferService.exportWorkspace('w1');
    expect(result).toBe(true);
  });

  it('exportWorkspace should return false on cancel', async () => {
    vi.mocked(window.api.importExport.exportWorkspace).mockResolvedValue({
      success: false,
      error: 'Cancelled',
    });
    const result = await dataTransferService.exportWorkspace('w1');
    expect(result).toBe(false);
  });

  it('exportWorkspace should throw on error', async () => {
    vi.mocked(window.api.importExport.exportWorkspace).mockResolvedValue({
      success: false,
      error: 'IO Error',
    });
    await expect(dataTransferService.exportWorkspace('w1')).rejects.toThrow('IO Error');
  });

  it('importWorkspace should return true on success', async () => {
    vi.mocked(window.api.importExport.importWorkspace).mockResolvedValue({ success: true });
    const result = await dataTransferService.importWorkspace();
    expect(result).toBe(true);
  });

  it('importWorkspace should return false on cancel', async () => {
    vi.mocked(window.api.importExport.importWorkspace).mockResolvedValue({
      success: false,
      error: 'Cancelled',
    });
    const result = await dataTransferService.importWorkspace();
    expect(result).toBe(false);
  });

  it('importWorkspace should throw on error', async () => {
    vi.mocked(window.api.importExport.importWorkspace).mockResolvedValue({
      success: false,
      error: 'Corrupt File',
    });
    await expect(dataTransferService.importWorkspace()).rejects.toThrow('Corrupt File');
  });
});
