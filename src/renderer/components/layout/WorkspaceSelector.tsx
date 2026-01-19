import { useState } from 'react';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { dataTransferService } from '../../services/data-transfer.service';
import type { Workspace } from '@shared/types';

interface WorkspaceSelectorProps {
  onCreateWorkspace: () => void;
}

export const WorkspaceSelector = ({ onCreateWorkspace }: WorkspaceSelectorProps) => {
  const { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces, deleteWorkspace } =
    useWorkspaces();
  const [isOpen, setIsOpen] = useState(false);
  const [syncState, setSyncState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  const handleSelect = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    setIsOpen(false);
  };

  const handleSync = async (
    syncFn: (workspaceId: string) => Promise<{ success: boolean; error?: string }>
  ) => {
    if (!activeWorkspace) return;
    setSyncState({ loading: true, error: null });
    try {
      const result = await syncFn(activeWorkspace._id);
      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }
      // On successful pull, refresh data. Push does not require immediate refresh.
      if (syncFn === window.api.sync.pull) {
        // This is a simple way to refresh. A more advanced implementation
        // might selectively update the UI without a full refresh.
        window.location.reload();
      }
    } catch (e: any) {
      setSyncState({ loading: false, error: e.message });
    } finally {
      // Keep the dropdown open on error, otherwise close it
      if (!syncState.error) {
        setIsOpen(false);
      }
      setSyncState((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex items-center justify-between"
      >
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {activeWorkspace?.name || 'Select Workspace'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 max-h-96 overflow-y-auto">
            {workspaces.map((workspace) => (
              <button
                key={workspace._id}
                onClick={() => handleSelect(workspace)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  activeWorkspace?._id === workspace._id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {workspace.name}
              </button>
            ))}

            <div className="border-t border-gray-200 dark:border-gray-700 p-1">
              {/* GIT SYNC ACTIONS */}
              {activeWorkspace && activeWorkspace.syncRepositoryUrl && (
                <div className="border-b border-gray-200 dark:border-gray-700 mb-1 pb-1">
                  <button
                    onClick={() => handleSync(window.api.sync.pull)}
                    disabled={syncState.loading}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 rounded-md disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 17l-4 4m0 0l-4-4m4 4V3"
                      ></path>
                    </svg>
                    {syncState.loading ? 'Pulling...' : 'Pull Changes'}
                  </button>
                  <button
                    onClick={() => handleSync(window.api.sync.push)}
                    disabled={syncState.loading}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 rounded-md disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7l4-4m0 0l4 4m-4-4v18"
                      ></path>
                    </svg>
                    {syncState.loading ? 'Pushing...' : 'Push Changes'}
                  </button>
                  {syncState.error && (
                    <p className="text-xs text-red-500 px-3 py-1">{syncState.error}</p>
                  )}
                </div>
              )}

              {/* GENERAL ACTIONS */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateWorkspace();
                }}
                className="w-full px-3 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 rounded-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create New Workspace
              </button>

              <button
                onClick={async () => {
                  setIsOpen(false);
                  const success = await dataTransferService.importWorkspace();
                  if (success) {
                    refreshWorkspaces();
                  }
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 rounded-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Import Workspace
              </button>

              {activeWorkspace && (
                <button
                  onClick={async () => {
                    setIsOpen(false);
                    await dataTransferService.exportWorkspace(activeWorkspace._id);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 rounded-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Export Workspace
                </button>
              )}

              {activeWorkspace && (
                <button
                  onClick={async () => {
                    setIsOpen(false);
                    if (
                      confirm(
                        `Are you sure you want to delete workspace "${activeWorkspace.name}"? This action cannot be undone.`
                      )
                    ) {
                      await deleteWorkspace(activeWorkspace._id);
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 rounded-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete Workspace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
