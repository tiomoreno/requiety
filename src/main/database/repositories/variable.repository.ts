import type { Variable } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { generateId, getCurrentTimestamp } from '../../utils/id-generator';
import { SecurityService } from '../../services/security.service';

const SECRET_VALUE_PREFIX = 'enc:';

const isEncryptedSecret = (value: string): boolean => value.startsWith(SECRET_VALUE_PREFIX);

const encryptSecretValue = (value: string): string => {
  if (!value) return value;
  if (isEncryptedSecret(value)) return value;
  return `${SECRET_VALUE_PREFIX}${SecurityService.encrypt(value)}`;
};

const decryptSecretValue = (value: string): string => {
  if (!value) return value;
  if (!isEncryptedSecret(value)) return value;
  return SecurityService.decrypt(value.slice(SECRET_VALUE_PREFIX.length));
};

const normalizeVariable = (variable: Variable): Variable => {
  if (!variable.isSecret) return variable;
  const decrypted = decryptSecretValue(variable.value);
  if (decrypted === variable.value) return variable;
  return { ...variable, value: decrypted };
};

const toStoredValue = (value: string, isSecret: boolean): string => {
  if (!isSecret) return value;
  return encryptSecretValue(value);
};

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

  variable.value = toStoredValue(variable.value, variable.isSecret);

  const db = getDatabase('Variable');
  const inserted = await dbOperation<Variable>((cb) => db.insert(variable, cb));
  return normalizeVariable(inserted);
};

export const updateVariable = async (
  id: string,
  data: Partial<Omit<Variable, '_id' | 'type' | 'created' | 'modified'>>
): Promise<Variable> => {
  const db = getDatabase('Variable');
  const existing = await dbOperation<Variable>((cb) => db.findOne({ _id: id }, cb));
  if (!existing) {
    throw new Error('Variable not found');
  }

  const nextIsSecret = data.isSecret ?? existing.isSecret;
  const updateData = { ...data, modified: getCurrentTimestamp() };

  if (typeof data.value === 'string') {
    updateData.value = toStoredValue(data.value, nextIsSecret);
  } else if (data.isSecret !== undefined && data.isSecret !== existing.isSecret) {
    updateData.value = nextIsSecret
      ? toStoredValue(existing.value, true)
      : decryptSecretValue(existing.value);
  }

  await dbOperation((cb) => db.update({ _id: id }, { $set: updateData }, {}, cb));

  const updated = await dbOperation<Variable>((cb) => db.findOne({ _id: id }, cb));
  return normalizeVariable(updated);
};

export const upsertVariable = async (
  data: Omit<Variable, '_id' | 'type' | 'created' | 'modified'>
): Promise<Variable> => {
  const db = getDatabase('Variable');
  const query = { environmentId: data.environmentId, key: data.key };

  const updateData = {
    ...data,
    value: toStoredValue(data.value, data.isSecret),
    modified: getCurrentTimestamp(),
  };

  await dbOperation((cb) => db.update(query, { $set: updateData }, { upsert: true }, cb));

  const upserted = await dbOperation<Variable>((cb) => db.findOne(query, cb));
  return normalizeVariable(upserted);
};

export const deleteVariable = async (id: string): Promise<void> => {
  const db = getDatabase('Variable');
  await dbOperation((cb) => db.remove({ _id: id }, {}, cb));
};

export const getVariablesByEnvironment = async (environmentId: string): Promise<Variable[]> => {
  const db = getDatabase('Variable');
  const variables = await dbOperation<Variable[]>((cb) => db.find({ environmentId }, cb));
  const result: Variable[] = [];

  for (const variable of variables) {
    if (variable.isSecret && variable.value && !isEncryptedSecret(variable.value)) {
      const encryptedValue = toStoredValue(variable.value, true);
      await dbOperation((cb) =>
        db.update(
          { _id: variable._id },
          { $set: { value: encryptedValue, modified: getCurrentTimestamp() } },
          {},
          cb
        )
      );
    }
    result.push(normalizeVariable(variable));
  }

  return result;
};
