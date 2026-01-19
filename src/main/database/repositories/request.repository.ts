import type { Request } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { generateId, getCurrentTimestamp } from '../../utils/id-generator';
import { deleteResponseHistory } from './response.repository';
import { getWorkspaceFolderIds } from './folder.repository';
import { getWorkspaceById } from './workspace.repository';

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
  const updateData = { ...data, modified: getCurrentTimestamp() };

  await dbOperation((cb) => db.update({ _id: id }, { $set: updateData }, {}, cb));

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

export const getRequestsByWorkspace = async (workspaceId: string): Promise<Request[]> => {
  const db = getDatabase('Request');

  const allFolderIds = await getWorkspaceFolderIds(workspaceId);

  return await dbOperation<Request[]>((cb) => db.find({ parentId: { $in: allFolderIds } }, cb));
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
