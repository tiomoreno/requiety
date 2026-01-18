import React, { useContext, useState, useEffect } from 'react';
import { WorkspaceContext } from '../../contexts/WorkspaceContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export const SyncSettings = () => {
  const { currentWorkspace } = useContext(WorkspaceContext);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState('');
  const [directory, setDirectory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      setRepoUrl(currentWorkspace.syncRepositoryUrl || '');
      setBranch(currentWorkspace.syncBranch || 'main');
      setToken(currentWorkspace.syncToken || '');
      setDirectory(currentWorkspace.syncDirectory || '');
    }
  }, [currentWorkspace]);

  const handleSelectDirectory = async () => {
    const result = await window.api.sync.setDirectory();
    if (result.success && result.data) {
      setDirectory(result.data);
    }
  };

  const handleSetupSync = async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!directory || !repoUrl || !branch || !token) {
        throw new Error('All fields are required.');
      }
      
      const result = await window.api.sync.setup({
        workspaceId: currentWorkspace._id,
        url: repoUrl,
        branch,
        token,
        directory,
      });

      if (result.success) {
        setSuccess('Git Sync setup successful! Your workspace has been updated.');
        // Optionally, you might want to refresh the workspace context here
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentWorkspace) {
    return <p>Please select a workspace first.</p>;
  }

  const isSetup = !!currentWorkspace.syncRepositoryUrl;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Git Sync Configuration</h2>
      
      {isSetup && (
        <div className="p-3 bg-green-100 text-green-800 rounded-md">
          <p>This workspace is configured to sync with:</p>
          <p className="font-mono text-sm break-all">{currentWorkspace.syncRepositoryUrl}</p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="directory" className="block text-sm font-medium">Local Directory</label>
        <div className="flex items-center space-x-2">
          <Input
            id="directory"
            type="text"
            value={directory}
            readOnly
            placeholder="Select a local directory for the repository"
            className="flex-grow"
          />
          <Button onClick={handleSelectDirectory} disabled={isLoading}>
            Select...
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="repoUrl" className="block text-sm font-medium">Repository URL</label>
        <Input
          id="repoUrl"
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/user/repo.git"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="branch" className="block text-sm font-medium">Branch</label>
        <Input
          id="branch"
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="main"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="token" className="block text-sm font-medium">Personal Access Token (PAT)</label>
        <Input
          id="token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_..."
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500">
          The token is used for authentication. It will be stored locally.
        </p>
      </div>

      <div className="flex items-center justify-end space-x-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <Button onClick={handleSetupSync} disabled={isLoading}>
          {isLoading ? 'Saving...' : (isSetup ? 'Update Configuration' : 'Save and Setup')}
        </Button>
      </div>
    </div>
  );
};
