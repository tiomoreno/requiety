// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

// Mocks for hooks used
vi.mock('./useData', () => ({
  useData: vi.fn()
}));
vi.mock('./useWorkspaces', () => ({
  useWorkspaces: vi.fn()
}));
vi.mock('../contexts/SettingsContext', () => ({
  useSettings: vi.fn()
}));

import { useData } from './useData';
import { useWorkspaces } from './useWorkspaces';
import { useSettings } from '../contexts/SettingsContext';

describe('useKeyboardShortcuts', () => {
  let mockData: ReturnType<typeof useData>;
  let mockWorkspaces: ReturnType<typeof useWorkspaces>;
  let mockSettings: ReturnType<typeof useSettings>;

  beforeEach(() => {
    mockData = {
      createRequest: vi.fn(),
      createFolder: vi.fn(),
      sendRequest: vi.fn(),
      duplicateRequest: vi.fn(),
      deleteRequest: vi.fn(),
      selectedRequest: { _id: 'r1', name: 'Test Request' } as any,
      folders: [],
      requests: [],
      tree: [],
      loading: false,
      error: null,
      setSelectedRequest: vi.fn(),
      updateFolder: vi.fn(),
      deleteFolder: vi.fn(),
      updateRequest: vi.fn(),
      refreshData: vi.fn(),
    };
    mockWorkspaces = {
      activeWorkspace: { _id: 'w1', name: 'Test Workspace' } as any,
      workspaces: [],
      loading: false,
      error: null,
      setActiveWorkspace: vi.fn(),
      createWorkspace: vi.fn(),
      updateWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
      refreshWorkspaces: vi.fn(),
    };
    mockSettings = {
      openSettings: vi.fn(),
      settings: null,
      loading: false,
      updateSettings: vi.fn(),
      isSettingsOpen: false,
      closeSettings: vi.fn(),
    };

    vi.mocked(useData).mockReturnValue(mockData);
    vi.mocked(useWorkspaces).mockReturnValue(mockWorkspaces);
    vi.mocked(useSettings).mockReturnValue(mockSettings);
  });

  const fireKey = (key: string, ctrlKey = false, metaKey = false, shiftKey = false) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey,
      metaKey,
      shiftKey,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
    return event;
  };

  describe('send request', () => {
    it('should send request on Cmd+Enter', () => {
      renderHook(() => useKeyboardShortcuts());

      fireKey('Enter', false, true); // Cmd+Enter
      expect(mockData.sendRequest).toHaveBeenCalledWith('r1');
    });

    it('should NOT send request on Enter without Cmd/Ctrl', () => {
      renderHook(() => useKeyboardShortcuts());

      fireKey('Enter', false, false);
      expect(mockData.sendRequest).not.toHaveBeenCalled();
    });

    it('should NOT send request if no selected request', () => {
      mockData.selectedRequest = null;
      renderHook(() => useKeyboardShortcuts());

      fireKey('Enter', false, true);
      expect(mockData.sendRequest).not.toHaveBeenCalled();
    });
  });

  describe('create request', () => {
    it('should create new request on Cmd+N', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = fireKey('n', false, true);
      expect(event.defaultPrevented).toBe(true);
      expect(mockData.createRequest).toHaveBeenCalledWith('New Request', 'w1');
    });

    it('should NOT create request if no active workspace', () => {
      mockWorkspaces.activeWorkspace = null;
      renderHook(() => useKeyboardShortcuts());

      fireKey('n', false, true);
      expect(mockData.createRequest).not.toHaveBeenCalled();
    });
  });

  describe('create folder', () => {
    it('should create new folder on Cmd+Shift+N', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = fireKey('n', false, true, true); // Cmd+Shift+N
      expect(event.defaultPrevented).toBe(true);
      expect(mockData.createFolder).toHaveBeenCalledWith('New Folder', 'w1');
    });

    it('should NOT create folder if no active workspace', () => {
      mockWorkspaces.activeWorkspace = null;
      renderHook(() => useKeyboardShortcuts());

      fireKey('n', false, true, true);
      expect(mockData.createFolder).not.toHaveBeenCalled();
    });
  });

  describe('duplicate request', () => {
    it('should duplicate request on Cmd+D', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = fireKey('d', false, true);
      expect(event.defaultPrevented).toBe(true);
      expect(mockData.duplicateRequest).toHaveBeenCalledWith('r1');
    });

    it('should NOT duplicate if no selected request', () => {
      mockData.selectedRequest = null;
      renderHook(() => useKeyboardShortcuts());

      fireKey('d', false, true);
      expect(mockData.duplicateRequest).not.toHaveBeenCalled();
    });
  });

  describe('settings', () => {
    it('should open settings on Cmd+,', () => {
      renderHook(() => useKeyboardShortcuts());

      fireKey(',', false, true);
      expect(mockSettings.openSettings).toHaveBeenCalled();
    });
  });

  describe('toggle sidebar', () => {
    it('should call onToggleSidebar on Cmd+\\', () => {
      const onToggleSidebar = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onToggleSidebar }));

      fireKey('\\', false, true);
      expect(onToggleSidebar).toHaveBeenCalled();
    });

    it('should call onToggleSidebar on Cmd+B', () => {
      const onToggleSidebar = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onToggleSidebar }));

      fireKey('b', false, true);
      expect(onToggleSidebar).toHaveBeenCalled();
    });
  });

  describe('focus search', () => {
    it('should call onFocusSearch on Cmd+F', () => {
      const onFocusSearch = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onFocusSearch }));

      fireKey('f', false, true);
      expect(onFocusSearch).toHaveBeenCalled();
    });
  });

  describe('other keys', () => {
    it('should ignore unhandled keys', () => {
      renderHook(() => useKeyboardShortcuts());

      fireKey('a', false, true);
      // Just ensure no errors and no random calls
      expect(mockData.createRequest).not.toHaveBeenCalled();
      expect(mockSettings.openSettings).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up listener on unmount', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      unmount();

      // Fire event after unmount
      mockData.sendRequest = vi.fn();
      fireKey('Enter', false, true);
      expect(mockData.sendRequest).not.toHaveBeenCalled();
    });
  });
});
