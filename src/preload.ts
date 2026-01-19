import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type {
  Workspace,
  Folder,
  Request,
  Environment,
  Variable,
  Settings,
  SendRequestResult,
  ApiResponse,
  Assertion,
  OAuth2Config,
  OAuth2Token,
  RunProgress,
  MockRoute,
  WebSocketMessage,
} from '@shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Workspace operations
  workspace: {
    create: (data: Omit<Workspace, '_id' | 'type' | 'created' | 'modified'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_CREATE, data),
    update: (id: string, data: Partial<Workspace>) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_DELETE, id),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_ALL),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_BY_ID, id),
  },

  // Folder operations
  folder: {
    create: (data: Omit<Folder, '_id' | 'type' | 'created' | 'modified'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_CREATE, data),
    update: (id: string, data: Partial<Folder>) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_DELETE, id),
    move: (id: string, newParentId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_MOVE, id, newParentId),
    getByWorkspace: (workspaceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_GET_BY_WORKSPACE, workspaceId),
  },

  // Request operations
  request: {
    create: (
      data: Omit<Request, '_id' | 'type' | 'created' | 'modified'>
    ): Promise<ApiResponse<Request>> => ipcRenderer.invoke(IPC_CHANNELS.REQUEST_CREATE, data),
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
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.RESPONSE_GET_BY_ID, id),
    deleteHistory: (requestId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSE_DELETE_HISTORY, requestId),
  },

  // Environment operations
  environment: {
    create: (data: Omit<Environment, '_id' | 'type' | 'created' | 'modified'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_CREATE, data),
    update: (id: string, data: Partial<Environment>) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_DELETE, id),
    activate: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_ACTIVATE, id),
    getByWorkspace: (workspaceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENT_GET_BY_WORKSPACE, workspaceId),
  },

  // Variable operations
  variable: {
    create: (data: Omit<Variable, '_id' | 'type' | 'created' | 'modified'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.VARIABLE_CREATE, data),
    update: (id: string, data: Partial<Variable>) =>
      ipcRenderer.invoke(IPC_CHANNELS.VARIABLE_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.VARIABLE_DELETE, id),
    getByEnvironment: (environmentId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.VARIABLE_GET_BY_ENVIRONMENT, environmentId),
  },

  // Settings operations
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    update: (data: Partial<Settings>) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, data),
  },

  // Import/Export operations
  importExport: {
    exportWorkspace: (workspaceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DATA_EXPORT, workspaceId),
    importWorkspace: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_IMPORT),
    importPostman: (): Promise<ApiResponse<Workspace>> =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_POSTMAN),
    importCurl: (curlCommand: string, parentId: string): Promise<ApiResponse<Request>> =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CURL, curlCommand, parentId),
  },

  // Runner operations
  runner: {
    start: (targetId: string, type: 'folder' | 'workspace') =>
      ipcRenderer.invoke(IPC_CHANNELS.RUNNER_START, { targetId, type }),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.RUNNER_STOP),
    onProgress: (callback: (progress: RunProgress) => void) => {
      const subscription = (_: unknown, progress: RunProgress) => callback(progress);
      ipcRenderer.on(IPC_CHANNELS.RUNNER_ON_PROGRESS, subscription);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.RUNNER_ON_PROGRESS, subscription);
      };
    },
  },

  // GraphQL
  graphql: {
    introspect: (
      url: string,
      headers: Record<string, string>
    ): Promise<{ success: boolean; data?: unknown; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.GRAPHQL_INTROSPECT, { url, headers }),
  },

  // gRPC
  grpc: {
    selectProtoFile: (): Promise<ApiResponse<string | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.GRPC_SELECT_PROTO_FILE),
    parseProto: (filePath: string): Promise<ApiResponse<unknown>> =>
      ipcRenderer.invoke(IPC_CHANNELS.GRPC_PARSE_PROTO, filePath),
  },

  // Sync
  sync: {
    setDirectory: (): Promise<ApiResponse<string | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_SET_DIRECTORY),
    setup: (args: {
      workspaceId: string;
      url: string;
      branch: string;
      token: string;
      directory: string;
    }): Promise<ApiResponse<void>> => ipcRenderer.invoke(IPC_CHANNELS.SYNC_SETUP, args),
    pull: (workspaceId: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_PULL, workspaceId),
    push: (workspaceId: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_PUSH, workspaceId),
  },

  // OAuth 2.0
  oauth: {
    startAuthCodeFlow: (
      config: OAuth2Config,
      requestId: string
    ): Promise<ApiResponse<OAuth2Token>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_START_AUTH_FLOW, config, requestId),
    clientCredentials: (
      config: OAuth2Config,
      requestId: string
    ): Promise<ApiResponse<OAuth2Token>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_CLIENT_CREDENTIALS, config, requestId),
    passwordGrant: (config: OAuth2Config, requestId: string): Promise<ApiResponse<OAuth2Token>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_PASSWORD_GRANT, config, requestId),
    refreshToken: (
      config: OAuth2Config,
      refreshToken: string,
      requestId: string
    ): Promise<ApiResponse<OAuth2Token>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_REFRESH_TOKEN, config, refreshToken, requestId),
    getToken: (requestId: string): Promise<ApiResponse<OAuth2Token | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_GET_TOKEN, requestId),
    clearToken: (requestId: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.OAUTH_CLEAR_TOKEN, requestId),
  },

  // Mock Server
  mock: {
    start: (workspaceId: string, port: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_START, { workspaceId, port }),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_STOP),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_GET_STATUS),
    getLogs: () => ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_GET_LOGS),
    clearLogs: () => ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_CLEAR_LOGS),
    getRoutes: (workspaceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_ROUTE_GET_BY_WORKSPACE, workspaceId),
    createRoute: (data: Omit<MockRoute, '_id' | 'type' | 'created' | 'modified'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_ROUTE_CREATE, data),
    updateRoute: (id: string, data: Partial<MockRoute>) =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_ROUTE_UPDATE, { id, data }),
    deleteRoute: (id: string, workspaceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_ROUTE_DELETE, { id, workspaceId }),
  },

  // WebSocket
  ws: {
    connect: (requestId: string, url: string) =>
      ipcRenderer.send(IPC_CHANNELS.WS_CONNECT, { requestId, url }),
    disconnect: (requestId: string) => ipcRenderer.send(IPC_CHANNELS.WS_DISCONNECT, { requestId }),
    send: (requestId: string, message: string) =>
      ipcRenderer.send(IPC_CHANNELS.WS_SEND, { requestId, message }),
    onEvent: (
      callback: (payload: WebSocketMessage | { requestId: string; error: string }) => void
    ) => {
      const subscription = (
        _: unknown,
        payload: WebSocketMessage | { requestId: string; error: string }
      ) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.WS_EVENT, subscription);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.WS_EVENT, subscription);
    },
  },

  // Event listeners
  on: (
    channel:
      | typeof IPC_CHANNELS.RESPONSE_RECEIVED
      | typeof IPC_CHANNELS.REQUEST_SENT
      | typeof IPC_CHANNELS.ERROR,
    callback: (...args: unknown[]) => void
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
    channel:
      | typeof IPC_CHANNELS.RESPONSE_RECEIVED
      | typeof IPC_CHANNELS.REQUEST_SENT
      | typeof IPC_CHANNELS.ERROR,
    callback: (...args: unknown[]) => void
  ) => {
    ipcRenderer.removeListener(channel, callback);
  },
});
