import { v4 as uuidv4 } from 'uuid';
import { ID_PREFIXES } from '../../shared/constants';
import type { DocumentType } from '../../shared/types';

/**
 * Generate a unique ID with the appropriate prefix for the document type
 */
export const generateId = (type: DocumentType): string => {
  const uuid = uuidv4();
  
  switch (type) {
    case 'Workspace':
      return `${ID_PREFIXES.WORKSPACE}${uuid}`;
    case 'Folder':
      return `${ID_PREFIXES.FOLDER}${uuid}`;
    case 'Request':
      return `${ID_PREFIXES.REQUEST}${uuid}`;
    case 'Response':
      return `${ID_PREFIXES.RESPONSE}${uuid}`;
    case 'Environment':
      return `${ID_PREFIXES.ENVIRONMENT}${uuid}`;
    case 'Variable':
      return `${ID_PREFIXES.VARIABLE}${uuid}`;
    case 'Settings':
      return 'settings'; // Settings has a fixed ID
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
};

/**
 * Get the current timestamp in milliseconds
 */
export const getCurrentTimestamp = (): number => {
  return Date.now();
};
