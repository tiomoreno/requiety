import { useState } from 'react';
import type { WorkspaceTreeItem } from '../../../shared/types';
import type { FlatTreeItem } from '../../utils/tree-builder';
import { ContextMenu } from '../common/ContextMenu';

interface VirtualTreeItemProps {
  flatItem: FlatTreeItem;
  onSelect: (item: WorkspaceTreeItem) => void;
  onRename?: (item: WorkspaceTreeItem, newName: string) => void;
  onMove?: (draggedId: string, targetId: string) => void;
  onRun?: (targetId: string, targetName: string, type: 'folder' | 'workspace') => void;
  onToggleExpand: (id: string) => void;
  selectedId?: string;
}

export const VirtualTreeItem = ({
  flatItem,
  onSelect,
  onRename,
  onMove,
  onRun,
  onToggleExpand,
  selectedId,
}: VirtualTreeItemProps) => {
  const { item, depth, hasChildren, isExpanded } = flatItem;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const isFolder = item.type === 'folder';
  const isSelected = item.id === selectedId;
  const paddingLeft = depth * 16 + 8; // 16px per level + 8px base

  const handleClick = () => {
    if (isFolder) {
      onToggleExpand(item.id);
    } else {
      onSelect(item);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRename && !isEditing) {
      setIsEditing(true);
      setEditName(item.name);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFolder) {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(item.name);
    }
  };

  const handleSubmit = () => {
    if (editName.trim() && editName !== item.name && onRename) {
      onRename(item, editName.trim());
    }
    setIsEditing(false);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, type: item.type }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isFolder && onMove) {
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.id !== item.id) {
          onMove(data.id, item.id);
        }
      } catch (err) {
        console.error('Invalid drag data', err);
      }
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
    <>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ paddingLeft: `${paddingLeft}px` }}
        className={`group flex items-center gap-2 pr-2 py-1.5 rounded cursor-pointer transition-colors border h-8 ${
          isDragOver
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40'
            : 'border-transparent'
        } ${
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
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(item.id);
            }}
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
            className={`text-xs font-semibold flex-shrink-0 w-8 ${getMethodColor(
              item.data && 'method' in item.data ? item.data.method : undefined
            )}`}
          >
            {item.data && 'method' in item.data ? item.data.method : 'REQ'}
          </span>
        )}

        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm px-1 py-0.5 border border-primary-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none min-w-0"
          />
        ) : (
          <span className="text-sm truncate flex-1">{item.name}</span>
        )}

        {isFolder && onRun && (
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-green-600 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onRun(item.id, item.name, 'folder');
            }}
            title="Run Folder"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Run Folder',
              onClick: () => onRun && onRun(item.id, item.name, 'folder'),
              icon: (
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              ),
            },
          ]}
        />
      )}
    </>
  );
};
