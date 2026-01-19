// Shared TypeScript types for the API Client

// ============================================================================
// Base Types
// ============================================================================

export type DocumentType =
  | 'Workspace'
  | 'Folder'
  | 'Request'
  | 'Response'
  | 'Environment'
  | 'Variable'
  | 'Settings'
  | 'MockRoute'
  | 'OAuth2Token';

export interface BaseDocument {
  _id: string;
  type: DocumentType;
  created: number;
  modified: number;
}

// ============================================================================
// Workspace
// ============================================================================

export interface Workspace extends BaseDocument {
  type: 'Workspace';
  name: string;
  // Git Sync Configuration
  syncDirectory?: string;
  syncRepositoryUrl?: string;
  syncBranch?: string;
  syncAuthenticationType?: 'pat' | 'none';
  syncToken?: string; // NOTE: This should be stored securely in the OS keychain, not here.
}

// ============================================================================
// Folder
// ============================================================================

export interface Folder extends BaseDocument {
  type: 'Folder';
  name: string;
  parentId: string; // workspace or folder ID
  sortOrder: number;
}

// ============================================================================
// Request
// ============================================================================

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'WS'
  | 'GRPC';

export interface WebSocketMessage {
  id: string;
  type: 'incoming' | 'outgoing' | 'info' | 'error';
  data: string;
  timestamp: number;
}

export type BodyType =
  | 'none'
  | 'json'
  | 'form-urlencoded'
  | 'form-data'
  | 'raw'
  | 'graphql'
  | 'grpc';

export type AuthType = 'none' | 'basic' | 'bearer' | 'oauth2';

export type OAuth2GrantType = 'authorization_code' | 'client_credentials' | 'implicit' | 'password';

export interface OAuth2Config {
  grantType: OAuth2GrantType;
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope?: string;
  pkceEnabled?: boolean;
  accessTokenParamName?: string;
  // For password grant
  username?: string;
  password?: string;
}

export interface OAuth2Token extends BaseDocument {
  type: 'OAuth2Token';
  requestId: string; // Links token to a specific request's auth config
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number; // Unix timestamp
  scope?: string;
}

export interface RequestHeader {
  name: string;
  value: string;
  enabled: boolean;
  isAuto?: boolean;
  description?: string;
}

export interface RequestBodyParam {
  name: string;
  value: string;
  enabled: boolean;
  type?: 'text' | 'file'; // For form-data file uploads
  filePath?: string; // File path when type is 'file'
}

export interface RequestBody {
  type: BodyType;
  text?: string; // for json and raw
  params?: RequestBodyParam[]; // for form-urlencoded and form-data
  graphql?: {
    query: string;
    variables: string;
  };
}

export interface Authentication {
  type: AuthType;
  username?: string; // for basic
  password?: string; // for basic
  token?: string; // for bearer
  oauth2?: OAuth2Config; // for oauth2
}

export interface Request extends BaseDocument {
  type: 'Request';
  name: string;
  url: string;
  method: HttpMethod;
  parentId: string; // folder or workspace ID
  sortOrder: number;
  headers: RequestHeader[];
  body: RequestBody;
  authentication: Authentication;
  assertions?: Assertion[];
  preRequestScript?: string;
  postRequestScript?: string;
  grpc?: RequestGrpc;
}

export interface RequestGrpc {
  protoFilePath?: string;
  service?: string;
  method?: string;
}

// ============================================================================
// Response
// ============================================================================

export interface ResponseHeader {
  name: string;
  value: string;
}

export interface Response extends BaseDocument {
  type: 'Response';
  requestId: string;
  statusCode: number;
  statusMessage: string;
  headers: ResponseHeader[];
  body?: string; // in case we keep it in memory
  bodyPath: string; // path to file with response body
  elapsedTime: number; // milliseconds
  testResults?: TestResult;
}

// ============================================================================
// Environment
// ============================================================================

export interface Environment extends BaseDocument {
  type: 'Environment';
  name: string;
  workspaceId: string;
  isActive: boolean;
}

// ============================================================================
// Variable
// ============================================================================

export interface Variable extends BaseDocument {
  type: 'Variable';
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
}

// ============================================================================
// Settings
// ============================================================================

export interface Settings extends BaseDocument {
  _id: 'settings';
  type: 'Settings';

  // HTTP Settings
  timeout: number; // request timeout in ms
  followRedirects: boolean;
  validateSSL: boolean;
  maxRedirects: number;

  // UI Settings
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;

  // Storage
  maxHistoryResponses: number; // keep last N responses
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SendRequestResult {
  response: Response;
  body: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface WorkspaceTreeItem {
  id: string;
  type: 'workspace' | 'folder' | 'request';
  name: string;
  parentId?: string;
  children?: WorkspaceTreeItem[];
  data?: Workspace | Folder | Request;
}

export interface TemplateRenderResult {
  rendered: string;
  errors: string[];
}

// ============================================================================
// Assertions & Testing
// ============================================================================

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];

export type AssertionSource = 'status' | 'header' | 'jsonBody' | 'responseTime';

export type AssertionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'exists'
  | 'notExists'
  | 'isNull'
  | 'isNotNull';

export interface Assertion {
  id: string;
  source: AssertionSource;
  property?: string; // e.g. "Content-Type" for header, or JSON path for body
  operator: AssertionOperator;
  value?: string; // Expected value
  enabled: boolean;
}

export interface AssertionResult {
  assertionId: string;
  status: 'pass' | 'fail';
  error?: string; // processing error
  actualValue?: JSONValue | undefined;
  expectedValue?: JSONValue | undefined;
}

export interface TestResult {
  passed: number;
  failed: number;
  total: number;
  results: AssertionResult[];
}

// ============================================================================
// Runner
// ============================================================================

export type RunnerStatus = 'idle' | 'running' | 'completed' | 'stopped' | 'error';

export interface RunProgress {
  total: number;
  completed: number;
  currentRequestName: string;
  passed: number;
  failed: number;
}

export interface CollectionRunResult {
  status: RunnerStatus;
  totalRequests: number;
  passedRequests: number;
  failedRequests: number; // Requests with at least one failed assertion
  startTime: number;
  endTime: number;
  results: {
    requestId: string;
    requestName: string;
    status: 'pass' | 'fail' | 'error';
    statusCode?: number;
    duration: number;
    assertionResults?: TestResult;
  }[];
}

// ============================================================================
// Mock Server
// ============================================================================

export interface MockRoute extends BaseDocument {
  type: 'MockRoute';
  workspaceId: string;
  name: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  body: string;
  enabled: boolean;
}
