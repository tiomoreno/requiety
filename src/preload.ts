import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './shared/ipc-channels';
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
} from './shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Workspace operations
  workspace: {
    create: (data: Omit<Workspace, '_id' | 'type' | 'created' | 'modified'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_CREATE, data),
    update: (id: string, data: Partial<Workspace>) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_UPDATE, id, data),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_DELETE, id),
    getAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_ALL),
    getById: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_BY_ID, id),
  },

  // Folder operations
  folder: {
    create: (data: Omit<Folder, '_id' | 'type' | 'created' | 'modified'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_CREATE, data),
    update: (id: string, data: Partial<Folder>) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_UPDATE, id, data),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_DELETE, id),
    move: (id: string, newParentId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_MOVE, id, newParentId),
    getByWorkspace: (workspaceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_GET_BY_WORKSPACE, workspaceId),
  },

  // Request operations
  request: {
    create: (data: Omit<Request, '_id' | 'type' | 'created' | 'modified'>): Promise<ApiResponse<Request>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REQUEST_CREATE, data),
    update: (id: string, data: Partial<Request>): Promise<ApiResponse<Request>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REQUEST_UPDATE, id, data),
    delete: (id: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REQUEST_DELETE, id),
    duplicate: (id: string): Promise<ApiResponse<Request>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REQUEST_DUPLICATE, id),
    send: (id: string): Promise<SendRequestResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.REQUEST_SEND, id),
    getByWorkspace: (workspaceId: string): Promise<ApiResponse<Request[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REQUEST_GET_BY_WORKSPACE, workspaceId),
    getById: (id: string): Promise<ApiResponse<Request | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REQUEST_GET_BY_ID, id),
  },

  // Assertion operations
  assertions: {
    update: (requestId: string, assertions: Assertion[]): Promise<ApiResponse<Request>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ASSERTIONS_UPDATE, requestId, assertions),
  },

  // Response operations
  response: {
    getHistory: (requestId: string, limit?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSE_GET_HISTORY, requestId, limit),
    getById: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSE_GET_BY_ID, id),
    deleteHistory: (requestId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSE_DELETE_HISTORY, requestId),
  },

  // Environment operations
  environment: {
    create: (data: Omit<Environment, '_id' | 'type' | 'created' | 'modified'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_CREATE, data),
    update: (id: string, data: Partial<Environment>) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_UPDATE, id, data),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_DELETE, id),
    activate: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_ACTIVATE, id),
    getByWorkspace: (workspaceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_GET_BY_WORKSPACE, workspaceId),
  },

  // Variable operations
  variable: {
    create: (data: Omit<Variable, '_id' | 'type' | 'created' | 'modified'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.VARIABLE_CREATE, data),
    update: (id: string, data: Partial<Variable>) =>
      ipcRenderer.invoke(IPC_CHANNELS.VARIABLE_UPDATE, id, data),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.VARIABLE_DELETE, id),
    getByEnvironment: (environmentId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.VARIABLE_GET_BY_ENVIRONMENT, environmentId),
  },

  // Settings operations
  settings: {
    get: (): Promise<Settings> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    update: (data: Partial<Settings>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, data),
  },

  // Import/Export operations
  importExport: {
    exportWorkspace: (workspaceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DATA_EXPORT, workspaceId),
    importWorkspace: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATA_IMPORT),
    importPostman: (): Promise<ApiResponse<Workspace>> =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_POSTMAN),
    importCurl: (curlCommand: string, parentId: string): Promise<ApiResponse<Request>> =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CURL, curlCommand, parentId),
  },

  // Runner operations
  runner: {
    start: (targetId: string, type: 'folder' | 'workspace') =>
      ipcRenderer.invoke(IPC_CHANNELS.RUNNER_START, { targetId, type }),
    stop: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RUNNER_STOP),
    onProgress: (callback: (progress: any) => void) => {
      const subscription = (_: any, progress: any) => callback(progress);
      ipcRenderer.on(IPC_CHANNELS.RUNNER_ON_PROGRESS, subscription);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.RUNNER_ON_PROGRESS, subscription);
      };
    },
  },

  // GraphQL
  graphql: {
    introspect: (url: string, headers: any): Promise<{ success: boolean; data?: any; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.GRAPHQL_INTROSPECT, { url, headers }),
  },

  // gRPC
  grpc: {
    selectProtoFile: (): Promise<ApiResponse<string | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.GRPC_SELECT_PROTO_FILE),
    parseProto: (filePath: string): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke(IPC_CHANNELS.GRPC_PARSE_PROTO, filePath),
  },

  // Sync
  sync: {
    setDirectory: (): Promise<ApiResponse<string | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_SET_DIRECTORY),
    exportWorkspace: (workspaceId: string, directory: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_EXPORT, workspaceId, directory),
  },

  // OAuth 2.0
  oauth: {
    startAuthCodeFlow: (config: OAuth2Config, requestId: string): Promise<ApiResponse<OAuth2Token>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_START_AUTH_FLOW, config, requestId),
    clientCredentials: (config: OAuth2Config, requestId: string): Promise<ApiResponse<OAuth2Token>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_CLIENT_CREDENTIALS, config, requestId),
    passwordGrant: (config: OAuth2Config, requestId: string): Promise<ApiResponse<OAuth2Token>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_PASSWORD_GRANT, config, requestId),
    refreshToken: (config: OAuth2Config, refreshToken: string, requestId: string): Promise<ApiResponse<OAuth2Token>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_REFRESH_TOKEN, config, refreshToken, requestId),
    getToken: (requestId: string): Promise<ApiResponse<OAuth2Token | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_GET_TOKEN, requestId),
    clearToken: (requestId: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_CLEAR_TOKEN, requestId),
  },

  // WebSocket
  ws: {
    connect: (requestId: string, url: string) => ipcRenderer.send(IPC_CHANNELS.WS_CONNECT, { requestId, url }),
    disconnect: (requestId: string) => ipcRenderer.send(IPC_CHANNELS.WS_DISCONNECT, { requestId }),
    send: (requestId: string, message: string) => ipcRenderer.send(IPC_CHANNELS.WS_SEND, { requestId, message }),
    onEvent: (callback: (payload: any) => void) => {
        const subscription = (_: any, payload: any) => callback(payload);
        ipcRenderer.on(IPC_CHANNELS.WS_EVENT, subscription);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.WS_EVENT, subscription);
    }
  },

  // Event listeners
  on: (
    channel: typeof IPC_CHANNELS.RESPONSE_RECEIVED | typeof IPC_CHANNELS.REQUEST_SENT | typeof IPC_CHANNELS.ERROR,
    callback: (...args: any[]) => void
  ) => {
    const validChannels = [
      IPC_CHANNELS.RESPONSE_RECEIVED,
      IPC_CHANNELS.REQUEST_SENT,
      IPC_CHANNELS.ERROR,
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  off: (
    channel: typeof IPC_CHANNELS.RESPONSE_RECEIVED | typeof IPC_CHANNELS.REQUEST_SENT | typeof IPC_CHANNELS.ERROR,
    callback: (...args: any[]) => void
  ) => {
    ipcRenderer.removeListener(channel, callback);
  },
});
