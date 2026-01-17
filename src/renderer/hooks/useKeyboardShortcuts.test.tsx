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
  let mockData: any;
  let mockWorkspaces: any;
  let mockSettings: any;

  beforeEach(() => {
    mockData = {
      createRequest: vi.fn(),
      sendRequest: vi.fn(),
      selectedRequest: { _id: 'r1' }
    };
    mockWorkspaces = {
      activeWorkspace: { _id: 'w1' }
    };
    mockSettings = {
      openSettings: vi.fn()
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

  it('should create new request on Cmd+N', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const event = fireKey('n', false, true); 
    expect(event.defaultPrevented).toBe(true);
    expect(mockData.createRequest).toHaveBeenCalledWith('New Request', 'w1');
  });

  it('should NOT create request on Cmd+Shift+N', () => {
    renderHook(() => useKeyboardShortcuts());
    
    fireKey('n', false, true, true);
    expect(mockData.createRequest).not.toHaveBeenCalled();
  });
  
  it('should open settings on Cmd+,', () => {
    renderHook(() => useKeyboardShortcuts());
    
    fireKey(',', false, true);
    expect(mockSettings.openSettings).toHaveBeenCalled();
  });

  it('should ignore other keys', () => {
    renderHook(() => useKeyboardShortcuts());
    
    fireKey('a', false, true);
    // Just ensure no errors and no random calls
    expect(mockData.createRequest).not.toHaveBeenCalled();
    expect(mockSettings.openSettings).not.toHaveBeenCalled();
  });

  it('should clean up listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    unmount();
    // While we can spy on removeEventListener, simpler to ensure events stop triggering
    
    // But testing implementation detail (call) is easier here as we can't easily check "unlisten" effect without firing and asserting nothing happened.
    // Let's fire event again
    mockData.sendRequest.mockClear();
    fireKey('Enter', false, true);
    expect(mockData.sendRequest).not.toHaveBeenCalled();
  });
});
