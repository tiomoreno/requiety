import { TreeItem } from './TreeItem';
import { useData } from '../../hooks/useData';
import type { WorkspaceTreeItem } from '../../../shared/types';

interface TreeViewProps {
  items?: WorkspaceTreeItem[];
  forceExpand?: boolean;
  onRename?: (item: WorkspaceTreeItem, newName: string) => void;
  onMove?: (draggedId: string, targetId: string) => void;
  onRun?: (targetId: string, targetName: string, type: 'folder' | 'workspace') => void;
}

export const TreeView = ({ items, forceExpand, onRename, onMove, onRun }: TreeViewProps) => {
  const { tree, selectedRequest, setSelectedRequest } = useData();

  const displayItems = items || tree;

  const handleSelect = (item: WorkspaceTreeItem) => {
    if (item.type === 'request' && item.data && 'method' in item.data) {
      setSelectedRequest(item.data);
    }
  };

  if (displayItems.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No folders or requests yet
      </div>
    );
  }

  return (
    <div className="px-2 py-2 space-y-1">
      {displayItems.map((item) => (
        <TreeItem
          key={item.id}
          item={item}
          onSelect={handleSelect}
          onRename={onRename}
          onMove={onMove}
          onRun={onRun}
          selectedId={selectedRequest?._id}
          forceExpand={forceExpand}
        />
      ))}
    </div>
  );
};

