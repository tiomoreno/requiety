// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importService } from './import.service';
import * as models from '../database/models';
import fs from 'fs/promises';

vi.mock('../database/models');
vi.mock('fs/promises');

describe('ImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import workspace from JSON file', async () => {
    const mockData = {
      version: '1.0',
      source: 'test',
      data: {
        workspace: { _id: 'w1', name: 'Imported' },
        folders: [{ _id: 'f1', name: 'F1', parentId: 'w1', sortOrder: 0 }],
        requests: [{ _id: 'r1', name: 'R1', parentId: 'f1', url: 'http://', method: 'GET', sortOrder: 0, headers: [], body: {}, authentication: {} }],
        environments: [{ _id: 'e1', name: 'Env', variables: [{ key: 'k', value: 'v', isSecret: false }] }]
      }
    };
    
    // Models are mocked, but importWorkspace takes the DATA object, not the file path string?
    // Wait, let's check import.service.ts... 
    // export const importService = { async importWorkspace(jsonData: ExportData): Promise<Workspace> { ... } }
    // It takes the DATA, not the path. Caller is responsible for reading file.
    // My previous test code mocked fs.readFile inside the service, but the service doesn't use fs.readFile!
    // It takes the jsonData directly.
    
    vi.mocked(models.createWorkspace).mockResolvedValue({ _id: 'new_w1', name: 'Imported' } as any);
    vi.mocked(models.createFolder).mockResolvedValue({ _id: 'new_f1' } as any);
    vi.mocked(models.createRequest).mockResolvedValue({ _id: 'new_r1' } as any);
    vi.mocked(models.createEnvironment).mockResolvedValue({ _id: 'new_e1' } as any);
    vi.mocked(models.createVariable).mockResolvedValue({ _id: 'new_v1' } as any);
    
    const result = await importService.importWorkspace(mockData);
    
    // expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.json', 'utf-8'); // DELETE THIS
    expect(models.createWorkspace).toHaveBeenCalled();
    expect(models.createFolder).toHaveBeenCalled();
    // Verify parent mapping
    expect(models.createFolder).toHaveBeenCalledWith(expect.objectContaining({ parentId: 'new_w1' }));
    
    expect(models.createRequest).toHaveBeenCalled();
    expect(models.createRequest).toHaveBeenCalledWith(expect.objectContaining({ parentId: 'new_f1' }));
    
    expect(models.createEnvironment).toHaveBeenCalled();
    expect(models.createVariable).toHaveBeenCalled();
    
    expect(result._id).toBe('new_w1');
  });

  it('should handle invalid JSON', async () => {
    // The importWorkspace function takes JSON data directly, not a file path.
    // So, this test case is not directly applicable to the current importService.importWorkspace signature.
    // If there was a function like `importService.importWorkspaceFromFile(filePath: string)`,
    // then mocking fs.readFile would be appropriate.
    // For now, we'll keep it as a placeholder or remove if not needed.
    // For the current `importWorkspace(jsonData: ExportData)`, invalid JSON would typically be caught by TypeScript
    // or runtime validation of the `ExportData` structure, not by `fs.readFile`.
    // If the intent is to test malformed `ExportData`, the `mockData` itself would need to be malformed.
    await expect(importService.importWorkspace({} as any)).rejects.toThrow();
  });

  it('should handle nested folders and move them', async () => {
      // workspace -> f1 -> f2
      const mockData = {
          version: '1.0', source: 'test',
          data: {
              workspace: { _id: 'w1', name: 'W' },
              folders: [
                  { _id: 'f1', parentId: 'w1', name: 'F1', sortOrder: 0 },
                  { _id: 'f2', parentId: 'f1', name: 'F2', sortOrder: 0 }
              ],
              requests: [], environments: []
          }
      };
      
      vi.mocked(models.createWorkspace).mockResolvedValue({ _id: 'new_w1', name: 'Imported' } as any);
      // First call f1, second f2
      vi.mocked(models.createFolder)
        .mockResolvedValueOnce({ _id: 'new_f1' } as any)
        .mockResolvedValueOnce({ _id: 'new_f2' } as any);
        
      await importService.importWorkspace(mockData as any);
      
      // Check if moveFolder was called for f2 to set parent to new_f1
      // Note: it might be called multiple times (e.g. for f1 too), so check calling arguments
      expect(models.moveFolder).toHaveBeenCalledWith('new_f2', 'new_f1');
  });
});
