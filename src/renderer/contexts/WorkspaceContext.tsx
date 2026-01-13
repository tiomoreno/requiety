import { createContext, useState, useEffect, ReactNode } from 'react';
import type { Workspace } from '../../shared/types';
import { workspaceService } from '../services/workspace.service';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider = ({ children }: WorkspaceProviderProps) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Auto-select first workspace if none selected
      if (!activeWorkspace && data.length > 0) {
        setActiveWorkspace(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      console.error('Error loading workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    try {
      setError(null);
      const workspace = await workspaceService.create(name);
      setWorkspaces((prev) => [...prev, workspace]);
      setActiveWorkspace(workspace);
      return workspace;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(message);
      throw new Error(message);
    }
  };

  const updateWorkspace = async (id: string, name: string): Promise<void> => {
    try {
      setError(null);
      const updated = await workspaceService.update(id, { name });
      setWorkspaces((prev) =>
        prev.map((w) => (w._id === id ? updated : w))
      );
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
      setWorkspaces((prev) => prev.filter((w) => w._id !== id));

      // If deleted workspace was active, select another one
      if (activeWorkspace?._id === id) {
        const remaining = workspaces.filter((w) => w._id !== id);
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

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
