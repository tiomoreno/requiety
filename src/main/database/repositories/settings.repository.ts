import type { Settings } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { getCurrentTimestamp } from '../../utils/id-generator';

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

export const getSettings = async (): Promise<Settings> => {
  const db = getDatabase('Settings');
  const settings = await dbOperation<Settings>((cb) => db.findOne({ _id: 'settings' }, cb));

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

  await dbOperation((cb) => db.update({ _id: 'settings' }, { $set: updateData }, {}, cb));

  return await dbOperation<Settings>((cb) => db.findOne({ _id: 'settings' }, cb));
};
