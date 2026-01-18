import { useEffect } from 'react';
import { useData } from './useData';
import { useSettings } from '../contexts/SettingsContext';
import { useWorkspaces } from './useWorkspaces';

interface KeyboardShortcutsOptions {
  onToggleSidebar?: () => void;
  onFocusSearch?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { activeWorkspace } = useWorkspaces();
  const {
    createRequest,
    createFolder,
    selectedRequest,
    sendRequest,
    duplicateRequest,
    deleteRequest,
  } = useData();
  const { openSettings } = useSettings();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Check if we're in an input/textarea (don't intercept normal typing)
      const isTyping =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      // Delete key - delete selected request (only when not typing)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isTyping && selectedRequest && !e.shiftKey && !isCmdOrCtrl) {
          e.preventDefault();
          if (confirm(`Delete "${selectedRequest.name}"?`)) {
            deleteRequest(selectedRequest._id);
          }
        }
        return;
      }

      if (!isCmdOrCtrl) return;

      switch (e.key.toLowerCase()) {
        case 'enter':
          // Cmd+Enter: Send Request
          if (selectedRequest) {
            e.preventDefault();
            sendRequest(selectedRequest._id);
          }
          break;

        case 'n':
          if (e.shiftKey) {
            // Cmd+Shift+N: New Folder
            if (activeWorkspace) {
              e.preventDefault();
              createFolder('New Folder', activeWorkspace._id);
            }
          } else {
            // Cmd+N: New Request
            if (activeWorkspace) {
              e.preventDefault();
              createRequest('New Request', activeWorkspace._id);
            }
          }
          break;

        case 'd':
          // Cmd+D: Duplicate Request
          if (selectedRequest && !e.shiftKey) {
            e.preventDefault();
            duplicateRequest(selectedRequest._id);
          }
          break;

        case ',':
          // Cmd+,: Settings
          e.preventDefault();
          openSettings();
          break;

        case '\\':
          // Cmd+\: Toggle Sidebar
          if (options.onToggleSidebar) {
            e.preventDefault();
            options.onToggleSidebar();
          }
          break;

        case 'f':
          // Cmd+F: Focus Search
          if (options.onFocusSearch && !e.shiftKey) {
            e.preventDefault();
            options.onFocusSearch();
          }
          break;

        case 'b':
          // Cmd+B: Toggle Sidebar (alternative)
          if (options.onToggleSidebar) {
            e.preventDefault();
            options.onToggleSidebar();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    activeWorkspace,
    selectedRequest,
    createRequest,
    createFolder,
    sendRequest,
    duplicateRequest,
    deleteRequest,
    openSettings,
    options,
  ]);
}
