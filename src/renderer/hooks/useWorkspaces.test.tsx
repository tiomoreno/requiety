// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorkspaces } from './useWorkspaces';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import React from 'react';

describe('useWorkspaces', () => {
  it('should throw if used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => renderHook(() => useWorkspaces())).toThrow('useWorkspaces must be used within WorkspaceProvider');
    
    spy.mockRestore();
  });

  it('should return context value if used within provider', () => {
    const mockContext: any = { activeWorkspace: { _id: 'w1' } };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceContext.Provider value={mockContext}>{children}</WorkspaceContext.Provider>
    );

    const { result } = renderHook(() => useWorkspaces(), { wrapper });
    expect(result.current).toEqual(mockContext);
  });
});
