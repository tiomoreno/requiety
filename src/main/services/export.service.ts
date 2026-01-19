import {
  getWorkspaceById,
  getEnvironmentsByWorkspace,
  getVariablesByEnvironment,
  getFoldersByWorkspace,
  getRequestsByWorkspace,
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

export const exportService = {
  async exportWorkspace(workspaceId: string): Promise<ExportData> {
    // 1. Fetch Workspace
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // 2. Fetch Environments & Variables
    const environments = await getEnvironmentsByWorkspace(workspaceId);
    const environmentsWithVars = await Promise.all(
      environments.map(async (env) => {
        const variables = await getVariablesByEnvironment(env._id);
        return { ...env, variables };
      })
    );

    // 3. Fetch Folders
    const folders = await getFoldersByWorkspace(workspaceId);

    // 4. Fetch Requests
    const requests = await getRequestsByWorkspace(workspaceId);

    // 5. Construct Result
    return {
      version: '1.0',
      source: 'Requiety',
      data: {
        workspace,
        environments: environmentsWithVars,
        folders,
        requests,
      },
    };
  },
};
