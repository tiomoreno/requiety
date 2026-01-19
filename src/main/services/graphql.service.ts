import { getIntrospectionQuery } from 'graphql';
import axios from 'axios';
import { LoggerService } from './logger.service';

export class GraphQLService {
  /**
   * Fetches the GraphQL schema from the given URL.
   */
  static async introspect(url: string, headers: Record<string, string> = {}): Promise<any> {
    try {
      const query = getIntrospectionQuery();

      const response = await axios.post(
        url,
        { query },
        {
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          timeout: 30000,
        }
      );

      if (response.data?.errors) {
        throw new Error('GraphQL Introspection Errors: ' + JSON.stringify(response.data.errors));
      }

      return response.data;
    } catch (error) {
      LoggerService.error('Introspection failed:', error);
      throw error;
    }
  }
}
