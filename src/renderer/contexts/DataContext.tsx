import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Folder, Request, WorkspaceTreeItem } from '@shared/types';
import { folderService } from '../services/folder.service';
import { requestService } from '../services/request.service';
import { buildTree } from '../utils/tree-builder';
import { logger } from '../utils/logger';

interface DataContextType {
  folders: Folder[];
  requests: Request[];
  tree: WorkspaceTreeItem[];
  selectedRequest: Request | null;
  loading: boolean;
  error: string | null;
  setSelectedRequest: (request: Request | null) => void;
  createFolder: (name: string, parentId: string) => Promise<Folder>;
  updateFolder: (id: string, data: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  createRequest: (name: string, parentId: string) => Promise<Request>;
  updateRequest: (id: string, data: Partial<Request>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  duplicateRequest: (id: string) => Promise<Request>;
  sendRequest: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const DataContext = createContext<DataContextType | null>(null);

interface DataProviderProps {
  children: ReactNode;
  workspaceId: string | null;
}

export const DataProvider = ({ children, workspaceId }: DataProviderProps) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [tree, setTree] = useState<WorkspaceTreeItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data when workspace changes
  useEffect(() => {
    if (workspaceId) {
      loadData();
    } else {
      // Clear data when no workspace
      setFolders([]);
      setRequests([]);
      setTree([]);
      setSelectedRequest(null);
    }
  }, [workspaceId]);

  // Rebuild tree when folders or requests change
  useEffect(() => {
    if (workspaceId) {
      const newTree = buildTree(folders, requests, workspaceId);
      setTree(newTree);
    }
  }, [folders, requests, workspaceId]);

  const loadData = async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);

      const [foldersData, requestsData] = await Promise.all([
        folderService.getByWorkspace(workspaceId),
        requestService.getByWorkspace(workspaceId),
      ]);

      setFolders(foldersData);
      setRequests(requestsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      logger.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (name: string, parentId: string): Promise<Folder> => {
    try {
      setError(null);
      const sortOrder = folders.filter((f) => f.parentId === parentId).length;
      const folder = await folderService.create({ name, parentId, sortOrder });
      setFolders((prev) => [...prev, folder]);
      return folder;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create folder';
      setError(message);
      throw new Error(message);
    }
  };

  const updateFolder = async (id: string, data: Partial<Folder>): Promise<void> => {
    try {
      setError(null);

      // Handle move if parentId is provided
      if (data.parentId !== undefined) {
        const moved = await folderService.move(id, data.parentId);
        setFolders((prev) => prev.map((f) => (f._id === id ? moved : f)));
      }

      // Handle scalar updates
      const updateData: { name?: string; sortOrder?: number } = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

      if (Object.keys(updateData).length > 0) {
        const updated = await folderService.update(id, updateData);
        setFolders((prev) => prev.map((f) => (f._id === id ? updated : f)));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update folder';
      setError(message);
      throw new Error(message);
    }
  };

  const deleteFolder = async (id: string): Promise<void> => {
    try {
      setError(null);
      await folderService.delete(id);
      // Refresh to get updated data (cascading deletes)
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete folder';
      setError(message);
      throw new Error(message);
    }
  };

  const createRequest = async (name: string, parentId: string): Promise<Request> => {
    try {
      setError(null);
      const sortOrder = requests.filter((r) => r.parentId === parentId).length;
      const request = await requestService.create({
        name,
        url: '',
        method: 'GET',
        parentId,
        sortOrder,
        headers: [],
        body: { type: 'none' },
        authentication: { type: 'none' },
      });
      setRequests((prev) => [...prev, request]);
      return request;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create request';
      setError(message);
      throw new Error(message);
    }
  };

  const updateRequest = async (id: string, data: Partial<Request>): Promise<void> => {
    try {
      setError(null);
      const updated = await requestService.update(id, data);
      setRequests((prev) => prev.map((r) => (r._id === id ? updated : r)));
      if (selectedRequest?._id === id) {
        setSelectedRequest(updated);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update request';
      setError(message);
      throw new Error(message);
    }
  };

  const deleteRequest = async (id: string): Promise<void> => {
    try {
      setError(null);
      await requestService.delete(id);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      if (selectedRequest?._id === id) {
        setSelectedRequest(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete request';
      setError(message);
      throw new Error(message);
    }
  };

  const duplicateRequest = async (id: string): Promise<Request> => {
    try {
      setError(null);
      const duplicated = await requestService.duplicate(id);
      setRequests((prev) => [...prev, duplicated]);
      setSelectedRequest(duplicated);
      return duplicated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate request';
      setError(message);
      throw new Error(message);
    }
  };

  const sendRequest = async (id: string): Promise<void> => {
    try {
      await requestService.send(id);
    } catch (err) {
      logger.error('Failed to send request:', err);
      setError(err instanceof Error ? err.message : 'Failed to send request');
    }
  };

  const refreshData = useCallback(async (): Promise<void> => {
    await loadData();
  }, [workspaceId]);

  const value: DataContextType = {
    folders,
    requests,
    tree,
    selectedRequest,
    loading,
    error,
    setSelectedRequest,
    createFolder,
    updateFolder,
    deleteFolder,
    createRequest,
    updateRequest,
    deleteRequest,
    duplicateRequest,
    sendRequest,
    refreshData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
