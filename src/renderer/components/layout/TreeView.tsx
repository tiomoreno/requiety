import { TreeItem } from './TreeItem';
import { useData } from '../../hooks/useData';
import type { WorkspaceTreeItem } from '../../../shared/types';

export const TreeView = () => {
  const { tree, selectedRequest, setSelectedRequest } = useData();

  const handleSelect = (item: WorkspaceTreeItem) => {
    if (item.type === 'request' && item.data && 'method' in item.data) {
      setSelectedRequest(item.data);
    }
  };

  if (tree.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No folders or requests yet
      </div>
    );
  }

  return (
    <div className="px-2 py-2 space-y-1">
      {tree.map((item) => (
        <TreeItem
          key={item.id}
          item={item}
          onSelect={handleSelect}
          selectedId={selectedRequest?._id}
        />
      ))}
    </div>
  );
};
