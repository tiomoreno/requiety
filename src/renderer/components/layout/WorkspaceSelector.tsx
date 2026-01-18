import { useState } from 'react';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { dataTransferService } from '../../services/data-transfer.service';
import type { Workspace } from '../../../shared/types';

interface WorkspaceSelectorProps {
  onCreateWorkspace: () => void;
}

export const WorkspaceSelector = ({ onCreateWorkspace }: WorkspaceSelectorProps) => {
  const { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces, deleteWorkspace } = useWorkspaces();
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

            <div className="border-t border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateWorkspace();
                }}
                className="w-full px-3 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 rounded-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Import Workspace
              </button>

              <button
                onClick={async () => {
                   setIsOpen(false);
                   const success = await dataTransferService.importPostman();
                   if (success) {
                     refreshWorkspaces();
                   }
                }}
                className="w-full px-3 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-2 rounded-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.527.099C6.955-.744.942 3.9.099 10.473c-.843 6.572 3.8 12.584 10.373 13.428 6.573.843 12.587-3.801 13.428-10.374C24.744 6.955 20.101.943 13.527.099zm2.471 7.485a.855.855 0 0 0-.593.25l-4.453 4.453-.307-.307-.643-.643c4.389-4.376 5.18-4.418 5.996-3.753zm-4.863 4.861l4.44-4.44a.62.62 0 1 1 .847.903l-4.699 4.125-.588-.588zm.33.694l-1.1.238a.06.06 0 0 1-.067-.032.06.06 0 0 1 .01-.073l.645-.645.512.512zm-2.803-.459l1.172-1.172.879.878-1.979.426a.074.074 0 0 1-.085-.039.072.072 0 0 1 .013-.093zm-3.646 6.058a.076.076 0 0 1-.107 0l-.292-.293a.076.076 0 0 1 0-.107l1.602-1.601a.076.076 0 0 1 .107 0l.293.292a.075.075 0 0 1 0 .107l-1.603 1.602zm1.262-1.262a.07.07 0 0 1-.099 0l-.265-.265a.07.07 0 0 1 0-.099l1.595-1.596a.07.07 0 0 1 .1 0l.264.265a.07.07 0 0 1 0 .099l-1.595 1.596z"/>
                </svg>
                Import from Postman
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Export Workspace
                </button>
              )}

              {activeWorkspace && (
                <button
                  onClick={async () => {
                    setIsOpen(false);
                    if (confirm(`Are you sure you want to delete workspace "${activeWorkspace.name}"? This action cannot be undone.`)) {
                      await deleteWorkspace(activeWorkspace._id);
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 rounded-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
