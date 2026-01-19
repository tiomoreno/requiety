import { LoggerService } from '../services/logger.service';

LoggerService.info('[DB] Loading database module...');

import Datastore from '@seald-io/nedb';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { DocumentType } from '@shared/types';

// Use a Map to store database instances for robustness
const dbs = new Map<DocumentType, Datastore<Record<string, unknown>>>();

const allDbTypes: DocumentType[] = [
  'Workspace',
  'Folder',
  'Request',
  'Response',
  'Environment',
  'Variable',
  'Settings',
  'MockRoute',
  'OAuth2Token',
];

const dbFileNames: Record<DocumentType, string> = {
  Workspace: 'workspaces.db',
  Folder: 'folders.db',
  Request: 'requests.db',
  Response: 'responses.db',
  Environment: 'environments.db',
  Variable: 'variables.db',
  Settings: 'settings.db',
  MockRoute: 'mock_routes.db',
  OAuth2Token: 'oauth2_tokens.db',
};

// Get the user data path
const getUserDataPath = (): string => {
  return app.getPath('userData');
};

// Get database directory path
const getDbPath = (): string => {
  const dbPath = path.join(getUserDataPath(), 'data');

  // Create directory if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  return dbPath;
};

// Initialize all datastores
export const initializeDatabase = async (): Promise<void> => {
  LoggerService.info('[DB] Refactored: Initializing all datastores using Map...');
  const dbPath = getDbPath();

  for (const type of allDbTypes) {
    const db = new Datastore({
      filename: path.join(dbPath, dbFileNames[type]),
      autoload: true,
    });
    dbs.set(type, db);
    LoggerService.info(`[DB] Datastore for "${type}" initialized.`);
  }

  // Create indexes for better query performance
  await Promise.all([
    new Promise<void>((resolve, reject) =>
      dbs
        .get('Folder')!
        .ensureIndex({ fieldName: 'parentId' }, (err) => (err ? reject(err) : resolve()))
    ),
    new Promise<void>((resolve, reject) =>
      dbs
        .get('Request')!
        .ensureIndex({ fieldName: 'parentId' }, (err) => (err ? reject(err) : resolve()))
    ),
    new Promise<void>((resolve, reject) =>
      dbs
        .get('Response')!
        .ensureIndex({ fieldName: 'requestId' }, (err) => (err ? reject(err) : resolve()))
    ),
    new Promise<void>((resolve, reject) =>
      dbs
        .get('Environment')!
        .ensureIndex({ fieldName: 'workspaceId' }, (err) => (err ? reject(err) : resolve()))
    ),
    new Promise<void>((resolve, reject) =>
      dbs
        .get('Variable')!
        .ensureIndex({ fieldName: 'environmentId' }, (err) => (err ? reject(err) : resolve()))
    ),
    new Promise<void>((resolve, reject) =>
      dbs
        .get('MockRoute')!
        .ensureIndex({ fieldName: 'workspaceId' }, (err) => (err ? reject(err) : resolve()))
    ),
    new Promise<void>((resolve, reject) =>
      dbs
        .get('OAuth2Token')!
        .ensureIndex({ fieldName: 'requestId' }, (err) => (err ? reject(err) : resolve()))
    ),
  ]);

  LoggerService.info('[DB] Database initialization complete.');
};

// Export database instances
export const getDatabase = (type: DocumentType): Datastore => {
  const db = dbs.get(type);
  if (!db) {
    // This error should now be almost impossible if initializeDatabase has run
    throw new Error(`Database for type "${type}" was not initialized.`);
  }
  return db;
};

// Helper to promisify NeDB operations
export const dbOperation = <T>(
  operation: (callback: (err: Error | null, result: T) => void) => void
): Promise<T> => {
  return new Promise((resolve, reject) => {
    operation((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};
