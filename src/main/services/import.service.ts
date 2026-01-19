import {
  createWorkspace,
  createEnvironment,
  createVariable,
  createFolder,
  createRequest,
  updateFolder,
  moveFolder,
} from '../database/models';
import { Workspace, Environment, Request, Folder, Variable } from '@shared/types';

interface ExportData {
  version: string;
  source: string;
  data: {
    workspace: Workspace;
    environments: (Environment & { variables: Variable[] })[];
    folders: Folder[];
    requests: Request[];
  };
}

export const importService = {
  async importWorkspace(jsonData: ExportData): Promise<Workspace> {
    const { data } = jsonData;
    const idMap = new Map<string, string>(); // Old ID -> New ID

    // 1. Create New Workspace
    const newWorkspace = await createWorkspace({
      name: `${data.workspace.name} (Imported)`,
    });
    idMap.set(data.workspace._id, newWorkspace._id);

    // 2. Import Environments & Variables
    for (const env of data.environments) {
      const newEnv = await createEnvironment({
        name: env.name,
        workspaceId: newWorkspace._id,
      });

      // Variables
      for (const variable of env.variables) {
        await createVariable({
          environmentId: newEnv._id,
          key: variable.key,
          value: variable.value,
          isSecret: variable.isSecret || false,
        });
      }
    }

    // 3. Import Folders
    // Pass 1: Create all folders with TEMPORARY parentIds (mapped to Workspace if root, or keep ID if folder)
    // Actually, createFolder requires a parentId. If the parent is a folder that hasn't been created yet, we have a problem.
    // However, models.createFolder just inserts. It doesn't validate parentId existence strictly in DB layer (NeDB).
    // So we can insert with old parentId, then update.

    for (const folder of data.folders) {
      // Determine temporary parentId.
      // If it was the old workspace, map to new workspace immediately.
      // If it other folder, keep old ID for now.
      let parentId = folder.parentId;
      if (parentId === data.workspace._id) {
        parentId = newWorkspace._id;
      }

      const newFolder = await createFolder({
        name: folder.name,
        parentId: parentId, // may be old ID
        sortOrder: folder.sortOrder,
      });
      idMap.set(folder._id, newFolder._id);
    }

    // Pass 2: Fix Folder Parent IDs which are still old Folder IDs
    // We fetch all folders of the new workspace.
    // models.js helper getFoldersByWorkspace returns folders where parentId == workspaceId.
    // This isn't enough. We need to check ALL folders we just created.
    // But we have the new IDs in idMap.

    // We can iterate over the original data.folders again? No, we need to update the NEW folders in DB.
    // We can iterate the idMap?
    // Let's iterate original folders, look up new ID, look up new Parent ID.
    for (const folder of data.folders) {
      const newId = idMap.get(folder._id);
      if (!newId) continue;

      const parentId = folder.parentId;

      // If parent was another folder
      if (idMap.has(parentId)) {
        const newParentId = idMap.get(parentId)!;
        // Update the folder
        await updateFolder(newId, {}); // models.updateFolder takes partial name/sortOrder. It does NOT allow updating parentId via argument list easily?
        // updateFolder(id, data) -> data is name/sortOrder.
        // We might need a moveFolder or manual update?
        // models.ts has `moveFolder(id, newParentId)`. Usage: moveFolder(id, newParentId).

        const { moveFolder } = await import('../database/models'); // Dynamic import? No, just import it at top.
        await moveFolder(newId, newParentId);
      }
    }

    // 4. Import Requests
    for (const req of data.requests) {
      // Remap parentId
      let newParentId = req.parentId;
      if (idMap.has(req.parentId)) {
        newParentId = idMap.get(req.parentId)!;
      } else if (req.parentId === data.workspace._id) {
        newParentId = newWorkspace._id;
      }

      await createRequest({
        name: req.name,
        url: req.url,
        method: req.method,
        parentId: newParentId,
        sortOrder: req.sortOrder,
        headers: req.headers,
        body: req.body,
        authentication: req.authentication,
      });
    }

    return newWorkspace;
  },
};
