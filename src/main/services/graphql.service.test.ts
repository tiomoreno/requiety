// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLService } from './graphql.service';
import axios from 'axios';
import { getIntrospectionQuery } from 'graphql';

vi.mock('axios');

describe('GraphQLService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch schema successfully', async () => {
        const mockData = { data: { __schema: { types: [] } } };
        vi.mocked(axios.post).mockResolvedValue({ data: mockData });
        
        const result = await GraphQLService.introspect('http://api.com/graphql');
        
        expect(axios.post).toHaveBeenCalledWith(
            'http://api.com/graphql',
            { query: getIntrospectionQuery() },
            expect.objectContaining({
                headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
                timeout: 30000
            })
        );
        expect(result).toEqual(mockData);
    });

    it('should handle custom headers', async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: {} });
        await GraphQLService.introspect('url', { 'Authorization': 'Bearer token' });
        
        expect(axios.post).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.objectContaining({
                headers: expect.objectContaining({ 'Authorization': 'Bearer token' })
            })
        );
    });

    it('should throw on graphql errors', async () => {
        const mockError = { errors: [{ message: 'Bad query' }] };
        vi.mocked(axios.post).mockResolvedValue({ data: mockError });
        
        await expect(GraphQLService.introspect('url')).rejects.toThrow('GraphQL Introspection Errors');
    });

    it('should throw on network errors', async () => {
        vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'));
        await expect(GraphQLService.introspect('url')).rejects.toThrow('Network Error');
    });
});
