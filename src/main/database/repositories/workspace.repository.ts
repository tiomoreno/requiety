import type { Workspace } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { generateId, getCurrentTimestamp } from '../../utils/id-generator';
import { SecurityService } from '../../services/security.service';
import { deleteFolder, getFoldersByWorkspace } from './folder.repository';
import { deleteRequest, getRequestsByWorkspace } from './request.repository';
import { deleteEnvironment, getEnvironmentsByWorkspace } from './environment.repository';

export const createWorkspace = async (data: Pick<Workspace, 'name'>): Promise<Workspace> => {
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

  // Encrypt sync token if it's being updated
  if (data.syncToken) {
    data.syncToken = SecurityService.encrypt(data.syncToken);
  }

  const updateData = { ...data, modified: getCurrentTimestamp() };

  await dbOperation((cb) => db.update({ _id: id }, { $set: updateData }, {}, cb));

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
