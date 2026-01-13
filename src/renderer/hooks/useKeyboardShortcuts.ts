import { useEffect } from 'react';
import { useData } from './useData';
import { useSettings } from '../contexts/SettingsContext';
import { useWorkspaces } from './useWorkspaces';

export function useKeyboardShortcuts() {
  const { activeWorkspace } = useWorkspaces();
  const { createRequest, selectedRequest, sendRequest } = useData();
  const { openSettings } = useSettings();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (!isCmdOrCtrl) return;

      switch (e.key.toLowerCase()) {
        case 'enter':
           // Send Request
           if (selectedRequest) {
             e.preventDefault();
             sendRequest(selectedRequest._id);
           }
           break;
        case 'n':
           // New Request
           if (activeWorkspace && !e.shiftKey) { // Cmd+Shift+N is usually New Window or Folder
             e.preventDefault();
             createRequest('New Request', activeWorkspace._id);
           }
           break;
        case ',':
           // Settings
           e.preventDefault();
           openSettings();
           break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeWorkspace, selectedRequest, createRequest, sendRequest, openSettings]);
}
