import { useState } from 'react';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import type { Workspace } from '../../../shared/types';

interface WorkspaceSelectorProps {
  onCreateWorkspace: () => void;
}

export const WorkspaceSelector = ({ onCreateWorkspace }: WorkspaceSelectorProps) => {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspaces();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    setIsOpen(false);
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
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

            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateWorkspace();
                }}
                className="w-full px-3 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
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
                Create New Workspace
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
