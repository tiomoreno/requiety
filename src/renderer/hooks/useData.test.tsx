// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useData } from './useData';
import { DataContext } from '../contexts/DataContext';
import React from 'react';

describe('useData', () => {
  it('should throw if used outside provider', () => {
    // Suppress console.error for the expected error
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useData())).toThrow('useData must be used within DataProvider');

    spy.mockRestore();
  });

  it('should return context value if used within provider', () => {
    const mockContext: any = { value: 'test' };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataContext.Provider value={mockContext}>{children}</DataContext.Provider>
    );

    const { result } = renderHook(() => useData(), { wrapper });
    expect(result.current).toEqual(mockContext);
  });
});
