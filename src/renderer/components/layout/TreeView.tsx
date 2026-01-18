import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as ReactWindow from 'react-window';
import { VirtualTreeItem } from './VirtualTreeItem';
import { useData } from '../../hooks/useData';
import { flattenTree, FlatTreeItem } from '../../utils/tree-builder';
import type { WorkspaceTreeItem } from '../../../shared/types';

interface TreeViewProps {
  items?: WorkspaceTreeItem[];
  forceExpand?: boolean;
  onRename?: (item: WorkspaceTreeItem, newName: string) => void;
  onMove?: (draggedId: string, targetId: string) => void;
  onRun?: (targetId: string, targetName: string, type: 'folder' | 'workspace') => void;
}

// Threshold for using virtualization
const VIRTUALIZATION_THRESHOLD = 100;
const ITEM_HEIGHT = 32;

export const TreeView = ({ items, forceExpand, onRename, onMove, onRun }: TreeViewProps) => {
  const { tree, selectedRequest, setSelectedRequest } = useData();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  const displayItems = items || tree;

  // Track expanded folders
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Initially expand all folders
    const ids = new Set<string>();
    const collectFolderIds = (items: WorkspaceTreeItem[]) => {
      items.forEach(item => {
        if (item.type === 'folder') {
          ids.add(item.id);
          if (item.children) {
            collectFolderIds(item.children);
          }
        }
      });
    };
    collectFolderIds(displayItems);
    return ids;
  });

  // Handle forceExpand prop
  useEffect(() => {
    if (forceExpand) {
      const ids = new Set<string>();
      const collectFolderIds = (items: WorkspaceTreeItem[]) => {
        items.forEach(item => {
          if (item.type === 'folder') {
            ids.add(item.id);
            if (item.children) {
              collectFolderIds(item.children);
            }
          }
        });
      };
      collectFolderIds(displayItems);
      setExpandedIds(ids);
    }
  }, [forceExpand, displayItems]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Flatten tree for virtualization
  const flatItems = useMemo(
    () => flattenTree(displayItems, expandedIds),
    [displayItems, expandedIds]
  );

  const handleSelect = useCallback((item: WorkspaceTreeItem) => {
    if (item.type === 'request' && item.data && 'method' in item.data) {
      setSelectedRequest(item.data);
    }
  }, [setSelectedRequest]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  if (displayItems.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No folders or requests yet
      </div>
    );
  }

  // Use virtualization only for large trees
  const useVirtualization = flatItems.length > VIRTUALIZATION_THRESHOLD;

  if (useVirtualization) {
    const Row = ({ index, style }: ReactWindow.ListChildComponentProps) => {
      const flatItem = flatItems[index];
      return (
        <div style={style}>
          <VirtualTreeItem
            flatItem={flatItem}
            onSelect={handleSelect}
            onRename={onRename}
            onMove={onMove}
            onRun={onRun}
            onToggleExpand={toggleExpand}
            selectedId={selectedRequest?._id}
          />
        </div>
      );
    };

    return (
      <div ref={containerRef} className="h-full px-2 py-2">
        <ReactWindow.FixedSizeList
          height={containerHeight - 16}
          itemCount={flatItems.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
        >
          {Row}
        </ReactWindow.FixedSizeList>
      </div>
    );
  }

  // Non-virtualized rendering for small trees (better UX for typical use)
  return (
    <div className="px-2 py-2 space-y-0.5">
      {flatItems.map((flatItem) => (
        <VirtualTreeItem
          key={flatItem.item.id}
          flatItem={flatItem}
          onSelect={handleSelect}
          onRename={onRename}
          onMove={onMove}
          onRun={onRun}
          onToggleExpand={toggleExpand}
          selectedId={selectedRequest?._id}
        />
      ))}
    </div>
  );
};

