import { createContext, useState, useEffect, ReactNode } from 'react';
import type { Workspace } from '@shared/types';
import { workspaceService } from '../services/workspace.service';
import { logger } from '../utils/logger';

const ACTIVE_WORKSPACE_ID_KEY = 'requiety.activeWorkspaceId';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (
    id: string,
    data: Partial<Omit<Workspace, '_id' | 'type' | 'created' | 'modified'>>
  ) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider = ({ children }: WorkspaceProviderProps) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, _setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom setter for active workspace to persist the ID
  const setActiveWorkspace = (workspace: Workspace | null) => {
    _setActiveWorkspace(workspace);
    if (workspace) {
      localStorage.setItem(ACTIVE_WORKSPACE_ID_KEY, workspace._id);
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_ID_KEY);
    }
  };

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workspaceService.getAll();
      setWorkspaces(data);

      const savedId = localStorage.getItem(ACTIVE_WORKSPACE_ID_KEY);
      const workspaceToSelect =
        data.find((w) => w._id === savedId) || // Find previously active
        data[0] || // Or fallback to the first
        null; // Or null if no workspaces exist

      _setActiveWorkspace(workspaceToSelect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      logger.error('Error loading workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    try {
      setError(null);
      const workspace = await workspaceService.create({ name });
      setWorkspaces((prev) => [...prev, workspace]);
      setActiveWorkspace(workspace);
      return workspace;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(message);
      throw new Error(message);
    }
  };

  const updateWorkspace = async (
    id: string,
    data: Partial<Omit<Workspace, '_id' | 'type' | 'created' | 'modified'>>
  ): Promise<void> => {
    try {
      setError(null);
      const updated = await workspaceService.update(id, data);
      setWorkspaces((prev) => prev.map((w) => (w._id === id ? updated : w)));
      if (activeWorkspace?._id === id) {
        setActiveWorkspace(updated);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update workspace';
      setError(message);
      throw new Error(message);
    }
  };

  const deleteWorkspace = async (id: string): Promise<void> => {
    try {
      setError(null);
      await workspaceService.delete(id);
      const remaining = workspaces.filter((w) => w._id !== id);
      setWorkspaces(remaining);

      // If deleted workspace was active, select another one
      if (activeWorkspace?._id === id) {
        setActiveWorkspace(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete workspace';
      setError(message);
      throw new Error(message);
    }
  };

  const refreshWorkspaces = async (): Promise<void> => {
    await loadWorkspaces();
  };

  const value: WorkspaceContextType = {
    workspaces,
    activeWorkspace,
    loading,
    error,
    setActiveWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refreshWorkspaces,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
