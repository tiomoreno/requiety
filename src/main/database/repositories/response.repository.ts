import type { Response } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { generateId, getCurrentTimestamp } from '../../utils/id-generator';

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
    db
      .find({ requestId })
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
