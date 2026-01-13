import Datastore from '@seald-io/nedb';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type {
  Workspace,
  Folder,
  Request,
  Response,
  Environment,
  Variable,
  Settings,
  DocumentType,
} from '../../shared/types';

// Database instances
let workspaceDb: Datastore<Workspace>;
let folderDb: Datastore<Folder>;
let requestDb: Datastore<Request>;
let responseDb: Datastore<Response>;
let environmentDb: Datastore<Environment>;
let variableDb: Datastore<Variable>;
let settingsDb: Datastore<Settings>;

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
  const dbPath = getDbPath();
  
  // Initialize each datastore
  workspaceDb = new Datastore<Workspace>({
    filename: path.join(dbPath, 'workspaces.db'),
    autoload: true,
  });
  
  folderDb = new Datastore<Folder>({
    filename: path.join(dbPath, 'folders.db'),
    autoload: true,
  });
  
  requestDb = new Datastore<Request>({
    filename: path.join(dbPath, 'requests.db'),
    autoload: true,
  });
  
  responseDb = new Datastore<Response>({
    filename: path.join(dbPath, 'responses.db'),
    autoload: true,
  });
  
  environmentDb = new Datastore<Environment>({
    filename: path.join(dbPath, 'environments.db'),
    autoload: true,
  });
  
  variableDb = new Datastore<Variable>({
    filename: path.join(dbPath, 'variables.db'),
    autoload: true,
  });
  
  settingsDb = new Datastore<Settings>({
    filename: path.join(dbPath, 'settings.db'),
    autoload: true,
  });
  
  // Create indexes for better query performance
  await Promise.all([
    // Folder indexes
    new Promise<void>((resolve, reject) => {
      folderDb.ensureIndex({ fieldName: 'parentId' }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }),
    
    // Request indexes
    new Promise<void>((resolve, reject) => {
      requestDb.ensureIndex({ fieldName: 'parentId' }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }),
    
    // Response indexes
    new Promise<void>((resolve, reject) => {
      responseDb.ensureIndex({ fieldName: 'requestId' }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }),
    
    // Environment indexes
    new Promise<void>((resolve, reject) => {
      environmentDb.ensureIndex({ fieldName: 'workspaceId' }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }),
    
    // Variable indexes
    new Promise<void>((resolve, reject) => {
      variableDb.ensureIndex({ fieldName: 'environmentId' }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }),
  ]);
  
  console.log('Database initialized successfully');
};

// Export database instances
export const getDatabase = (type: DocumentType): Datastore => {
  switch (type) {
    case 'Workspace':
      return workspaceDb;
    case 'Folder':
      return folderDb;
    case 'Request':
      return requestDb;
    case 'Response':
      return responseDb;
    case 'Environment':
      return environmentDb;
    case 'Variable':
      return variableDb;
    case 'Settings':
      return settingsDb;
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
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
