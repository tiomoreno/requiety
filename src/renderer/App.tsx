import { useState, useRef, useCallback } from 'react';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { DataProvider } from './contexts/DataContext';
import { useWorkspaces } from './hooks/useWorkspaces';
import { useData } from './hooks/useData';
import { Sidebar } from './components/layout/Sidebar';
import { CreateWorkspaceDialog } from './components/workspace/CreateWorkspaceDialog';
import { EmptyState } from './components/workspace/EmptyState';
import { RequestPanel } from './components/request/RequestPanel';
import { ImportCurlDialog } from './components/workspace/ImportCurlDialog';
import { dataTransferService } from './services/data-transfer.service';

import { SettingsModal } from './components/settings/SettingsModal';
import { useSettings } from './contexts/SettingsContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppContent() {
  const { settings, updateSettings } = useSettings();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportCurlDialog, setShowImportCurlDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { workspaces, activeWorkspace, loading: workspacesLoading, refreshWorkspaces } = useWorkspaces();
  const { selectedRequest, updateRequest, createRequest, loading: dataLoading, refreshData } = useData();

  // Ref for focusing search input
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toggle sidebar visibility
  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Focus search input
  const handleFocusSearch = useCallback(() => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
    // Use setTimeout to ensure sidebar is visible before focusing
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, [sidebarCollapsed]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSidebar: handleToggleSidebar,
    onFocusSearch: handleFocusSearch,
  });

  const handleImportCurl = async (curlCommand: string) => {
    if (!activeWorkspace) {
      throw new Error('No active workspace to import into.');
    }
    await dataTransferService.importFromCurl(curlCommand, activeWorkspace._id);
    await refreshData();
  };

  const loading = workspacesLoading || (dataLoading && !workspaces.length);

  // Helper to determining current visual theme
  const isDark = settings?.theme === 'dark' ||
    (settings?.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
     const newTheme = isDark ? 'light' : 'dark';
     updateSettings({ theme: newTheme });
  };

  // Note: Theme application logic is handled centrally in SettingsContext

  const hasWorkspaces = workspaces.length > 0;

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Requiety
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {/* Toggle Sidebar Button */}
          {hasWorkspaces && (
            <button
              onClick={handleToggleSidebar}
              className="px-2 py-1 text-sm rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={sidebarCollapsed ? 'Show Sidebar (Cmd+\\)' : 'Hide Sidebar (Cmd+\\)'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        ) : hasWorkspaces ? (
          <>
            {/* Sidebar */}
            {!sidebarCollapsed && (
              <Sidebar
                onCreateWorkspace={() => setShowCreateDialog(true)}
                onImportCurl={() => setShowImportCurlDialog(true)}
                searchInputRef={searchInputRef}
              />
            )}

            {/* Main Panel */}
            <main className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
              {selectedRequest ? (
                <RequestPanel
                  request={selectedRequest}
                  onRequestUpdate={(updated) => updateRequest(updated._id, updated)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      Select a request
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Choose a request from the sidebar or create a new one
                    </p>
                    <div className="mt-6 text-sm text-gray-500 dark:text-gray-500">
                      <p className="font-medium mb-2">Keyboard Shortcuts:</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 max-w-md mx-auto text-left">
                        <span className="text-right">Cmd+N</span><span>New Request</span>
                        <span className="text-right">Cmd+Shift+N</span><span>New Folder</span>
                        <span className="text-right">Cmd+Enter</span><span>Send Request</span>
                        <span className="text-right">Cmd+D</span><span>Duplicate Request</span>
                        <span className="text-right">Cmd+F</span><span>Search</span>
                        <span className="text-right">Cmd+\</span><span>Toggle Sidebar</span>
                        <span className="text-right">Cmd+,</span><span>Settings</span>
                        <span className="text-right">Delete</span><span>Delete Request</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
        ) : (
          <EmptyState onCreateWorkspace={() => setShowCreateDialog(true)} />
        )}
      </div>

      {/* Status Bar */}
      <footer className="h-6 bg-primary-600 dark:bg-primary-700 flex items-center px-4 text-xs text-white">
        <span>
          {activeWorkspace ? `Workspace: ${activeWorkspace.name}` : 'Ready'}
        </span>
        {sidebarCollapsed && (
          <span className="ml-auto opacity-75">
            Sidebar hidden (Cmd+\ to show)
          </span>
        )}
      </footer>

      {/* Dialogs */}
      <CreateWorkspaceDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
      <ImportCurlDialog
        isOpen={showImportCurlDialog}
        onClose={() => setShowImportCurlDialog(false)}
        onImport={handleImportCurl}
      />

      {/* Settings Modal (Controlled by Context) */}
      <SettingsModal />
    </div>
  );
}

function App() {
  return (
    <WorkspaceProvider>
      <AppWithWorkspace />
    </WorkspaceProvider>
  );
}

function AppWithWorkspace() {
  const { activeWorkspace } = useWorkspaces();

  return (
    <DataProvider workspaceId={activeWorkspace?._id || null}>
      <AppContent />
    </DataProvider>
  );
}

export default App;
