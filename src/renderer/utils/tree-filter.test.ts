import { describe, it, expect } from 'vitest';
import { filterTree } from './tree-filter';
import { WorkspaceTreeItem } from '../../shared/types';

describe('tree-filter', () => {
  const tree: WorkspaceTreeItem[] = [
    {
      id: 'folder1',
      type: 'folder',
      name: 'Folder One',
      children: [
        { id: 'req1', type: 'request', name: 'Get Users' },
        { id: 'req2', type: 'request', name: 'Create User' }
      ]
    },
    {
      id: 'folder2',
      type: 'folder',
      name: 'Folder Two',
      children: [
        { id: 'req3', type: 'request', name: 'Delete Item' }
      ]
    },
    {
      id: 'req4',
      type: 'request',
      name: 'Root Request'
    }
  ];

  it('should return all items if query is empty', () => {
    const result = filterTree(tree, '');
    expect(result.length).toBe(3);
  });

  it('should filter items by name (case insensitive)', () => {
    const result = filterTree(tree, 'one');
    // Folder One matches
    // Folder Two doesn't match and has no matching children
    // Root Request doesn't match
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Folder One');
  });

  it('should include folder if a child matches', () => {
    const result = filterTree(tree, 'delete');
    // Folder Two matches because 'Delete Item' is inside
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Folder Two');
    expect(result[0].children).toBeDefined();
    expect(result[0].children?.length).toBe(1);
    expect(result[0].children?.[0].name).toBe('Delete Item');
  });

  it('should filter out non-matching siblings when a child matches', () => {
    const result = filterTree(tree, 'create');
    // Folder One has 'Create User' -> Keep folder and only that child
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Folder One');
    expect(result[0].children?.length).toBe(1);
    expect(result[0].children?.[0].name).toBe('Create User');
  });

  it('should include all children if parent matches', () => {
    const result = filterTree(tree, 'folder two');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Folder Two');
    // Logic says: if parent matches, return it.
    // The implementation: if matches, return item. Does it filter children?
    // Implementation:
    // 1. Recursive filter children
    // 2. If filteredChildren > 0, return parent (with filtered children)
    // 3. Else if parent matches, return item.
    // Wait, the implementation calculates filtered children FIRST.
    // Then checks if filteredChildren > 0.
    // But if parent matches, it returns 'item'. 
    // BUT 'item' in map(filterItem) is the ORIGINAL item.
    // So if parent returns early due to match, it returns the original item with original children. 
    // Checking lines 36-49 of tree-filter.ts:
    // if (matches) { return item; }
    // This happens AFTER checking filtered children (lines 16-31).
    // NO, lines 16-31 check children. If any match, it returns new object with filtered children.
    // If NO children match (or execution passes through), it checks if ITSELF matches.
    // If ITSELF matches, it returns 'item'.
    // Important: 'item' here is the argument to filterItem.
    // If 'item.children' was modified in lines 17-25... wait.
    // lines 17-25 create NEW filteredChildren array.
    // It returns NEW object: { ...item, children: filteredChildren }.
    // It does NOT modify 'item'.
    // So if children match, we get partial folder.
    // If NO children match, but folder name matches:
    // We fall through to line 36.
    // if (matches) return item.
    // 'item' still has ORIGINAL children.
    // So yes, if folder matches, we get all children.
    
    expect(result[0].children?.length).toBe(1); 
    expect(result[0].children?.[0].name).toBe('Delete Item');
  });
});
