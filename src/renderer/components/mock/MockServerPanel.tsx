import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { MockRoute, HttpMethod } from '@shared/types';
import { Button } from '../common/Button';
import { CodeEditor } from '../common/CodeEditor';
import { mockService } from '../../services/mock.service';

// A simple modal for editing/creating mock routes
const MockRouteEditor = ({
  route,
  onSave,
  onClose,
  error,
}: {
  route: Partial<MockRoute> | null;
  onSave: (route: Partial<MockRoute>) => Promise<void>;
  onClose: () => void;
  error: string | null;
}) => {
  const [editedRoute, setEditedRoute] = useState<Partial<MockRoute>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const defaults = { statusCode: 200, method: 'GET' as HttpMethod, enabled: true };
    setEditedRoute(route ? { ...defaults, ...route } : defaults);
  }, [route]);

  const handleSave = async () => {
    setIsLoading(true);
    await onSave(editedRoute);
    setIsLoading(false);
  };

  const handleChange = (field: keyof MockRoute, value: any) => {
    setEditedRoute((prev) => ({ ...prev, [field]: value }));
  };

  if (!route) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl space-y-4">
        <h2 className="text-lg font-bold">
          {editedRoute._id ? 'Edit Mock Route' : 'Create Mock Route'}
        </h2>

        <input
          type="text"
          placeholder="Name (e.g., Get Users)"
          value={editedRoute.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          className="w-full p-2 rounded bg-gray-100 dark:bg-gray-900"
        />

        <div className="flex gap-2">
          <select
            value={editedRoute.method || 'GET'}
            onChange={(e) => handleChange('method', e.target.value)}
            className="p-2 rounded bg-gray-100 dark:bg-gray-900"
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
            <option>PATCH</option>
          </select>
          <input
            type="text"
            placeholder="/api/users"
            value={editedRoute.path || ''}
            onChange={(e) => handleChange('path', e.target.value)}
            className="w-full p-2 rounded bg-gray-100 dark:bg-gray-900"
          />
          <input
            type="number"
            placeholder="200"
            value={editedRoute.statusCode || ''}
            onChange={(e) => handleChange('statusCode', parseInt(e.target.value, 10))}
            className="w-24 p-2 rounded bg-gray-100 dark:bg-gray-900"
          />
        </div>

        <div>
          <label className="text-sm">Response Body</label>
          <CodeEditor
            value={editedRoute.body || ''}
            onChange={(val) => handleChange('body', val)}
            language="json"
            height="200px"
          />
        </div>

        <div className="flex justify-end items-center gap-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={onClose} variant="secondary" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const MockServerPanel = () => {
  const { activeWorkspace } = useWorkspaces();
  const [status, setStatus] = useState({ isRunning: false, port: 3030 });
  const [logs, setLogs] = useState<any[]>([]);
  const [routes, setRoutes] = useState<MockRoute[]>([]);
  const [editingRoute, setEditingRoute] = useState<Partial<MockRoute> | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    if (!activeWorkspace) return;
    const [statusRes, routesRes, logsRes] = await Promise.all([
      mockService.getStatus(),
      mockService.getRoutes(activeWorkspace._id),
      mockService.getLogs(),
    ]);
    if (statusRes.success) setStatus(statusRes.data);
    if (routesRes.success) setRoutes(routesRes.data);
    if (logsRes.success) setLogs(logsRes.data);
  }, [activeWorkspace]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 5000); // Poll for status and logs
    return () => clearInterval(interval);
  }, [refreshAll]);

  const handleToggleServer = async () => {
    if (status.isRunning) {
      await mockService.stop();
    } else {
      if (activeWorkspace) {
        await mockService.start(activeWorkspace._id, status.port);
      }
    }
    refreshAll();
  };

  const handleSaveRoute = async (route: Partial<MockRoute>) => {
    if (!activeWorkspace) return;
    setEditorError(null);

    try {
      let result;
      if (route._id) {
        result = await mockService.updateRoute(route._id, route);
      } else {
        result = await mockService.createRoute({
          ...route,
          workspaceId: activeWorkspace._id,
        } as Omit<MockRoute, '_id' | 'type' | 'created' | 'modified'>);
      }

      if (!result.success) {
        throw new Error(result.error || 'An unknown error occurred.');
      }

      setEditingRoute(null);
      refreshAll();
    } catch (e: any) {
      setEditorError(e.message);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (activeWorkspace && window.confirm('Are you sure you want to delete this route?')) {
      await mockService.deleteRoute(id, activeWorkspace._id);
      refreshAll();
    }
  };

  const handleOpenEditor = (route: Partial<MockRoute> | null) => {
    setEditorError(null);
    setEditingRoute(route);
  };

  if (!activeWorkspace) {
    return <div className="p-4">Please select a workspace to manage mock routes.</div>;
  }

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      {editingRoute && (
        <MockRouteEditor
          route={editingRoute}
          onSave={handleSaveRoute}
          onClose={() => setEditingRoute(null)}
          error={editorError}
        />
      )}
      <div className="flex-shrink-0 flex justify-between items-center">
        <h1 className="text-xl font-bold">Mock Server</h1>
        <div className="flex items-center gap-4">
          <span
            className={`text-sm font-semibold ${status.isRunning ? 'text-green-500' : 'text-red-500'}`}
          >
            {status.isRunning ? `RUNNING ON PORT ${status.port}` : 'STOPPED'}
          </span>
          <Button onClick={handleToggleServer}>
            {status.isRunning ? 'Stop Server' : 'Start Server'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-grow min-h-0">
        {/* Routes List */}
        <div className="flex flex-col gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold">Routes</h2>
            <Button onClick={() => handleOpenEditor({})}>+ New Route</Button>
          </div>
          <div className="overflow-y-auto">
            {routes.map((route) => (
              <div key={route._id} className="bg-white dark:bg-gray-900 p-3 rounded shadow-sm mb-2">
                <div className="flex justify-between items-center">
                  <div className="font-mono text-sm">
                    <span className="font-bold mr-2">{route.method}</span>
                    <span>{route.path}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenEditor(route)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteRoute(route._id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-semibold">{route.name}</span> - Returns HTTP{' '}
                  {route.statusCode}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logs */}
        <div className="flex flex-col gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold">Logs</h2>
            <Button
              variant="secondary"
              onClick={async () => {
                await mockService.clearLogs();
                refreshAll();
              }}
            >
              Clear Logs
            </Button>
          </div>
          <div className="overflow-y-auto font-mono text-xs space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-white dark:bg-gray-900 p-2 rounded">
                <span className="text-green-500">{log.method}</span> {log.path}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
