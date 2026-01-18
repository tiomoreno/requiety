import type {
  Workspace,
  Folder,
  Request,
  Response,
  Environment,
  Variable,
  Settings,
  OAuth2Token,
} from '../../shared/types';
import { getDatabase, dbOperation } from './index';
import { generateId, getCurrentTimestamp } from '../utils/id-generator';

// ============================================================================
// Workspace Operations
// ============================================================================

export const createWorkspace = async (
  data: Pick<Workspace, 'name'>
): Promise<Workspace> => {
  const workspace: Workspace = {
    _id: generateId('Workspace'),
    type: 'Workspace',
    name: data.name,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };
  
  const db = getDatabase('Workspace');
  return await dbOperation<Workspace>((cb) => db.insert(workspace, cb));
};

export const updateWorkspace = async (
  id: string,
  data: Partial<Omit<Workspace, '_id' | 'type' | 'created' | 'modified'>>
): Promise<Workspace> => {
  const db = getDatabase('Workspace');
  
  await dbOperation((cb) => db.update({ _id: id }, { $set: data, $currentDate: { modified: true } }, {}, cb));
  
  return await dbOperation<Workspace>((cb) => db.findOne({ _id: id }, cb));
};

export const deleteWorkspace = async (id: string): Promise<void> => {
  const db = getDatabase('Workspace');
  
  // Delete all folders in workspace
  const folders = await getFoldersByWorkspace(id);
  for (const folder of folders) {
    await deleteFolder(folder._id);
  }
  
  // Delete all requests in workspace
  const requests = await getRequestsByWorkspace(id);
  for (const request of requests) {
    await deleteRequest(request._id);
  }
  
  // Delete all environments in workspace
  const environments = await getEnvironmentsByWorkspace(id);
  for (const env of environments) {
    await deleteEnvironment(env._id);
  }
  
  // Delete workspace
  await dbOperation((cb) => db.remove({ _id: id }, {}, cb));
};

export const getAllWorkspaces = async (): Promise<Workspace[]> => {
  const db = getDatabase('Workspace');
  return await dbOperation<Workspace[]>((cb) => db.find({}, cb));
};

export const getWorkspaceById = async (id: string): Promise<Workspace | null> => {
  const db = getDatabase('Workspace');
  return await dbOperation<Workspace>((cb) => db.findOne({ _id: id }, cb));
};

// ============================================================================
// Folder Operations
// ============================================================================

export const createFolder = async (
  data: Pick<Folder, 'name' | 'parentId' | 'sortOrder'>
): Promise<Folder> => {
  const folder: Folder = {
    _id: generateId('Folder'),
    type: 'Folder',
    name: data.name,
    parentId: data.parentId,
    sortOrder: data.sortOrder,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };
  
  const db = getDatabase('Folder');
  return await dbOperation<Folder>((cb) => db.insert(folder, cb));
};

export const updateFolder = async (
  id: string,
  data: Partial<Omit<Folder, '_id' | 'type' | 'created' | 'modified'>>
): Promise<Folder> => {
  const db = getDatabase('Folder');
  
  await dbOperation((cb) => db.update({ _id: id }, { $set: data, $currentDate: { modified: true } }, {}, cb));
  
  return await dbOperation<Folder>((cb) => db.findOne({ _id: id }, cb));
};

export const deleteFolder = async (id: string): Promise<void> => {
  const db = getDatabase('Folder');
  
  // Delete all child folders
  const childFolders = await dbOperation<Folder[]>((cb) =>
    db.find({ parentId: id }, cb)
  );
  for (const child of childFolders) {
    await deleteFolder(child._id);
  }
  
  // Delete all requests in folder
  const requests = await dbOperation<Request[]>((cb) =>
    getDatabase('Request').find({ parentId: id }, cb)
  );
  for (const request of requests) {
    await deleteRequest(request._id);
  }
  
  // Delete folder
  await dbOperation((cb) => db.remove({ _id: id }, {}, cb));
};

export const moveFolder = async (
  id: string,
  newParentId: string
): Promise<Folder> => {
  const db = getDatabase('Folder');
  
  await dbOperation((cb) =>
    db.update(
      { _id: id },
      { $set: { parentId: newParentId }, $currentDate: { modified: true } },
      {},
      cb
    )
  );
  
  return await dbOperation<Folder>((cb) => db.findOne({ _id: id }, cb));
};

// Helper to get all folder IDs in a workspace (recursive)
const getWorkspaceFolderIds = async (workspaceId: string): Promise<string[]> => {
  const db = getDatabase('Folder');
  let allIds = [workspaceId];
  let currentLevelIds = [workspaceId];

  while (currentLevelIds.length > 0) {
    const children = await dbOperation<Folder[]>((cb) =>
      db.find({ parentId: { $in: currentLevelIds } }, cb)
    );
    
    if (children.length === 0) break;
    
    const childIds = children.map(f => f._id);
    allIds = [...allIds, ...childIds];
    currentLevelIds = childIds;
  }
  
  return allIds;
};

export const getFoldersByWorkspace = async (
  workspaceId: string
): Promise<Folder[]> => {
  const db = getDatabase('Folder');
  
  let allFolders: Folder[] = [];
  let currentParentIds = [workspaceId];
  
  while (currentParentIds.length > 0) {
     const children = await dbOperation<Folder[]>((cb) =>
      db.find({ parentId: { $in: currentParentIds } }, cb)
    );
    
    if (children.length === 0) break;
    
    allFolders = [...allFolders, ...children];
    currentParentIds = children.map(f => f._id);
  }
  
  return allFolders;
};

// ============================================================================
// Request Operations
// ============================================================================

export const createRequest = async (
  data: Omit<Request, '_id' | 'type' | 'created' | 'modified'>
): Promise<Request> => {
  const request: Request = {
    _id: generateId('Request'),
    type: 'Request',
    ...data,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };
  
  const db = getDatabase('Request');
  return await dbOperation<Request>((cb) => db.insert(request, cb));
};


export const updateRequest = async (
  id: string,
  data: Partial<Omit<Request, '_id' | 'type' | 'created' | 'modified'>>
): Promise<Request> => {
  const db = getDatabase('Request');
  
  await dbOperation((cb) => db.update({ _id: id }, { $set: data, $currentDate: { modified: true } }, {}, cb));
  
  return await dbOperation<Request>((cb) => db.findOne({ _id: id }, cb));
};

export const deleteRequest = async (id: string): Promise<void> => {
  const db = getDatabase('Request');
  
  // Delete all responses for this request
  await deleteResponseHistory(id);
  
  // Delete request
  await dbOperation((cb) => db.remove({ _id: id }, {}, cb));
};

export const duplicateRequest = async (id: string): Promise<Request> => {
  const original = await getRequestById(id);
  if (!original) {
    throw new Error(`Request ${id} not found`);
  }
  
  const { _id, type, created, modified, name, ...rest } = original;

  return await createRequest({
    name: `${original.name} (Copy)`,
    ...rest,
  });
};

export const getRequestsByWorkspace = async (
  workspaceId: string
): Promise<Request[]> => {
  const db = getDatabase('Request');
  
  const allFolderIds = await getWorkspaceFolderIds(workspaceId);
  
  return await dbOperation<Request[]>((cb) =>
    db.find({ parentId: { $in: allFolderIds } }, cb)
  );
};

export const getRequestById = async (id: string): Promise<Request | null> => {
  const db = getDatabase('Request');
  return await dbOperation<Request>((cb) => db.findOne({ _id: id }, cb));
};

export const getWorkspaceIdForRequest = async (requestId: string): Promise<string | null> => {
  let currentId = requestId;
  let type = 'Request';
  
  // Max depth protection
  let depth = 0;
  while (depth < 20) {
    let item: any;
    
    if (type === 'Request') {
      item = await getRequestById(currentId);
    } else if (type === 'Folder') {
      item = await dbOperation((cb) => getDatabase('Folder').findOne({ _id: currentId }, cb));
    }
    
    if (!item) return null;
    
    // Check if the parent is a workspace
    const parentId = item.parentId;
    const workspace = await getWorkspaceById(parentId);
    
    if (workspace) {
      return workspace._id;
    }
    
    currentId = parentId;
    type = 'Folder';
    depth++;
  }
  
  return null;
};

// ============================================================================
// Response Operations
// ============================================================================

export const createResponse = async (
  data: Omit<Response, '_id' | 'type' | 'created' | 'modified'>
): Promise<Response> => {
  const response: Response = {
    _id: generateId('Response'),
    type: 'Response',
    ...data,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };
  
  const db = getDatabase('Response');
  return await dbOperation<Response>((cb) => db.insert(response, cb));
};


export const getResponseHistory = async (
  requestId: string,
  limit: number = 10
): Promise<Response[]> => {
  const db = getDatabase('Response');
  return await dbOperation<Response[]>((cb) =>
    db.find({ requestId })
      .sort({ created: -1 })
      .limit(limit)
      .exec(cb as any)
  );
};

export const getResponseById = async (id: string): Promise<Response | null> => {
  const db = getDatabase('Response');
  return await dbOperation<Response>((cb) => db.findOne({ _id: id }, cb));
};

export const deleteResponse = async (id: string): Promise<void> => {
  const db = getDatabase('Response');
  await dbOperation((cb) => db.remove({ _id: id }, {}, cb));
};

export const deleteResponseHistory = async (requestId: string): Promise<void> => {
  const db = getDatabase('Response');
  await dbOperation((cb) => db.remove({ requestId }, { multi: true }, cb));
};

// ============================================================================
// Environment Operations
// ============================================================================

export const createEnvironment = async (
  data: Omit<Environment, '_id' | 'type' | 'created' | 'modified' | 'isActive'>
): Promise<Environment> => {
  const environment: Environment = {
    _id: generateId('Environment'),
    type: 'Environment',
    isActive: false,
    ...data,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };
  
  const db = getDatabase('Environment');
  return await dbOperation<Environment>((cb) => db.insert(environment, cb));
};

export const updateEnvironment = async (
  id: string,
  data: Partial<Omit<Environment, '_id' | 'type' | 'created' | 'modified'>>
): Promise<Environment> => {
  const db = getDatabase('Environment');
  
  await dbOperation((cb) => db.update({ _id: id }, { $set: data, $currentDate: { modified: true } }, {}, cb));
  
  return await dbOperation<Environment>((cb) => db.findOne({ _id: id }, cb));
};

export const deleteEnvironment = async (id: string): Promise<void> => {
  const db = getDatabase('Environment');
  
  // Delete all variables in environment
  await dbOperation((cb) => getDatabase('Variable').remove({ environmentId: id }, { multi: true }, cb));
  
  // Delete environment
  await dbOperation((cb) => db.remove({ _id: id }, {}, cb));
};

export const activateEnvironment = async (id: string): Promise<void> => {
  const db = getDatabase('Environment');
  
  const env = await dbOperation<Environment>((cb) => db.findOne({ _id: id }, cb));
  if (!env) {
    throw new Error(`Environment ${id} not found`);
  }
  
  await dbOperation((cb) =>
    db.update(
      { workspaceId: env.workspaceId },
      { $set: { isActive: false } },
      { multi: true },
      cb
    )
  );
  
  await dbOperation((cb) =>
    db.update({ _id: id }, { $set: { isActive: true } }, {}, cb)
  );
};

export const getEnvironmentsByWorkspace = async (
  workspaceId: string
): Promise<Environment[]> => {
  const db = getDatabase('Environment');
  return await dbOperation<Environment[]>((cb) =>
    db.find({ workspaceId }, cb)
  );
};

export const getActiveEnvironment = async (
  workspaceId: string
): Promise<Environment | null> => {
  const db = getDatabase('Environment');
  return await dbOperation<Environment>((cb) =>
    db.findOne({ workspaceId, isActive: true }, cb)
  );
};

// ============================================================================
// Variable Operations
// ============================================================================

export const createVariable = async (
  data: Omit<Variable, '_id' | 'type' | 'created' | 'modified'>
): Promise<Variable> => {
  const variable: Variable = {
    _id: generateId('Variable'),
    type: 'Variable',
    ...data,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };
  
  const db = getDatabase('Variable');
  return await dbOperation<Variable>((cb) => db.insert(variable, cb));
};

export const updateVariable = async (
  id: string,
  data: Partial<Omit<Variable, '_id' | 'type' | 'created' | 'modified'>>
): Promise<Variable> => {
  const db = getDatabase('Variable');
  
  await dbOperation((cb) => db.update({ _id: id }, { $set: data, $currentDate: { modified: true } }, {}, cb));
  
  return await dbOperation<Variable>((cb) => db.findOne({ _id: id }, cb));
};

export const upsertVariable = async (
  data: Omit<Variable, '_id' | 'type' | 'created' | 'modified'>
): Promise<Variable> => {
  const db = getDatabase('Variable');
  const query = { environmentId: data.environmentId, key: data.key };
  
  const updateData = {
    ...data,
    modified: getCurrentTimestamp(),
  };

  await dbOperation(cb => db.update(query, { $set: updateData }, { upsert: true }, cb));

  return await dbOperation<Variable>((cb) => db.findOne(query, cb));
};

export const deleteVariable = async (id: string): Promise<void> => {
  const db = getDatabase('Variable');
  await dbOperation((cb) => db.remove({ _id: id }, {}, cb));
};

export const getVariablesByEnvironment = async (
  environmentId: string
): Promise<Variable[]> => {
  const db = getDatabase('Variable');
  return await dbOperation<Variable[]>((cb) =>
    db.find({ environmentId }, cb)
  );
};

// ============================================================================
// Settings Operations
// ============================================================================

// ... (rest of the file is unchanged)
export const getSettings = async (): Promise<Settings> => {
  const db = getDatabase('Settings');
  const settings = await dbOperation<Settings>((cb) =>
    db.findOne({ _id: 'settings' }, cb)
  );
  
  if (!settings) {
    return await createDefaultSettings();
  }
  
  return settings;
};

export const updateSettings = async (
  data: Partial<Omit<Settings, '_id' | 'type' | 'created' | 'modified'>>
): Promise<Settings> => {
  const db = getDatabase('Settings');
  
  const updateData = {
    ...data,
    modified: getCurrentTimestamp(),
  };
  
  await dbOperation((cb) =>
    db.update({ _id: 'settings' }, { $set: updateData }, {}, cb)
  );
  
  return await dbOperation<Settings>((cb) => db.findOne({ _id: 'settings' }, cb));
};

const createDefaultSettings = async (): Promise<Settings> => {
  const settings: Settings = {
    _id: 'settings',
    type: 'Settings',
    timeout: 30000,
    followRedirects: true,
    validateSSL: true,
    maxRedirects: 5,
    theme: 'auto',
    fontSize: 14,
    maxHistoryResponses: 10,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };
  
  const db = getDatabase('Settings');
  return await dbOperation<Settings>((cb) => db.insert(settings, cb));
};

// ============================================================================
// OAuth2Token Operations
// ============================================================================

export const saveToken = async (
  data: Omit<OAuth2Token, '_id' | 'type' | 'created' | 'modified'>
): Promise<OAuth2Token> => {
  const db = getDatabase('OAuth2Token');
  // Remove existing token for the request before saving new one
  await dbOperation(cb => db.remove({ requestId: data.requestId }, {}, cb));

  const token: OAuth2Token = {
    _id: generateId('OAuth2Token'),
    type: 'OAuth2Token',
    ...data,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };
  
  return await dbOperation<OAuth2Token>((cb) => db.insert(token, cb));
};

export const getTokenByRequestId = async (requestId: string): Promise<OAuth2Token | null> => {
  const db = getDatabase('OAuth2Token');
  return await dbOperation<OAuth2Token>((cb) => db.findOne({ requestId }, cb));
};

export const deleteTokenByRequestId = async (requestId: string): Promise<void> => {
  const db = getDatabase('OAuth2Token');
  await dbOperation((cb) => db.remove({ requestId }, {}, cb));
};
