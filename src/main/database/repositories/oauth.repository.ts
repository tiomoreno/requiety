import type { OAuth2Token } from '@shared/types';
import { getDatabase, dbOperation } from '../index';
import { generateId, getCurrentTimestamp } from '../../utils/id-generator';
import { SecurityService } from '../../services/security.service';

export const saveToken = async (
  data: Omit<OAuth2Token, '_id' | 'type' | 'created' | 'modified'>
): Promise<OAuth2Token> => {
  const db = getDatabase('OAuth2Token');
  // Remove existing token for the request before saving new one
  await dbOperation((cb) => db.remove({ requestId: data.requestId }, {}, cb));

  const encryptedData = { ...data };
  encryptedData.accessToken = SecurityService.encrypt(data.accessToken);
  if (data.refreshToken) {
    encryptedData.refreshToken = SecurityService.encrypt(data.refreshToken);
  }

  const token: OAuth2Token = {
    _id: generateId('OAuth2Token'),
    type: 'OAuth2Token',
    ...encryptedData,
    created: getCurrentTimestamp(),
    modified: getCurrentTimestamp(),
  };

  return await dbOperation<OAuth2Token>((cb) => db.insert(token, cb));
};

export const getTokenByRequestId = async (requestId: string): Promise<OAuth2Token | null> => {
  const db = getDatabase('OAuth2Token');
  const token = await dbOperation<OAuth2Token>((cb) => db.findOne({ requestId }, cb));

  if (token) {
    token.accessToken = SecurityService.decrypt(token.accessToken);
    if (token.refreshToken) {
      token.refreshToken = SecurityService.decrypt(token.refreshToken);
    }
  }

  return token;
};

export const deleteTokenByRequestId = async (requestId: string): Promise<void> => {
  const db = getDatabase('OAuth2Token');
  await dbOperation((cb) => db.remove({ requestId }, {}, cb));
};
