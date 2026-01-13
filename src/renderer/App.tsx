import { useState, useEffect } from 'react';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { DataProvider } from './contexts/DataContext';
import { useWorkspaces } from './hooks/useWorkspaces';
import { useData } from './hooks/useData';
import { Sidebar } from './components/layout/Sidebar';
import { CreateWorkspaceDialog } from './components/workspace/CreateWorkspaceDialog';
import { EmptyState } from './components/workspace/EmptyState';
import { RequestPanel } from './components/request/RequestPanel';

import { SettingsModal } from './components/settings/SettingsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppContent() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { workspaces, activeWorkspace, loading: workspacesLoading } = useWorkspaces();
  const { selectedRequest, updateRequest, loading: dataLoading } = useData();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const loading = workspacesLoading || (dataLoading && !workspaces.length);

  useEffect(() => {
    // Detect system theme preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');

    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const hasWorkspaces = workspaces.length > 0;

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Requiety
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'light' ? '🌙' : '☀️'}
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
            <Sidebar onCreateWorkspace={() => setShowCreateDialog(true)} />

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
      </footer>

      {/* Dialogs */}
      <CreateWorkspaceDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
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

