import type { Variable } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { generateId, getCurrentTimestamp } from '../../utils/id-generator';

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
  const updateData = { ...data, modified: getCurrentTimestamp() };

  await dbOperation((cb) => db.update({ _id: id }, { $set: updateData }, {}, cb));

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

  await dbOperation((cb) => db.update(query, { $set: updateData }, { upsert: true }, cb));

  return await dbOperation<Variable>((cb) => db.findOne(query, cb));
};

export const deleteVariable = async (id: string): Promise<void> => {
  const db = getDatabase('Variable');
  await dbOperation((cb) => db.remove({ _id: id }, {}, cb));
};

export const getVariablesByEnvironment = async (environmentId: string): Promise<Variable[]> => {
  const db = getDatabase('Variable');
  return await dbOperation<Variable[]>((cb) => db.find({ environmentId }, cb));
};
