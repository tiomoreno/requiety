import {
  getWorkspaceById,
  getFoldersByWorkspace,
  getRequestsByWorkspace,
  getEnvironmentsByWorkspace,
  getVariablesByEnvironment,
  createWorkspace,
  createFolder,
  createRequest,
  createEnvironment,
  createVariable,
  moveFolder,
} from '../database/models';
import type { Workspace, Folder, Request, Environment, Variable } from '../../shared/types';
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

interface EnvironmentWithVariables extends Environment {
  variables: Variable[];
}

interface SyncWorkspaceData {
  workspace: Workspace;
  folders: Folder[];
  requests: Request[];
  environments: EnvironmentWithVariables[];
}

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

  /**
   * Lists available workspaces in a .requiety sync directory.
   */
  static async listWorkspacesInDirectory(baseDir: string): Promise<{ id: string; name: string }[]> {
    const workspacesDir = path.join(baseDir, SYNC_DIR_STRUCTURE.ROOT, SYNC_DIR_STRUCTURE.WORKSPACES);

    try {
      const entries = await fs.readdir(workspacesDir, { withFileTypes: true });
      const workspaces: { id: string; name: string }[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const workspaceFile = path.join(workspacesDir, entry.name, 'workspace.json');
            const content = await fs.readFile(workspaceFile, 'utf-8');
            const workspace = JSON.parse(content) as Workspace;
            workspaces.push({ id: workspace._id, name: workspace.name });
          } catch {
            // Skip invalid workspace directories
          }
        }
      }

      return workspaces;
    } catch {
      return [];
    }
  }

  /**
   * Reads a workspace and all its data from a .requiety sync directory.
   */
  static async readWorkspaceFromDirectory(baseDir: string, workspaceId: string): Promise<SyncWorkspaceData> {
    const workspaceDir = path.join(
      baseDir,
      SYNC_DIR_STRUCTURE.ROOT,
      SYNC_DIR_STRUCTURE.WORKSPACES,
      workspaceId
    );

    // 1. Read workspace.json
    const workspaceContent = await fs.readFile(path.join(workspaceDir, 'workspace.json'), 'utf-8');
    const workspace = JSON.parse(workspaceContent) as Workspace;

    // 2. Read folders
    const foldersDir = path.join(workspaceDir, SYNC_DIR_STRUCTURE.FOLDERS);
    const folders: Folder[] = [];
    try {
      const folderFiles = await fs.readdir(foldersDir);
      for (const file of folderFiles) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(foldersDir, file), 'utf-8');
          folders.push(JSON.parse(content) as Folder);
        }
      }
    } catch {
      // No folders directory or empty
    }

    // 3. Read requests
    const requestsDir = path.join(workspaceDir, SYNC_DIR_STRUCTURE.REQUESTS);
    const requests: Request[] = [];
    try {
      const requestFiles = await fs.readdir(requestsDir);
      for (const file of requestFiles) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(requestsDir, file), 'utf-8');
          requests.push(JSON.parse(content) as Request);
        }
      }
    } catch {
      // No requests directory or empty
    }

    // 4. Read environments (with variables)
    const envsDir = path.join(workspaceDir, SYNC_DIR_STRUCTURE.ENVIRONMENTS);
    const environments: EnvironmentWithVariables[] = [];
    try {
      const envFiles = await fs.readdir(envsDir);
      for (const file of envFiles) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(envsDir, file), 'utf-8');
          environments.push(JSON.parse(content) as EnvironmentWithVariables);
        }
      }
    } catch {
      // No environments directory or empty
    }

    return { workspace, folders, requests, environments };
  }

  /**
   * Imports a workspace from a .requiety sync directory.
   * Creates a new workspace with remapped IDs to avoid conflicts.
   */
  static async importWorkspace(baseDir: string, workspaceId: string): Promise<Workspace> {
    const data = await this.readWorkspaceFromDirectory(baseDir, workspaceId);
    const idMap = new Map<string, string>(); // Old ID -> New ID

    // 1. Create New Workspace
    const newWorkspace = await createWorkspace({
      name: `${data.workspace.name} (Synced)`,
    });
    idMap.set(data.workspace._id, newWorkspace._id);

    // 2. Import Environments & Variables
    for (const env of data.environments) {
      const newEnv = await createEnvironment({
        name: env.name,
        workspaceId: newWorkspace._id,
      });
      idMap.set(env._id, newEnv._id);

      // Variables
      if (env.variables) {
        for (const variable of env.variables) {
          await createVariable({
            environmentId: newEnv._id,
            key: variable.key,
            value: variable.value,
            isSecret: variable.isSecret || false,
          });
        }
      }
    }

    // 3. Import Folders (Pass 1: Create with temporary parentId)
    for (const folder of data.folders) {
      let parentId = folder.parentId;
      if (parentId === data.workspace._id) {
        parentId = newWorkspace._id;
      }

      const newFolder = await createFolder({
        name: folder.name,
        parentId: parentId, // May still be old ID if parent is another folder
        sortOrder: folder.sortOrder,
      });
      idMap.set(folder._id, newFolder._id);
    }

    // 3.1. Fix Folder Parent IDs (Pass 2)
    for (const folder of data.folders) {
      const newId = idMap.get(folder._id);
      if (!newId) continue;

      const parentId = folder.parentId;
      // If parent was another folder (not workspace), update it
      if (parentId !== data.workspace._id && idMap.has(parentId)) {
        const newParentId = idMap.get(parentId)!;
        await moveFolder(newId, newParentId);
      }
    }

    // 4. Import Requests
    for (const req of data.requests) {
      let newParentId = req.parentId;
      if (idMap.has(req.parentId)) {
        newParentId = idMap.get(req.parentId)!;
      } else if (req.parentId === data.workspace._id) {
        newParentId = newWorkspace._id;
      }

      await createRequest({
        name: req.name,
        url: req.url,
        method: req.method,
        parentId: newParentId,
        sortOrder: req.sortOrder,
        headers: req.headers,
        body: req.body,
        authentication: req.authentication,
      });
    }

    return newWorkspace;
  }

  /**
   * Imports all workspaces from a .requiety sync directory.
   */
  static async importAllWorkspaces(baseDir: string): Promise<Workspace[]> {
    const availableWorkspaces = await this.listWorkspacesInDirectory(baseDir);
    const importedWorkspaces: Workspace[] = [];

    for (const ws of availableWorkspaces) {
      const imported = await this.importWorkspace(baseDir, ws.id);
      importedWorkspaces.push(imported);
    }

    return importedWorkspaces;
  }
}
