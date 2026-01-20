import { SecurityService } from './security.service';
import {
  getWorkspaceById,
  getFoldersByWorkspace,
  getRequestsByWorkspace,
  getEnvironmentsByWorkspace,
  getVariablesByEnvironment,
  createFolder,
  createRequest,
  createEnvironment,
  updateWorkspace,
  updateFolder,
  updateRequest,
  updateEnvironment,
  deleteRequest,
  deleteFolder,
  deleteEnvironment,
  upsertVariable,
  deleteVariable,
} from '../database/models';
import type {
  Workspace,
  Folder,
  Request,
  Environment,
  Variable,
  BaseDocument,
} from '@shared/types';
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

const ENCRYPTED_TOKEN_PREFIX = 'enc:';

const formatJson = (data: unknown) => JSON.stringify(data, null, 2);

/**
 * Checks if a token is encrypted (has the enc: prefix)
 */
const isTokenEncrypted = (token: string): boolean => {
  return token.startsWith(ENCRYPTED_TOKEN_PREFIX);
};

/**
 * Encrypts a token and adds the enc: prefix
 */
const encryptToken = (token: string): string => {
  if (!token) return token;
  if (isTokenEncrypted(token)) return token; // Already encrypted
  return ENCRYPTED_TOKEN_PREFIX + SecurityService.encrypt(token);
};

/**
 * Decrypts a token, handling both encrypted (with enc: prefix) and plain text tokens
 * for backwards compatibility with existing data
 */
const decryptToken = (token: string): string => {
  if (!token) return token;
  if (!isTokenEncrypted(token)) {
    // Plain text token (legacy data) - return as is
    return token;
  }
  // Remove prefix and decrypt
  return SecurityService.decrypt(token.slice(ENCRYPTED_TOKEN_PREFIX.length));
};

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

  static async exportWorkspace(workspaceId: string, baseDir: string): Promise<void> {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    const rootDir = path.join(baseDir, SYNC_DIR_STRUCTURE.ROOT);
    const workspaceDir = path.join(rootDir, SYNC_DIR_STRUCTURE.WORKSPACES, workspace._id);

    await fs.rm(workspaceDir, { recursive: true, force: true });
    const requestsDir = path.join(workspaceDir, SYNC_DIR_STRUCTURE.REQUESTS);
    const foldersDir = path.join(workspaceDir, SYNC_DIR_STRUCTURE.FOLDERS);
    const envsDir = path.join(workspaceDir, SYNC_DIR_STRUCTURE.ENVIRONMENTS);
    await fs.mkdir(requestsDir, { recursive: true });
    await fs.mkdir(foldersDir, { recursive: true });
    await fs.mkdir(envsDir, { recursive: true });

    // Decrypt the token before writing to file, but DON'T save it back to the DB.
    const workspaceForExport = { ...workspace };
    if (workspaceForExport.syncToken) {
      workspaceForExport.syncToken = decryptToken(workspaceForExport.syncToken);
    }

    await fs.writeFile(path.join(workspaceDir, 'workspace.json'), formatJson(workspaceForExport));

    const folders = await getFoldersByWorkspace(workspaceId);
    for (const folder of folders) {
      await fs.writeFile(path.join(foldersDir, `${folder._id}.json`), formatJson(folder));
    }

    const requests = await getRequestsByWorkspace(workspaceId);
    for (const request of requests) {
      await fs.writeFile(path.join(requestsDir, `${request._id}.json`), formatJson(request));
    }

    const environments = await getEnvironmentsByWorkspace(workspaceId);
    for (const env of environments) {
      const variables = await getVariablesByEnvironment(env._id);
      const envWithVars = { ...env, variables };
      await fs.writeFile(path.join(envsDir, `${env._id}.json`), formatJson(envWithVars));
    }
  }

  static async readWorkspaceFromDirectory(
    baseDir: string,
    workspaceId: string
  ): Promise<SyncWorkspaceData> {
    const workspaceDir = path.join(
      baseDir,
      SYNC_DIR_STRUCTURE.ROOT,
      SYNC_DIR_STRUCTURE.WORKSPACES,
      workspaceId
    );
    const workspaceContent = await fs.readFile(path.join(workspaceDir, 'workspace.json'), 'utf-8');
    const workspace = JSON.parse(workspaceContent) as Workspace;

    // When reading from a file, the token is plain text. It must be encrypted
    // before it is passed to the database layer (via _upsertWorkspaceData).
    if (workspace.syncToken) {
      workspace.syncToken = encryptToken(workspace.syncToken);
    }

    const folders: Folder[] = [];
    try {
      const folderFiles = await fs.readdir(path.join(workspaceDir, SYNC_DIR_STRUCTURE.FOLDERS));
      for (const file of folderFiles) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(
            path.join(workspaceDir, SYNC_DIR_STRUCTURE.FOLDERS, file),
            'utf-8'
          );
          folders.push(JSON.parse(content) as Folder);
        }
      }
    } catch {
      /* No folders */
    }

    const requests: Request[] = [];
    try {
      const requestFiles = await fs.readdir(path.join(workspaceDir, SYNC_DIR_STRUCTURE.REQUESTS));
      for (const file of requestFiles) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(
            path.join(workspaceDir, SYNC_DIR_STRUCTURE.REQUESTS, file),
            'utf-8'
          );
          requests.push(JSON.parse(content) as Request);
        }
      }
    } catch {
      /* No requests */
    }

    const environments: EnvironmentWithVariables[] = [];
    try {
      const envFiles = await fs.readdir(path.join(workspaceDir, SYNC_DIR_STRUCTURE.ENVIRONMENTS));
      for (const file of envFiles) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(
            path.join(workspaceDir, SYNC_DIR_STRUCTURE.ENVIRONMENTS, file),
            'utf-8'
          );
          environments.push(JSON.parse(content) as EnvironmentWithVariables);
        }
      }
    } catch {
      /* No environments */
    }

    return { workspace, folders, requests, environments };
  }

  // ============================================================================
  // GIT SYNC LOGIC
  // ============================================================================

  private static getGitAuth(workspace: Workspace) {
    if (!workspace.syncToken) {
      return {};
    }
    const token = decryptToken(workspace.syncToken);
    return { username: token }; // PAT
  }

  static async setup(
    workspaceId: string,
    url: string,
    branch: string,
    token: string,
    directory: string
  ): Promise<void> {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    const gitDir = path.join(directory, '.git');
    try {
      await fs.stat(gitDir);
      // If .git exists, verify remote
      const remotes = await git.listRemotes({ fs, dir: directory });
      const origin = remotes.find((r) => r.remote === 'origin');
      if (origin && origin.url !== url) {
        throw new Error(
          `Directory is already a git repository for a different URL (${origin.url}).`
        );
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // .git does not exist, clone it
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
      } else {
        // Rethrow other errors
        throw error;
      }
    }

    await updateWorkspace(workspaceId, {
      syncRepositoryUrl: url,
      syncBranch: branch,
      syncDirectory: directory,
      syncAuthenticationType: 'pat',
      syncToken: encryptToken(token),
    });
  }

  static async pull(workspaceId: string): Promise<void> {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace || !workspace.syncDirectory)
      throw new Error('Workspace not configured for sync');

    await git.pull({
      fs,
      http,
      dir: workspace.syncDirectory,
      ref: workspace.syncBranch,
      author: { name: 'Requiety Sync' },
      onAuth: () => this.getGitAuth(workspace),
    });

    await this._upsertWorkspaceData(workspace.syncDirectory, workspaceId);
  }

  static async push(workspaceId: string): Promise<void> {
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace || !workspace.syncDirectory)
      throw new Error('Workspace not configured for sync');

    await this.exportWorkspace(workspaceId, workspace.syncDirectory);

    const dir = workspace.syncDirectory;
    await git.add({ fs, dir, filepath: '.' });

    const statusMatrix = await git.statusMatrix({ fs, dir });
    const hasChanges = statusMatrix.some(([, head, workdir]) => head !== workdir);

    if (hasChanges) {
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

  private static async _upsertWorkspaceData(baseDir: string, workspaceId: string): Promise<void> {
    const data = await this.readWorkspaceFromDirectory(baseDir, workspaceId);

    const dbFolders = await getFoldersByWorkspace(workspaceId);
    const dbRequests = await getRequestsByWorkspace(workspaceId);
    const dbEnvironments = await getEnvironmentsByWorkspace(workspaceId);

    await updateWorkspace(workspaceId, data.workspace);

    await this._syncItems(
      dbFolders,
      data.folders,
      (f) => updateFolder(f._id, f),
      createFolder,
      deleteFolder
    );
    await this._syncItems(
      dbRequests,
      data.requests,
      (r) => updateRequest(r._id, r),
      createRequest,
      deleteRequest
    );
    await this._syncItems(
      dbEnvironments,
      data.environments,
      (e) => updateEnvironment(e._id, e),
      createEnvironment,
      deleteEnvironment
    );

    for (const env of data.environments) {
      const dbVars = await getVariablesByEnvironment(env._id);
      const fileVars = env.variables || [];
      await this._syncItems(
        dbVars,
        fileVars,
        (v) => upsertVariable(v),
        upsertVariable,
        deleteVariable
      );
    }
  }

  private static async _syncItems<T extends BaseDocument>(
    dbItems: T[],
    fileItems: T[],
    updateFn: (item: T) => Promise<unknown>,
    createFn: (item: Omit<T, '_id' | 'created' | 'modified'>) => Promise<T>,
    deleteFn: (id: string) => Promise<unknown>
  ): Promise<void> {
    const dbMap = new Map(dbItems.map((i) => [i._id, i]));
    const fileMap = new Map(fileItems.map((i) => [i._id, i]));

    for (const dbItem of dbItems) {
      if (!fileMap.has(dbItem._id)) {
        await deleteFn(dbItem._id);
      }
    }

    for (const fileItem of fileItems) {
      const dbItem = dbMap.get(fileItem._id);
      if (dbItem) {
        if (fileItem.modified > dbItem.modified) {
          await updateFn(fileItem);
        }
      } else {
        const { _id, created, modified, ...creatable } = fileItem;
        await createFn(creatable as Omit<T, '_id' | 'created' | 'modified'>);
      }
    }
  }
}
