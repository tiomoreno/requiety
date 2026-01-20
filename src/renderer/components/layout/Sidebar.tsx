import { useState, useMemo, RefObject } from 'react';
import { filterTree } from '@renderer/utils/tree-filter';
import { WorkspaceSelector } from './WorkspaceSelector';
import { TreeView } from './TreeView';
import { Button } from '@renderer/components/common/Button';
import { useWorkspaces } from '@renderer/hooks/useWorkspaces';
import { useData } from '@renderer/hooks/useData';
import { useSettings } from '@renderer/contexts/SettingsContext';
import { EnvironmentSelector } from '@renderer/components/environments/EnvironmentSelector';
import { RunnerModal } from '@renderer/components/runner/RunnerModal';
import { logger } from '@renderer/utils/logger';

type View = 'requests' | 'mock';

interface SidebarProps {
  onCreateWorkspace: () => void;
  onImportCurl: () => void;
  searchInputRef?: RefObject<HTMLInputElement>;
  currentView: View;
  onNavigate: (view: View) => void;
}

export const Sidebar = ({
  onCreateWorkspace,
  onImportCurl,
  searchInputRef,
  currentView,
  onNavigate,
}: SidebarProps) => {
  const { activeWorkspace } = useWorkspaces();
  const { createFolder, createRequest, updateFolder, updateRequest, tree } = useData();
  const { openSettings } = useSettings();
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [runnerState, setRunnerState] = useState<{
    isOpen: boolean;
    targetId: string;
    targetName: string;
    type: 'folder' | 'workspace';
  }>({
    isOpen: false,
    targetId: '',
    targetName: '',
    type: 'folder',
  });

  const filteredTree = useMemo(() => filterTree(tree, searchQuery), [tree, searchQuery]);

  const handleRename = async (item: any, newName: string) => {
    try {
      if (item.type === 'folder') {
        await updateFolder(item.id, { name: newName });
      } else {
        await updateRequest(item.id, { name: newName });
      }
    } catch (error) {
      logger.error('Failed to rename item:', error);
    }
  };

  const handleMove = async (draggedId: string, targetId: string) => {
    try {
      await updateRequest(draggedId, { parentId: targetId });
    } catch (error: any) {
      logger.error('Failed to move item (request attempt):', error);
      try {
        await updateFolder(draggedId, { parentId: targetId });
      } catch (innerError) {
        logger.error('Failed to move folder:', innerError);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!activeWorkspace) return;

    try {
      setCreatingFolder(true);
      await createFolder('New Folder', activeWorkspace._id);
    } catch (error) {
      logger.error('Failed to create folder:', error);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!activeWorkspace) return;

    try {
      setCreatingRequest(true);
      await createRequest('New Request', activeWorkspace._id);
    } catch (error) {
      logger.error('Failed to create request:', error);
    } finally {
      setCreatingRequest(false);
    }
  };

  const handleRun = (targetId: string, targetName: string, type: 'folder' | 'workspace') => {
    setRunnerState({
      isOpen: true,
      targetId,
      targetName,
      type,
    });
  };

  return (
    <aside className="sidebar flex flex-col h-full bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-80">
      <div className="p-4 space-y-4">
        <WorkspaceSelector onCreateWorkspace={onCreateWorkspace} />
        {activeWorkspace && <EnvironmentSelector workspaceId={activeWorkspace._id} />}
      </div>

      {/* View Navigator */}
      <div className="px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex rounded-md bg-gray-200 dark:bg-gray-900 p-1">
          <button
            onClick={() => onNavigate('requests')}
            className={`w-1/2 px-2 py-1 text-sm font-semibold rounded ${currentView === 'requests' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
          >
            API
          </button>
          <button
            onClick={() => onNavigate('mock')}
            className={`w-1/2 px-2 py-1 text-sm font-semibold rounded ${currentView === 'mock' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Mock
          </button>
        </div>
      </div>

      {/* Requests View Content */}
      {currentView === 'requests' && activeWorkspace && (
        <>
          <div className="p-4 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search requests... (Cmd+F)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCreateFolder}
                loading={creatingFolder}
                className="flex-1 text-xs"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                Folder
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCreateRequest}
                loading={creatingRequest}
                className="flex-1 text-xs"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Request
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onImportCurl}
                className="flex-1 text-xs"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Import
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <TreeView
              items={filteredTree}
              forceExpand={!!searchQuery}
              onRename={handleRename}
              onMove={handleMove}
              onRun={handleRun}
            />
          </div>
        </>
      )}

      {currentView === 'mock' && (
        <div className="p-4 text-sm text-gray-500">
          Mock server configuration is available in the main panel.
        </div>
      )}

      <RunnerModal
        isOpen={runnerState.isOpen}
        onClose={() => setRunnerState({ ...runnerState, isOpen: false })}
        targetId={runnerState.targetId}
        targetName={runnerState.targetName}
        type={runnerState.type}
      />

      <div className="p-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <button
          onClick={openSettings}
          className="w-full flex items-center justify-center py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <span className="mr-2">⚙️</span> Settings
        </button>
      </div>
    </aside>
  );
};
