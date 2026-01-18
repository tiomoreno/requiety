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
  Assertion,
  OAuth2Config,
  OAuth2Token,
  RunProgress,
  CollectionRunResult,
} from '../shared/types';
import type { IpcChannel } from '../shared/ipc-channels';

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

  assertions: {
    update: (requestId: string, assertions: Assertion[]) => Promise<ApiResponse<Request>>;
  };

  graphql: {
    introspect: (url: string, headers: Record<string, string>) => Promise<ApiResponse<unknown>>;
  };

  grpc: {
    selectProtoFile: () => Promise<ApiResponse<string | null>>;
    parseProto: (filePath: string) => Promise<ApiResponse<unknown>>;
  };

  sync: {
    setDirectory: () => Promise<ApiResponse<string | null>>;
    exportWorkspace: (workspaceId: string, directory: string) => Promise<ApiResponse<void>>;
  };

  oauth: {
    startAuthCodeFlow: (config: OAuth2Config, requestId: string) => Promise<ApiResponse<OAuth2Token>>;
    clientCredentials: (config: OAuth2Config, requestId: string) => Promise<ApiResponse<OAuth2Token>>;
    passwordGrant: (config: OAuth2Config, requestId: string) => Promise<ApiResponse<OAuth2Token>>;
    refreshToken: (config: OAuth2Config, refreshToken: string, requestId: string) => Promise<ApiResponse<OAuth2Token>>;
    getToken: (requestId: string) => Promise<ApiResponse<OAuth2Token | null>>;
    clearToken: (requestId: string) => Promise<ApiResponse<void>>;
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
    exportWorkspace: (workspaceId: string) => Promise<{ success: boolean; error?: string }>;
    importWorkspace: () => Promise<{ success: boolean; data?: Workspace; error?: string }>;
    importPostman: () => Promise<{ success: boolean; data?: Workspace; error?: string }>;
    importCurl: (curlCommand: string, parentId: string) => Promise<{ success: boolean; data?: Request; error?: string }>;
  };

  runner: {
    start: (targetId: string, type: 'folder' | 'workspace') => Promise<CollectionRunResult>;
    stop: () => Promise<void>;
    onProgress: (callback: (progress: RunProgress) => void) => () => void;
  };

  ws: {
    connect: (requestId: string, url: string) => void;
    disconnect: (requestId: string) => void;
    send: (requestId: string, message: string) => void;
    onEvent: (callback: (payload: { requestId: string; type: string; data?: string; timestamp: number }) => void) => () => void;
  };

  on: (
    channel: IpcChannel,
    callback: (...args: unknown[]) => void
  ) => void;
  off: (
    channel: IpcChannel,
    callback: (...args: unknown[]) => void
  ) => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
