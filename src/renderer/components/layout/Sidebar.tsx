import { useState } from 'react';
import { WorkspaceSelector } from './WorkspaceSelector';
import { TreeView } from './TreeView';
import { Button } from '../common/Button';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { useData } from '../../hooks/useData';

import { EnvironmentSelector } from '../environments/EnvironmentSelector';

interface SidebarProps {
  onCreateWorkspace: () => void;
}

export const Sidebar = ({ onCreateWorkspace }: SidebarProps) => {
  const { activeWorkspace } = useWorkspaces();
  const { createFolder, createRequest } = useData();
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);

  const handleCreateFolder = async () => {
    if (!activeWorkspace) return;

    try {
      setCreatingFolder(true);
      await createFolder('New Folder', activeWorkspace._id);
    } catch (error) {
      console.error('Failed to create folder:', error);
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
      console.error('Failed to create request:', error);
    } finally {
      setCreatingRequest(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="p-4 space-y-4">
        {/* Workspace Selector */}
        <WorkspaceSelector onCreateWorkspace={onCreateWorkspace} />
        
        {/* Environment Selector */}
        {activeWorkspace && (
          <EnvironmentSelector workspaceId={activeWorkspace._id} />
        )}

        {/* Action Buttons */}
        {activeWorkspace && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCreateFolder}
              loading={creatingFolder}
              className="flex-1 text-xs"
            >
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Request
            </Button>
          </div>
        )}
      </div>

      {/* Tree View */}
      {activeWorkspace && (
        <div className="flex-1 overflow-y-auto">
          <TreeView />
        </div>
      )}
    </aside>
  );
};
