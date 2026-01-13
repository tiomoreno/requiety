import type { Folder, Request, WorkspaceTreeItem } from '../../shared/types';

/**
 * Build a hierarchical tree structure from flat arrays of folders and requests
 */
export const buildTree = (
  folders: Folder[],
  requests: Request[],
  workspaceId: string
): WorkspaceTreeItem[] => {
  const tree: WorkspaceTreeItem[] = [];
  const folderMap = new Map<string, WorkspaceTreeItem>();

  // Create folder items
  folders.forEach((folder) => {
    const item: WorkspaceTreeItem = {
      id: folder._id,
      type: 'folder',
      name: folder.name,
      parentId: folder.parentId,
      children: [],
      data: folder,
    };
    folderMap.set(folder._id, item);
  });

  // Create request items
  const requestItems: WorkspaceTreeItem[] = requests.map((request) => ({
    id: request._id,
    type: 'request',
    name: request.name,
    parentId: request.parentId,
    data: request,
  }));

  // Build folder hierarchy
  folders.forEach((folder) => {
    const item = folderMap.get(folder._id);
    if (!item) return;

    if (folder.parentId === workspaceId) {
      // Top-level folder
      tree.push(item);
    } else {
      // Nested folder
      const parent = folderMap.get(folder.parentId);
      if (parent && parent.children) {
        parent.children.push(item);
      }
    }
  });

  // Add requests to their parents
  requestItems.forEach((requestItem) => {
    const parentId = requestItem.parentId;

    if (parentId === workspaceId) {
      // Top-level request
      tree.push(requestItem);
    } else if (parentId) {
      // Request inside folder
      const parent = folderMap.get(parentId);
      if (parent && parent.children) {
        parent.children.push(requestItem);
      }
    }
  });

  // Sort items by sortOrder
  const sortItems = (items: WorkspaceTreeItem[]) => {
    items.sort((a, b) => {
      const aOrder = a.data && 'sortOrder' in a.data ? a.data.sortOrder : 0;
      const bOrder = b.data && 'sortOrder' in b.data ? b.data.sortOrder : 0;
      return aOrder - bOrder;
    });

    // Recursively sort children
    items.forEach((item) => {
      if (item.children) {
        sortItems(item.children);
      }
    });
  };

  sortItems(tree);

  return tree;
};

/**
 * Find an item in the tree by ID
 */
export const findItemInTree = (
  tree: WorkspaceTreeItem[],
  id: string
): WorkspaceTreeItem | null => {
  for (const item of tree) {
    if (item.id === id) {
      return item;
    }

    if (item.children) {
      const found = findItemInTree(item.children, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

/**
 * Get all parent IDs for an item
 */
export const getParentIds = (
  tree: WorkspaceTreeItem[],
  itemId: string
): string[] => {
  const parents: string[] = [];

  const findParents = (items: WorkspaceTreeItem[], targetId: string): boolean => {
    for (const item of items) {
      if (item.id === targetId) {
        return true;
      }

      if (item.children) {
        if (findParents(item.children, targetId)) {
          parents.unshift(item.id);
          return true;
        }
      }
    }

    return false;
  };

  findParents(tree, itemId);
  return parents;
};
