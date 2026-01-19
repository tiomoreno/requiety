import type { WorkspaceTreeItem } from '@shared/types';

export const filterTree = (items: WorkspaceTreeItem[], query: string): WorkspaceTreeItem[] => {
  if (!query) return items;

  const lowerQuery = query.toLowerCase();

  const filterItem = (item: WorkspaceTreeItem): WorkspaceTreeItem | null => {
    // Check if current item matches
    const matches = item.name.toLowerCase().includes(lowerQuery);

    // If it has children, filter them
    if (item.children) {
      const filteredChildren = item.children
        .map(filterItem)
        .filter((child): child is WorkspaceTreeItem => child !== null);

      // If any children match, keep this folder, attaching filtered children
      if (filteredChildren.length > 0) {
        return {
          ...item,
          children: filteredChildren,
          // We might want to force expand here if we had an 'expanded' property in the item,
          // but expansion is usually handled by UI state (expandedIds).
          // For now, we just return the data structure.
        };
      }
    }

    // If item itself matches, return it (with all children? or just itself?
    // Usually if folder matches, we might want to show all children, or just the folder?
    // Let's matching folder implies showing the folder.
    if (matches) {
      // If the folder matches, we *could* show all children, but strictly, search usually filters.
      // Let's keep it simple: if folder matches, return it. If it has children, they might be filtered out if they don't match?
      // Ideally: "Project A" matches -> show Project A.
      // If "Project A" has "Request B" (not match), should Request B be hidden?
      // Standard behavior:
      // 1. If leaf matches, show leaf and all parents.
      // 2. If folder matches, show folder. Children? Maybe show all if folder matches?
      // Let's stick to strict content match for now: Show node if it OR descendant matches.
      // So if I search "Auth", I see "Auth Folder" (even if empty) AND "GET Auth".
      // If I search "GET", I see "Auth Folder" > "GET Auth", but NOT "Auth Folder" > "POST Login".

      return item;
    }

    return null;
  };

  return items.map(filterItem).filter((item): item is WorkspaceTreeItem => item !== null);
};
