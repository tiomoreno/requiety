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
