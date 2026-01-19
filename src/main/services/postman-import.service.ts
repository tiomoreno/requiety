import {
  createWorkspace,
  createEnvironment,
  createVariable,
  createFolder,
  createRequest,
} from '../database/models';
import type { Workspace } from '@shared/types';
import {
  PostmanParser,
  PostmanCollection,
  PostmanItem,
  PostmanAuth,
} from '../utils/parsers/postman.parser';

export class PostmanImportService {
  /**
   * Import a Postman Collection v2.1 and create workspace with all items
   */
  static async importCollection(collection: PostmanCollection): Promise<Workspace> {
    // Validate collection format
    if (!collection.info?.schema?.includes('v2.1') && !collection.info?.schema?.includes('v2.0')) {
      throw new Error('Unsupported Postman collection format. Please export as Collection v2.1');
    }

    // 1. Create Workspace
    const workspace = await createWorkspace({
      name: collection.info.name,
    });

    // 2. Import Collection Variables as Environment
    if (collection.variable && collection.variable.length > 0) {
      const env = await createEnvironment({
        name: 'Collection Variables',
        workspaceId: workspace._id,
      });

      for (const variable of collection.variable) {
        if (!variable.disabled) {
          await createVariable({
            environmentId: env._id,
            key: variable.key,
            value: variable.value || '',
            isSecret: false,
          });
        }
      }
    }

    // 3. Import Items (Folders and Requests) recursively
    await this.importItems(collection.item, workspace._id, collection.auth);

    return workspace;
  }

  /**
   * Recursively import Postman items (folders and requests)
   */
  private static async importItems(
    items: PostmanItem[],
    parentId: string,
    parentAuth?: PostmanAuth
  ): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.item && item.item.length > 0) {
        // It's a folder
        const folder = await createFolder({
          name: item.name,
          parentId,
          sortOrder: i,
        });

        // Inherit auth from parent if item has its own auth
        const effectiveAuth = item.auth || parentAuth;

        // Recursively import children
        await this.importItems(item.item, folder._id, effectiveAuth);
      } else if (item.request) {
        // It's a request
        await this.importRequest(item, parentId, i, parentAuth);
      }
    }
  }

  /**
   * Import a single Postman request
   */
  private static async importRequest(
    item: PostmanItem,
    parentId: string,
    sortOrder: number,
    parentAuth?: PostmanAuth
  ): Promise<void> {
    const postmanRequest = item.request!;

    // Parse URL
    const url = PostmanParser.parseUrl(postmanRequest.url);

    // Parse Method
    const method = PostmanParser.parseMethod(postmanRequest.method);

    // Parse Headers
    const headers = PostmanParser.parseHeaders(postmanRequest.header);

    // Parse Body
    const body = PostmanParser.parseBody(postmanRequest.body);

    // Parse Authentication (request-level > folder-level > collection-level)
    const effectiveAuth = postmanRequest.auth || item.auth || parentAuth;
    const authentication = PostmanParser.parseAuth(effectiveAuth);

    // Parse Scripts
    const { preRequestScript, postRequestScript } = PostmanParser.parseScripts(item.event);

    await createRequest({
      name: item.name,
      url,
      method,
      parentId,
      sortOrder,
      headers,
      body,
      authentication,
      preRequestScript,
      postRequestScript,
    });
  }

  /**
   * Validate if data is a Postman collection
   */
  static isPostmanCollection(data: unknown): data is PostmanCollection {
    return PostmanParser.isPostmanCollection(data);
  }
}
