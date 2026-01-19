import type { MockRoute } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { generateId, getCurrentTimestamp } from '../../utils/id-generator';

export const createMockRoute = async (
  data: Omit<MockRoute, '_id' | 'type' | 'created' | 'modified'>
): Promise<MockRoute> => {
  const mockRoute: MockRoute = {
    _id: generateId('MockRoute'),
    type: 'MockRoute',
    ...data,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };

  const db = getDatabase('MockRoute');
  return await dbOperation<MockRoute>((cb) => db.insert(mockRoute, cb));
};

export const getMockRoutesByWorkspace = async (workspaceId: string): Promise<MockRoute[]> => {
  const db = getDatabase('MockRoute');
  return await dbOperation<MockRoute[]>((cb) => db.find({ workspaceId }, cb));
};

export const updateMockRoute = async (
  id: string,
  data: Partial<Omit<MockRoute, '_id' | 'type' | 'created' | 'modified'>>
): Promise<MockRoute> => {
  const db = getDatabase('MockRoute');
  const updateData = { ...data, modified: getCurrentTimestamp() };

  await dbOperation((cb) => db.update({ _id: id }, { $set: updateData }, {}, cb));

  return await dbOperation<MockRoute>((cb) => db.findOne({ _id: id }, cb));
};

export const deleteMockRoute = async (id: string): Promise<void> => {
  const db = getDatabase('MockRoute');
  await dbOperation((cb) => db.remove({ _id: id }, {}, cb));
};
