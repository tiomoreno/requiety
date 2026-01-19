import { describe, it, expect } from 'vitest';
import { buildTree, findItemInTree, getParentIds, flattenTree } from './tree-builder';
import { Folder, Request, WorkspaceTreeItem } from '@shared/types';

describe('tree-builder', () => {
  // Helpers
  const createFolder = (id: string, name: string, parentId: string, sortOrder = 0): Folder => ({
    _id: id,
    type: 'Folder',
    name,
    parentId,
    sortOrder,
    created: 0,
    modified: 0,
  });

  const createRequest = (id: string, name: string, parentId: string, sortOrder = 0): Request => ({
    _id: id,
    type: 'Request',
    name,
    parentId,
    sortOrder,
    url: '',
    method: 'GET',
    headers: [],
    body: { type: 'none' },
    authentication: { type: 'none' },
    created: 0,
    modified: 0,
  });

  describe('buildTree', () => {
    it('should build a flat structure', () => {
      const folders = [createFolder('f1', 'Folder 1', 'ws1')];
      const requests = [createRequest('r1', 'Request 1', 'ws1')];
      const tree = buildTree(folders, requests, 'ws1');

      expect(tree.length).toBe(2);
      const f1 = tree.find((i) => i.id === 'f1');
      const r1 = tree.find((i) => i.id === 'r1');
      expect(f1).toBeDefined();
      expect(r1).toBeDefined();
    });

    it('should build a nested structure', () => {
      const folders = [createFolder('f1', 'Parent', 'ws1'), createFolder('f2', 'Child', 'f1')];
      const requests = [createRequest('r1', 'Child Request', 'f2')];
      const tree = buildTree(folders, requests, 'ws1');

      expect(tree.length).toBe(1); // Only Parent at root
      const parent = tree[0];
      expect(parent.children).toBeDefined();
      expect(parent.children?.length).toBe(1); // Child folder

      const child = parent.children![0];
      expect(child.id).toBe('f2');
      expect(child.children?.length).toBe(1); // Child request
      expect(child.children![0].id).toBe('r1');
    });

    it('should sort items by sortOrder', () => {
      const requests = [
        createRequest('r2', 'Second', 'ws1', 2),
        createRequest('r1', 'First', 'ws1', 1),
      ];
      const tree = buildTree([], requests, 'ws1');

      expect(tree[0].id).toBe('r1');
      expect(tree[1].id).toBe('r2');
    });
  });

  describe('findItemInTree', () => {
    it('should find nested item', () => {
      const tree: WorkspaceTreeItem[] = [
        {
          id: 'root',
          type: 'folder',
          name: 'root',
          children: [
            {
              id: 'child',
              type: 'request',
              name: 'child',
            },
          ],
        },
      ];

      const found = findItemInTree(tree, 'child');
      expect(found).toBeDefined();
      expect(found?.name).toBe('child');
    });

    it('should return null if not found', () => {
      const tree: WorkspaceTreeItem[] = [];
      const found = findItemInTree(tree, 'missing');
      expect(found).toBeNull();
    });
  });

  describe('getParentIds', () => {
    it('should return path of parent IDs', () => {
      // Structure: root -> middle -> target
      const tree: WorkspaceTreeItem[] = [
        {
          id: 'root',
          type: 'folder',
          name: 'root',
          children: [
            {
              id: 'middle',
              type: 'folder',
              name: 'middle',
              children: [
                {
                  id: 'target',
                  type: 'request',
                  name: 'target',
                },
              ],
            },
          ],
        },
      ];

      const parents = getParentIds(tree, 'target');
      // Should be [root, middle]? Or [middle, root]?
      // Implementation check: parents.unshift(item.id) -> so it pushes parents as it unwinds stack.
      // Recursive finding 'target'.
      // 1. root check children.
      // 2. middle check children.
      // 3. target found (returns true).
      // 2. middle unshifts 'middle'. parents=['middle']
      // 1. root unshifts 'root'. parents=['root', 'middle']
      expect(parents).toEqual(['root', 'middle']);
    });

    it('should return empty array if not found', () => {
      const tree: WorkspaceTreeItem[] = [];
      const parents = getParentIds(tree, 'missing');
      expect(parents).toEqual([]);
    });
  });

  describe('flattenTree', () => {
    it('should flatten tree with all folders expanded', () => {
      const tree: WorkspaceTreeItem[] = [
        {
          id: 'root',
          type: 'folder',
          name: 'root',
          children: [
            {
              id: 'child',
              type: 'request',
              name: 'child',
            },
          ],
        },
      ];

      const expandedIds = new Set(['root']);
      const flat = flattenTree(tree, expandedIds);

      expect(flat.length).toBe(2);
      expect(flat[0].item.id).toBe('root');
      expect(flat[0].depth).toBe(0);
      expect(flat[0].isExpanded).toBe(true);
      expect(flat[1].item.id).toBe('child');
      expect(flat[1].depth).toBe(1);
    });

    it('should not include children of collapsed folders', () => {
      const tree: WorkspaceTreeItem[] = [
        {
          id: 'root',
          type: 'folder',
          name: 'root',
          children: [
            {
              id: 'child',
              type: 'request',
              name: 'child',
            },
          ],
        },
      ];

      const expandedIds = new Set<string>(); // Nothing expanded
      const flat = flattenTree(tree, expandedIds);

      expect(flat.length).toBe(1);
      expect(flat[0].item.id).toBe('root');
      expect(flat[0].isExpanded).toBe(false);
    });

    it('should handle nested folders', () => {
      const tree: WorkspaceTreeItem[] = [
        {
          id: 'f1',
          type: 'folder',
          name: 'f1',
          children: [
            {
              id: 'f2',
              type: 'folder',
              name: 'f2',
              children: [
                {
                  id: 'r1',
                  type: 'request',
                  name: 'r1',
                },
              ],
            },
          ],
        },
      ];

      const expandedIds = new Set(['f1', 'f2']);
      const flat = flattenTree(tree, expandedIds);

      expect(flat.length).toBe(3);
      expect(flat[0].depth).toBe(0);
      expect(flat[1].depth).toBe(1);
      expect(flat[2].depth).toBe(2);
    });
  });
});
