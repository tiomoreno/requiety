import type { Folder, Request } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { generateId, getCurrentTimestamp } from '../../utils/id-generator';
import { deleteRequest } from './request.repository';

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
  const updateData = { ...data, modified: getCurrentTimestamp() };

  await dbOperation((cb) => db.update({ _id: id }, { $set: updateData }, {}, cb));

  return await dbOperation<Folder>((cb) => db.findOne({ _id: id }, cb));
};

export const deleteFolder = async (id: string): Promise<void> => {
  const db = getDatabase('Folder');

  // Delete all child folders
  const childFolders = await dbOperation<Folder[]>((cb) => db.find({ parentId: id }, cb));
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

export const moveFolder = async (id: string, newParentId: string): Promise<Folder> => {
  const db = getDatabase('Folder');

  await dbOperation((cb) =>
    db.update(
      { _id: id },
      { $set: { parentId: newParentId, modified: getCurrentTimestamp() } },
      {},
      cb
    )
  );

  return await dbOperation<Folder>((cb) => db.findOne({ _id: id }, cb));
};

// Helper to get all folder IDs in a workspace (recursive)
export const getWorkspaceFolderIds = async (workspaceId: string): Promise<string[]> => {
  const db = getDatabase('Folder');
  let allIds = [workspaceId];
  let currentLevelIds = [workspaceId];

  while (currentLevelIds.length > 0) {
    const children = await dbOperation<Folder[]>((cb) =>
      db.find({ parentId: { $in: currentLevelIds } }, cb)
    );

    if (children.length === 0) break;

    const childIds = children.map((f) => f._id);
    allIds = [...allIds, ...childIds];
    currentLevelIds = childIds;
  }

  return allIds;
};

export const getFoldersByWorkspace = async (workspaceId: string): Promise<Folder[]> => {
  const db = getDatabase('Folder');

  let allFolders: Folder[] = [];
  let currentParentIds = [workspaceId];

  while (currentParentIds.length > 0) {
    const children = await dbOperation<Folder[]>((cb) =>
      db.find({ parentId: { $in: currentParentIds } }, cb)
    );

    if (children.length === 0) break;

    allFolders = [...allFolders, ...children];
    currentParentIds = children.map((f) => f._id);
  }

  return allFolders;
};
