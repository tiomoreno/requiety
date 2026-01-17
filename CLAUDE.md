# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Requiety is a modern, cross-platform desktop API client for testing REST APIs, GraphQL, and WebSockets. Built with Electron, React, and TypeScript as an open-source alternative to Postman and Insomnia with offline-first architecture.

## Development Commands

### Running the Application
```bash
npm start                    # Start development server with hot reload
npm run package              # Package the app for current platform
npm run make                 # Build distributable for current platform
```

### Testing
```bash
npm test                     # Run all tests in watch mode
npm run test:ui              # Run tests with Vitest UI
vitest run                   # Run tests once without watch
vitest run --coverage        # Generate coverage report
vitest <pattern>             # Run specific test file(s) matching pattern
```

### Code Quality
```bash
npm run lint                 # Run ESLint on TypeScript files
```

## Architecture

### Three-Process Electron Architecture

**Main Process** (`src/main.ts`):
- Entry point for Electron application
- Manages window lifecycle and native system integration
- Orchestrates database initialization, migrations, and IPC handler registration
- Business logic lives in services and database operations

**Preload Script** (`src/preload.ts`):
- Security bridge between main and renderer processes
- Exposes typed API to renderer via `contextBridge.exposeInMainWorld('api', {...})`
- All IPC communication flows through here - never call `ipcRenderer` from renderer

**Renderer Process** (`src/renderer/`):
- React application with routing, contexts, and components
- Communicates with main process exclusively through `window.api.*` methods
- Uses React Context for state management (WorkspaceContext, DataContext, SettingsContext)

### Database Architecture

Uses NeDB (embedded NoSQL) with separate collections for each entity type:
- **Workspace** → **Folder** (hierarchical, recursive) → **Request** → **Response** (history)
- **Workspace** → **Environment** → **Variable**
- **Settings** (singleton, ID: 'settings')

Key patterns:
- All database operations in `src/main/database/models.ts` return Promises
- Helper `dbOperation()` in `src/main/database/index.ts` promisifies NeDB callbacks
- Indexes created on foreign keys (`parentId`, `workspaceId`, `environmentId`, `requestId`) for performance
- Response bodies saved to filesystem at `userData/responses/` to keep DB lean

### IPC Communication Pattern

1. **Channels defined** in `src/shared/ipc-channels.ts` (single source of truth)
2. **Handlers registered** in `src/main/ipc/*.ts` files using `ipcMain.handle()`
3. **API exposed** via preload script as typed methods on `window.api.*`
4. **Services invoked** from renderer using `await window.api.request.send(id)`

### Request Execution Flow

When sending a request (`RequestExecutionService.executeRequest()`):

1. **Resolve environment variables** from active environment
2. **Run pre-request script** (JavaScript sandbox with `pm` API for variable manipulation)
3. **Render templates** using Nunjucks (replaces `{{varName}}` in URL, headers, body)
4. **Calculate auto-headers** (e.g., Host header derived from URL)
5. **Send HTTP request** via `HttpService` (Axios wrapper with cookie management)
6. **Run post-request script** (can extract data from response and set variables)
7. **Run assertions** if configured (status code, headers, JSONPath, response time)
8. **Save response** metadata to DB and body to filesystem
9. **Return merged response** with body for immediate display

### Testing & Assertions

**Assertion Types** (`src/shared/types.ts`):
- Source: `status`, `header`, `jsonBody`, `responseTime`
- Operators: `equals`, `notEquals`, `contains`, `greaterThan`, `lessThan`, `exists`, etc.
- Each assertion produces pass/fail result with actual vs expected values

**Test Runner** (`RunnerService`):
- Executes folders or workspaces sequentially
- Emits progress events via IPC for live UI updates
- Collects pass/fail statistics and detailed assertion results
- Can be stopped mid-run

### Path Aliases

Configured in `vitest.config.ts` and Vite configs:
```typescript
'@' → './src'
'@shared' → './src/shared'
'@main' → './src/main'
'@renderer' → './src/renderer'
```

Use these in imports for cleaner code: `import { Request } from '@shared/types'`

## Key Files and Their Roles

### Main Process
- `src/main.ts` - Application entry point, initialization sequence
- `src/main/database/models.ts` - All database CRUD operations (1800+ lines, critical file)
- `src/main/services/request.execution.service.ts` - Core request execution flow
- `src/main/services/assertion.service.ts` - Test assertion evaluation
- `src/main/services/script.service.ts` - JavaScript sandbox for pre/post scripts
- `src/main/services/runner.service.ts` - Batch request execution
- `src/main/services/graphql.service.ts` - GraphQL introspection
- `src/main/services/websocket.service.ts` - WebSocket connection management
- `src/main/http/client.ts` - HTTP client with cookie jar
- `src/main/utils/template-engine.ts` - Nunjucks template rendering
- `src/main/ipc/*.ts` - IPC handlers for each domain (workspace, request, etc.)

### Shared
- `src/shared/types.ts` - All TypeScript types/interfaces used across processes
- `src/shared/ipc-channels.ts` - IPC channel name constants

### Renderer
- `src/renderer/App.tsx` - Main React component with routing
- `src/renderer/contexts/DataContext.tsx` - Manages active workspace, folders, requests state
- `src/renderer/contexts/WorkspaceContext.tsx` - Workspace switching logic
- `src/renderer/contexts/SettingsContext.tsx` - Application settings
- `src/renderer/components/request/RequestPanel.tsx` - Main request editor interface
- `src/renderer/components/layout/TreeView.tsx` - Sidebar workspace tree
- `src/renderer/components/runner/RunnerModal.tsx` - Test runner UI

## Important Development Notes

### When Working with Database Models
- Always update `modified` timestamp using `getCurrentTimestamp()`
- Cascade deletes: Deleting workspace → deletes folders → deletes requests → deletes responses
- Use `getWorkspaceIdForRequest()` to traverse hierarchy upward (max depth: 20)
- Folder operations use recursive traversal pattern (collect IDs level by level)

### When Adding New IPC Handlers
1. Add channel constant to `src/shared/ipc-channels.ts`
2. Create/update handler in `src/main/ipc/<domain>.ts`
3. Register handler in `src/main.ts` initialization
4. Expose API method in `src/preload.ts`
5. Add TypeScript types to `src/preload/types.d.ts` for renderer autocomplete

### When Working with Scripts
- Scripts execute in isolated VM context (`vm.createContext()`)
- Available API: `pm.environment.get()`, `pm.environment.set()`, `pm.response.json()`, etc.
- Variable updates are batched and written to DB after script completes
- New variables are created automatically if they don't exist

### When Testing
- Tests live alongside source files (e.g., `models.test.ts` next to `models.ts`)
- Use `happy-dom` environment for renderer components
- Mock `window.api.*` methods when testing renderer components
- Database operations in tests should use in-memory NeDB (`:memory:`)

### GraphQL Support
- Introspection query fetches schema from endpoint
- Schema used for autocomplete in GraphQL editor (CodeMirror with cm6-graphql)
- Variables sent as separate JSON object

### WebSocket Support
- Each request can have WS method type
- Connections managed by `WebSocketService` singleton
- Messages sent to renderer via IPC events (`ws:event`)
- UI displays real-time message log with incoming/outgoing/info/error types

## File Organization

```
src/
├── main/                    # Electron main process
│   ├── database/            # NeDB setup and models
│   ├── http/                # HTTP client (Axios)
│   ├── ipc/                 # IPC handlers by domain
│   ├── services/            # Business logic (assertions, scripts, runner, etc.)
│   └── utils/               # File manager, ID generation, templates
├── preload/                 # Preload script and types
├── renderer/                # React application
│   ├── components/          # UI components
│   │   ├── common/          # Reusable UI elements
│   │   ├── environments/    # Environment & variable management
│   │   ├── layout/          # Sidebar, tree view, workspace selector
│   │   ├── request/         # Request editor and tabs
│   │   ├── response/        # Response viewer
│   │   ├── runner/          # Test runner modal
│   │   ├── settings/        # Settings modal
│   │   └── workspace/       # Workspace dialogs
│   ├── contexts/            # React contexts for global state
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Renderer-side service wrappers around window.api
│   └── utils/               # Tree building, filtering, header utilities
└── shared/                  # Code shared between processes
    ├── types.ts             # TypeScript type definitions
    └── ipc-channels.ts      # IPC channel constants
```

## Common Patterns

### Creating a New Entity
```typescript
// Always use generateId() for consistent ID format
import { generateId, getCurrentTimestamp } from '@main/utils/id-generator';

const entity = {
  _id: generateId('Request'),  // Prefix ensures uniqueness across types
  type: 'Request',
  // ... other fields
  created: getCurrentTimestamp(),
  modified: getCurrentTimestamp(),
};
```

### Variable Templating
- Uses Nunjucks syntax: `{{variableName}}`
- Available in: URL, headers, body (all types)
- Rendered before request execution
- Variables resolved from active environment only

### Hierarchical Parent-Child Relationships
- Workspace (root) → Folder | Request
- Folder → Folder (nested) | Request
- `parentId` always references immediate parent
- Use helper functions like `getWorkspaceFolderIds()` for full tree traversal

## Testing Philosophy

Follow the testing pyramid documented in GEMINI.md:
1. **Unit tests** for pure functions and utilities (template engine, ID generator, etc.)
2. **Integration tests** for services and IPC handlers with real/mocked DB
3. **E2E tests** (Playwright) for critical user flows

Coverage goals:
- Utilities and core services: >80%
- Database models: Critical paths covered
- UI components: Test user interactions and state changes
