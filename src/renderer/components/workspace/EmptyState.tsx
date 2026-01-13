import { Button } from '../common/Button';

interface EmptyStateProps {
  onCreateWorkspace: () => void;
}

export const EmptyState = ({ onCreateWorkspace }: EmptyStateProps) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center max-w-md px-4">
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Welcome to Requiety
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          A modern, open-source API client for testing REST APIs.
          Get started by creating your first workspace.
        </p>

        <Button onClick={onCreateWorkspace} size="lg">
          Create Your First Workspace
        </Button>

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-500">
          <p>Tip: Use workspaces to organize your API requests by project</p>
        </div>
      </div>
    </div>
  );
};
