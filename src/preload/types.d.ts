// Type definitions for window.api exposed by preload script

import type {
  Workspace,
  Folder,
  Request,
  Response,
  Environment,
  Variable,
  Settings,
  SendRequestResult,
  ApiResponse,
} from './shared/types';

export interface ElectronAPI {
  workspace: {
    create: (data: Omit<Workspace, '_id' | 'type' | 'created' | 'modified'>) => Promise<Workspace>;
    update: (id: string, data: Partial<Workspace>) => Promise<Workspace>;
    delete: (id: string) => Promise<void>;
    getAll: () => Promise<Workspace[]>;
    getById: (id: string) => Promise<Workspace>;
  };

  folder: {
    create: (data: Omit<Folder, '_id' | 'type' | 'created' | 'modified'>) => Promise<Folder>;
    update: (id: string, data: Partial<Folder>) => Promise<Folder>;
    delete: (id: string) => Promise<void>;
    move: (id: string, newParentId: string) => Promise<Folder>;
    getByWorkspace: (workspaceId: string) => Promise<Folder[]>;
  };

  request: {
    create: (data: Omit<Request, '_id' | 'type' | 'created' | 'modified'>) => Promise<ApiResponse<Request>>;
    update: (id: string, data: Partial<Request>) => Promise<ApiResponse<Request>>;
    delete: (id: string) => Promise<ApiResponse<void>>;
    duplicate: (id: string) => Promise<ApiResponse<Request>>;
    send: (id: string) => Promise<SendRequestResult>;
    getByWorkspace: (workspaceId: string) => Promise<ApiResponse<Request[]>>;
    getById: (id: string) => Promise<ApiResponse<Request | null>>;
  };

  response: {
    getHistory: (requestId: string, limit?: number) => Promise<Response[]>;
    getById: (id: string) => Promise<Response>;
    deleteHistory: (requestId: string) => Promise<void>;
  };

  environment: {
    create: (data: Omit<Environment, '_id' | 'type' | 'created' | 'modified'>) => Promise<Environment>;
    update: (id: string, data: Partial<Environment>) => Promise<Environment>;
    delete: (id: string) => Promise<void>;
    activate: (id: string) => Promise<void>;
    getByWorkspace: (workspaceId: string) => Promise<Environment[]>;
  };

  variable: {
    create: (data: Omit<Variable, '_id' | 'type' | 'created' | 'modified'>) => Promise<Variable>;
    update: (id: string, data: Partial<Variable>) => Promise<Variable>;
    delete: (id: string) => Promise<void>;
    getByEnvironment: (environmentId: string) => Promise<Variable[]>;
  };

  settings: {
    get: () => Promise<Settings>;
    update: (data: Partial<Settings>) => Promise<Settings>;
  };

  importExport: {
    exportWorkspace: (workspaceId: string) => Promise<string>;
    importJSON: (json: string) => Promise<Workspace>;
    importPostman: (json: string) => Promise<Workspace>;
    importCurl: (curl: string) => Promise<Request>;
  };

  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
