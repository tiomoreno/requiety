import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initializeDatabase } from './main/database';
import { runMigrations } from './main/database/migrations';
import { initializeDirectories } from './main/utils/file-manager';
import { registerWorkspaceHandlers } from './main/ipc/workspace';
import { registerFolderHandlers } from './main/ipc/folder';
import { registerRequestHandlers } from './main/ipc/request';
import { registerAssertionHandlers } from './main/ipc/assertion';
import { registerEnvironmentHandlers } from './main/ipc/environment';
import { registerVariableHandlers } from './main/ipc/variable';
import { registerSettingsHandlers } from './main/ipc/settings';
import { registerResponseHandlers } from './main/ipc/response';
import { registerDataTransferHandlers } from './main/ipc/data-transfer';
import { registerRunnerHandlers } from './main/ipc/runner';
import { registerGrpcHandlers } from './main/ipc/grpc';
import { registerSyncHandlers } from './main/ipc/sync';
import { registerWebSocketHandlers } from './main/ipc/websocket';
import { registerOAuthHandlers } from './main/ipc/oauth';
import { registerMockHandlers } from './main/ipc/mock';
import { WebSocketService } from './main/services/websocket.service';
import { LoggerService } from './main/services/logger.service';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set window for WebSocket Service
  WebSocketService.setWindow(mainWindow);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Initialize application
const initializeApp = async () => {
  try {
    LoggerService.info('Initializing application...');

    // Create application directories
    await initializeDirectories();
    LoggerService.debug('Application directories created');

    // Initialize database
    await initializeDatabase();
    LoggerService.debug('Database initialized');

    // Run migrations
    await runMigrations();
    LoggerService.debug('Migrations completed');

    // Register IPC handlers
    registerWorkspaceHandlers();
    registerFolderHandlers();
    registerRequestHandlers();
    registerAssertionHandlers();
    registerEnvironmentHandlers();
    registerVariableHandlers();
    registerSettingsHandlers();
    registerDataTransferHandlers();
    registerResponseHandlers();
    registerRunnerHandlers();
    registerGrpcHandlers();
    registerSyncHandlers();
    registerWebSocketHandlers();
    registerOAuthHandlers();
    registerMockHandlers();
    LoggerService.debug('IPC handlers registered');

    LoggerService.info('Application initialized successfully');
  } catch (error) {
    LoggerService.error('Failed to initialize application:', error);
    app.quit();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  await initializeApp();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
