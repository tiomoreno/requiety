// Shared constants for the API Client

// ============================================================================
// HTTP Methods
// ============================================================================

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

// ============================================================================
// Body Types
// ============================================================================

export const BODY_TYPES = {
  NONE: 'none',
  JSON: 'json',
  FORM_URLENCODED: 'form-urlencoded',
  FORM_DATA: 'form-data',
  RAW: 'raw',
} as const;

// ============================================================================
// Auth Types
// ============================================================================

export const AUTH_TYPES = {
  NONE: 'none',
  BASIC: 'basic',
  BEARER: 'bearer',
} as const;

// ============================================================================
// ID Prefixes
// ============================================================================

export const ID_PREFIXES = {
  WORKSPACE: 'wrk_',
  FOLDER: 'fld_',
  REQUEST: 'req_',
  RESPONSE: 'res_',
  ENVIRONMENT: 'env_',
  VARIABLE: 'var_',
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_SETTINGS = {
  timeout: 30000, // 30 seconds
  followRedirects: true,
  validateSSL: true,
  maxRedirects: 5,
  theme: 'auto' as const,
  fontSize: 14,
  maxHistoryResponses: 10,
};

export const DEFAULT_REQUEST_HEADERS = [
  { name: 'Content-Type', value: 'application/json', enabled: true },
  { name: 'Accept', value: 'application/json', enabled: true },
];

export const COMMON_HEADERS = [
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Host',
  'Origin',
  'Referer',
  'User-Agent',
  'X-Requested-With',
];

export const CONTENT_TYPES = [
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
  'text/html',
  'text/xml',
  'application/xml',
];

// ============================================================================
// Status Code Colors
// ============================================================================

export const STATUS_CODE_COLORS = {
  SUCCESS: 'text-green-600', // 2xx
  REDIRECT: 'text-blue-600', // 3xx
  CLIENT_ERROR: 'text-orange-600', // 4xx
  SERVER_ERROR: 'text-red-600', // 5xx
  INFO: 'text-gray-600', // 1xx
} as const;

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  SEND_REQUEST: 'mod+enter',
  NEW_REQUEST: 'mod+n',
  NEW_FOLDER: 'mod+shift+n',
  SEARCH: 'mod+f',
  SETTINGS: 'mod+,',
  TOGGLE_SIDEBAR: 'mod+\\',
  DUPLICATE: 'mod+d',
  DELETE: 'delete',
  NEXT_TAB: 'mod+tab',
  PREV_TAB: 'mod+shift+tab',
} as const;

// ============================================================================
// File Paths
// ============================================================================

export const APP_PATHS = {
  DATABASE: 'data/requiety.db',
  RESPONSES: 'data/responses',
  BACKUPS: 'data/backups',
  LOGS: 'logs',
} as const;
