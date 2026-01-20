import { useContext } from 'react';
import { WorkspaceContext } from '../contexts/WorkspaceContext';

/**
 * Hook to access workspace context
 */
export const useWorkspaces = () => {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspaces must be used within WorkspaceProvider');
  }

  return context;
};
