// IPC Channel names for communication between main and renderer processes

export const IPC_CHANNELS = {
  // Workspace
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_GET_ALL: 'workspace:getAll',
  WORKSPACE_GET_BY_ID: 'workspace:getById',

  // Folder
  FOLDER_CREATE: 'folder:create',
  FOLDER_UPDATE: 'folder:update',
  FOLDER_DELETE: 'folder:delete',
  FOLDER_MOVE: 'folder:move',
  FOLDER_GET_BY_WORKSPACE: 'folder:getByWorkspace',

  // Request
  REQUEST_CREATE: 'request:create',
  REQUEST_UPDATE: 'request:update',
  REQUEST_DELETE: 'request:delete',
  REQUEST_DUPLICATE: 'request:duplicate',
  REQUEST_SEND: 'request:send',
  REQUEST_GET_BY_WORKSPACE: 'request:getByWorkspace',
  REQUEST_GET_BY_ID: 'request:getById',

  // Response
  RESPONSE_GET_HISTORY: 'response:getHistory',
  RESPONSE_GET_BY_ID: 'response:getById',
  RESPONSE_DELETE_HISTORY: 'response:deleteHistory',

  // Environment
  ENVIRONMENT_CREATE: 'environment:create',
  ENVIRONMENT_UPDATE: 'environment:update',
  ENVIRONMENT_DELETE: 'environment:delete',
  ENVIRONMENT_ACTIVATE: 'environment:activate',
  ENVIRONMENT_GET_BY_WORKSPACE: 'environment:getByWorkspace',

  // Variable
  VARIABLE_CREATE: 'variable:create',
  VARIABLE_UPDATE: 'variable:update',
  VARIABLE_DELETE: 'variable:delete',
  VARIABLE_GET_BY_ENVIRONMENT: 'variable:getByEnvironment',

  // Data Transfer
  DATA_EXPORT: 'data:export',
  DATA_IMPORT: 'data:import',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Import/Export
  EXPORT_WORKSPACE: 'export:workspace',
  IMPORT_JSON: 'import:json',
  IMPORT_POSTMAN: 'import:postman',
  IMPORT_CURL: 'import:curl',

  // Events (main -> renderer)
  RESPONSE_RECEIVED: 'event:response-received',
  REQUEST_SENT: 'event:request-sent',
  ERROR: 'event:error',
  
  // Runner
  RUNNER_START: 'runner:start',
  RUNNER_STOP: 'runner:stop',
  RUNNER_ON_PROGRESS: 'runner:on-progress',
  RUNNER_ON_COMPLETE: 'runner:on-complete',
} as const;


export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
