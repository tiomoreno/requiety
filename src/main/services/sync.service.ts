import {
  getWorkspaceById,
  getFoldersByWorkspace,
  getRequestsByWorkspace,
  getEnvironmentsByWorkspace,
  getVariablesByEnvironment,
} from '../database/models';
import * as fs from 'fs/promises';
import * as path from 'path';

const SYNC_DIR_STRUCTURE = {
  ROOT: '.requiety',
  WORKSPACES: 'workspaces',
  FOLDERS: 'folders',
  REQUESTS: 'requests',
  ENVIRONMENTS: 'environments',
};

const formatJson = (data: unknown) => JSON.stringify(data, null, 2);

export class SyncService {
  /**
   * Exports a single workspace and all its related data to a specified directory.
   */
  static async exportWorkspace(workspaceId: string, baseDir: string): Promise<void> {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const rootDir = path.join(baseDir, SYNC_DIR_STRUCTURE.ROOT);
    const workspaceDir = path.join(rootDir, SYNC_DIR_STRUCTURE.WORKSPACES, workspace._id);

    // Clean up previous export for this workspace
    await fs.rm(workspaceDir, { recursive: true, force: true });

    // Create directories
    const requestsDir = path.join(workspaceDir, SYNC_DIR_STRUCTURE.REQUESTS);
    const foldersDir = path.join(workspaceDir, SYNC_DIR_STRUCTURE.FOLDERS);
    const envsDir = path.join(workspaceDir, SYNC_DIR_STRUCTURE.ENVIRONMENTS);
    await fs.mkdir(requestsDir, { recursive: true });
    await fs.mkdir(foldersDir, { recursive: true });
    await fs.mkdir(envsDir, { recursive: true });

    // 1. Save Workspace file
    await fs.writeFile(path.join(workspaceDir, 'workspace.json'), formatJson(workspace));

    // 2. Save Folders
    const folders = await getFoldersByWorkspace(workspaceId);
    for (const folder of folders) {
      await fs.writeFile(path.join(foldersDir, `${folder._id}.json`), formatJson(folder));
    }

    // 3. Save Requests
    const requests = await getRequestsByWorkspace(workspaceId);
    for (const request of requests) {
      await fs.writeFile(path.join(requestsDir, `${request._id}.json`), formatJson(request));
    }

    // 4. Save Environments and their Variables
    const environments = await getEnvironmentsByWorkspace(workspaceId);
    for (const env of environments) {
      const variables = await getVariablesByEnvironment(env._id);
      const envWithVars = { ...env, variables };
      await fs.writeFile(path.join(envsDir, `${env._id}.json`), formatJson(envWithVars));
    }
  }

  // Import logic will be added here later
}
