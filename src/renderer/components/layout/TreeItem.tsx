import { useState } from 'react';
import type { WorkspaceTreeItem } from '../../../shared/types';

interface TreeItemProps {
  item: WorkspaceTreeItem;
  onSelect: (item: WorkspaceTreeItem) => void;
  selectedId?: string;
}

export const TreeItem = ({ item, onSelect, selectedId }: TreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isFolder = item.type === 'folder';
  const hasChildren = isFolder && item.children && item.children.length > 0;
  const isSelected = item.id === selectedId;

  const handleClick = () => {
    if (isFolder) {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(item);
    }
  };

  const getMethodColor = (method?: string) => {
    switch (method) {
      case 'GET':
        return 'text-green-600 dark:text-green-400';
      case 'POST':
        return 'text-blue-600 dark:text-blue-400';
      case 'PUT':
        return 'text-orange-600 dark:text-orange-400';
      case 'DELETE':
        return 'text-red-600 dark:text-red-400';
      case 'PATCH':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
      >
        {isFolder && (
          <svg
            className={`w-4 h-4 flex-shrink-0 transition-transform ${
              isExpanded ? 'transform rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}

        {isFolder ? (
          <svg
            className="w-4 h-4 flex-shrink-0 text-yellow-600 dark:text-yellow-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        ) : (
          <span
            className={`text-xs font-semibold flex-shrink-0 ${getMethodColor(
              item.data && 'method' in item.data ? item.data.method : undefined
            )}`}
          >
            {item.data && 'method' in item.data ? item.data.method : 'REQ'}
          </span>
        )}

        <span className="text-sm truncate flex-1">{item.name}</span>
      </div>

      {isFolder && hasChildren && isExpanded && (
        <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-2 mt-1">
          {item.children!.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
