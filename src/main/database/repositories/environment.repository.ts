import type { Environment } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { generateId, getCurrentTimestamp } from '../../utils/id-generator';

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
  const updateData = { ...data, modified: getCurrentTimestamp() };

  await dbOperation((cb) => db.update({ _id: id }, { $set: updateData }, {}, cb));

  return await dbOperation<Environment>((cb) => db.findOne({ _id: id }, cb));
};

export const deleteEnvironment = async (id: string): Promise<void> => {
  const db = getDatabase('Environment');

  // Delete all variables in environment
  await dbOperation((cb) =>
    getDatabase('Variable').remove({ environmentId: id }, { multi: true }, cb)
  );

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
    db.update({ workspaceId: env.workspaceId }, { $set: { isActive: false } }, { multi: true }, cb)
  );

  await dbOperation((cb) => db.update({ _id: id }, { $set: { isActive: true } }, {}, cb));
};

export const getEnvironmentsByWorkspace = async (workspaceId: string): Promise<Environment[]> => {
  const db = getDatabase('Environment');
  return await dbOperation<Environment[]>((cb) => db.find({ workspaceId }, cb));
};

export const getActiveEnvironment = async (workspaceId: string): Promise<Environment | null> => {
  const db = getDatabase('Environment');
  return await dbOperation<Environment>((cb) => db.findOne({ workspaceId, isActive: true }, cb));
};
