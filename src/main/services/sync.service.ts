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
  updateWorkspace,
  updateFolder,
  updateRequest,
  updateEnvironment,
  deleteVariable,
  deleteRequest,
  deleteFolder,
  deleteEnvironment,
  upsertVariable,
} from '../database/models';
import type { Workspace, Folder, Request, Environment, Variable, BaseDocument } from '../../shared/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

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
  // ============================================================================
  // GIT-AGNOSTIC EXPORT/IMPORT LOGIC
  // ============================================================================

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
    } catch { /* No folders directory or empty */ }

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
    } catch { /* No requests directory or empty */ }

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
    } catch { /* No environments directory or empty */ }

    return { workspace, folders, requests, environments };
  }

  // ============================================================================
  // GIT SYNC LOGIC
  // ============================================================================

  private static getGitAuth(workspace: Workspace) {
    return {
      username: workspace.syncToken, // PAT
      password: '', // Not needed for PAT
    };
  }

  /**
   * Clones a repository and sets up the workspace for sync.
   */
  static async setup(workspaceId: string, url: string, branch: string, token: string, directory: string): Promise<void> {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    await git.clone({
      fs,
      http,
      dir: directory,
      url,
      ref: branch,
      singleBranch: true,
      depth: 1,
      onAuth: () => ({ username: token }),
    });

    await updateWorkspace(workspaceId, {
      syncRepositoryUrl: url,
      syncBranch: branch,
      syncDirectory: directory,
      syncAuthenticationType: 'pat',
      syncToken: token,
    });
  }

  /**
   * Pulls changes from the remote repository and applies them to the local DB.
   */
  static async pull(workspaceId: string): Promise<void> {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace || !workspace.syncDirectory) throw new Error('Workspace not configured for sync');

    await git.pull({
      fs,
      http,
      dir: workspace.syncDirectory,
      ref: workspace.syncBranch,
      author: { name: 'Requiety Sync' },
      onAuth: () => this.getGitAuth(workspace),
    });

    // After pulling, upsert the data into the database
    await this._upsertWorkspaceData(workspace.syncDirectory, workspaceId);
  }

  /**
   * Exports the current workspace state to files and pushes to the remote repository.
   */
  static async push(workspaceId: string): Promise<void> {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace || !workspace.syncDirectory) throw new Error('Workspace not configured for sync');

    // 1. Export current DB state to files
    await this.exportWorkspace(workspaceId, workspace.syncDirectory);

    // 2. Commit and Push
    const dir = workspace.syncDirectory;
    await git.add({ fs, dir, filepath: '.' });
    
    const status = await git.status({ fs, dir, filepath: '.' });
    // only commit if there is something to commit
    if (status !== 'unmodified') {
        await git.commit({
          fs,
          dir,
          message: `Sync: Update from Requiety (${new Date().toISOString()})`,
          author: { name: 'Requiety Sync' },
        });
    }

    await git.push({
      fs,
      http,
      dir,
      onAuth: () => this.getGitAuth(workspace),
    });
  }

  /**
   * Reads data from a sync directory and upserts it into the database.
   */
  private static async _upsertWorkspaceData(baseDir: string, workspaceId: string): Promise<void> {
    const data = await this.readWorkspaceFromDirectory(baseDir, workspaceId);

    // --- Get current state from DB ---
    const dbFolders = await getFoldersByWorkspace(workspaceId);
    const dbRequests = await getRequestsByWorkspace(workspaceId);
    const dbEnvironments = await getEnvironmentsByWorkspace(workspaceId);

    // --- Upsert Workspace ---
    await updateWorkspace(workspaceId, data.workspace);

    // --- Upsert Folders ---
    await this._syncItems(dbFolders, data.folders, (f) => updateFolder(f._id, f), createFolder, deleteFolder);

    // --- Upsert Requests ---
    await this._syncItems(dbRequests, data.requests, (r) => updateRequest(r._id, r), createRequest, deleteRequest);

    // --- Upsert Environments and their Variables ---
    await this._syncItems(dbEnvironments, data.environments, (e) => updateEnvironment(e._id, e), createEnvironment, deleteEnvironment);

    for (const env of data.environments) {
      const dbVars = await getVariablesByEnvironment(env._id);
      const fileVars = env.variables || [];
      await this._syncItems(dbVars, fileVars, (v) => upsertVariable(v), upsertVariable, deleteVariable);
    }
  }

  /**
   * Generic function to sync a list of items from file with DB.
   */
  private static async _syncItems<T extends BaseDocument>(
    dbItems: T[],
    fileItems: T[],
    updateFn: (item: T) => Promise<any>,
    createFn: (item: Omit<T, '_id' | 'created' | 'modified'>) => Promise<T>,
    deleteFn: (id: string) => Promise<any>
  ): Promise<void> {
    const dbMap = new Map(dbItems.map(i => [i._id, i]));
    const fileMap = new Map(fileItems.map(i => [i._id, i]));

    // Items to delete (in DB but not in file)
    for (const dbItem of dbItems) {
      if (!fileMap.has(dbItem._id)) {
        await deleteFn(dbItem._id);
      }
    }

    for (const fileItem of fileItems) {
      const dbItem = dbMap.get(fileItem._id);
      if (dbItem) {
        // Item exists, update if modified time is newer
        if (fileItem.modified > dbItem.modified) {
          await updateFn(fileItem);
        }
      } else {
        // Item does not exist, create it
        const { _id, created, modified, ...creatable } = fileItem;
        await createFn(creatable as Omit<T, '_id' | 'created' | 'modified'>);
      }
    }
  }
}
