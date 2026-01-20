// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAppDataPath,
  getResponsesPath,
  getBackupsPath,
  initializeDirectories,
  saveResponseBody,
  readResponseBody,
  deleteResponseBody,
  deleteRequestResponses,
} from './file-manager';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { app } from 'electron';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/app/data'),
  },
}));

vi.mock('fs/promises');
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('File Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Paths', () => {
    it('getAppDataPath should return user data path', () => {
      expect(getAppDataPath()).toBe('/app/data');
    });

    it('getResponsesPath should return correct subpath', () => {
      expect(getResponsesPath()).toBe(path.join('/app/data', 'data', 'responses'));
    });

    it('getBackupsPath should return correct subpath', () => {
      expect(getBackupsPath()).toBe(path.join('/app/data', 'data', 'backups'));
    });
  });

  describe('initializeDirectories', () => {
    it('should create directories if they do not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await initializeDirectories();

      expect(fs.mkdir).toHaveBeenCalledTimes(3);
      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('data'), { recursive: true });
    });

    it('should skip creation if directories exist', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await initializeDirectories();

      expect(fs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('Response Storage', () => {
    it('saveResponseBody should write file', async () => {
      await saveResponseBody('req1', 'body');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('req1.txt'),
        'body',
        'utf-8'
      );
    });

    it('readResponseBody should read file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('content');
      const res = await readResponseBody('/path/f.txt');
      expect(fs.readFile).toHaveBeenCalledWith('/path/f.txt', 'utf-8');
      expect(res).toBe('content');
    });

    it('deleteResponseBody should delete if exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      await deleteResponseBody('/path/f.txt');
      expect(fs.unlink).toHaveBeenCalledWith('/path/f.txt');
    });

    it('deleteResponseBody should do nothing if not exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      await deleteResponseBody('/path/f.txt');
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('deleteRequestResponses should delete multiple', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      await deleteRequestResponses(['/p1', '/p2']);
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });
  });
});
