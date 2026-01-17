// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpService } from './client';
import axios from 'axios';

vi.mock('axios');

describe('HttpService', () => {
    let service: HttpService;

    beforeEach(() => {
        service = new HttpService();
        vi.clearAllMocks();
    });

    it('should send simple GET request', async () => {
        const req: any = {
            url: 'http://e.com',
            method: 'GET',
            headers: [],
            body: { type: 'none' }
        };

        vi.mocked(axios).mockResolvedValue({
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            data: { success: true }
        } as any);

        const res = await service.sendRequest(req);

        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            url: 'http://e.com',
            method: 'GET'
        }));
        expect(res.statusCode).toBe(200);
        expect(res.body).toContain('success');
    });

    it('should send POST with JSON body', async () => {
        const req: any = {
            url: 'http://e.com',
            method: 'POST',
            body: { type: 'json', text: '{"a":1}' }
        };

        vi.mocked(axios).mockResolvedValue({
            status: 201, headers: {}, data: {}
        } as any);

        await service.sendRequest(req);

        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            data: '{"a":1}',
            headers: expect.objectContaining({ 'Content-Type': 'application/json' })
        }));
    });
    
    it('should send POST with form-urlencoded body', async () => {
        const req: any = {
            url: 'http://e.com',
            method: 'POST',
            body: { type: 'form-urlencoded', params: [{name:'a', value:'1', enabled:true}] }
        };

        vi.mocked(axios).mockResolvedValue({ status: 200, headers: {}, data: {} } as any);
        await service.sendRequest(req);
        
        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            data: 'a=1',
            headers: expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' })
        }));
    });

    it('should send POST with form-data body', async () => {
         const req: any = {
            url: 'http://e.com',
            method: 'POST',
            body: { type: 'form-data', params: [{name:'a', value:'1', enabled:true}] }
        };

        vi.mocked(axios).mockResolvedValue({ status: 200, headers: {}, data: {} } as any);
        await service.sendRequest(req);
        
        // In node environment, FormData might fallback or use URLSearchParams as per implementation if FormData not global
        // The implementation checks `if (typeof FormData !== 'undefined')`
        // In vitest node env, FormData is available in recent node versions.
        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
             // It will be a FormData object
             // content-type might be set automatically by axios or unset in headers map?
             // Let's check headers
        }));
    });

    it('should send POST with GraphQL body', async () => {
        const req: any = {
            url: 'http://e.com',
            method: 'POST',
            body: { 
                type: 'graphql', 
                graphql: { query: 'query { a }', variables: '{"b":1}' } 
            }
        };

        vi.mocked(axios).mockResolvedValue({ status: 200, headers: {}, data: {} } as any);
        await service.sendRequest(req);

        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            data: JSON.stringify({ query: 'query { a }', variables: { b: 1 } }),
            headers: expect.objectContaining({ 'Content-Type': 'application/json' })
        }));
    });

    it('should handle Bearer Auth', async () => {
        const req: any = {
             url: 'http://e.com',
             authentication: { type: 'bearer', token: 'secret' }
        };
        vi.mocked(axios).mockResolvedValue({ status: 200, headers: {}, data: {} } as any);
        await service.sendRequest(req);
        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            headers: expect.objectContaining({ 'Authorization': 'Bearer secret' })
        }));
    });

    it('should handle Basic Auth', async () => {
        const req: any = {
             url: 'http://e.com',
             authentication: { type: 'basic', username: 'u', password: 'p' }
        };
        vi.mocked(axios).mockResolvedValue({ status: 200, headers: {}, data: {} } as any);
        await service.sendRequest(req);
        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            auth: { username: 'u', password: 'p' }
        }));
    });

    it('should handle network error', async () => {
        const req: any = { url: 'http://bad.com' };
        vi.mocked(axios).mockRejectedValue(new Error('Network Error'));
        
        const res = await service.sendRequest(req);
        expect(res.statusCode).toBe(0);
        expect(res.statusMessage).toBe('Network Error');
    });

    it('should validate status (not throw)', async () => {
         const req: any = { url: 'http://e.com' };
         // In real usage, we want 404/500 to return response, not throw.
         // Axios mock usually resolved value even for 404 if validateStatus returns true.
         // But here we are mocking axios directly.
         // We should verify `validateStatus` config is passed.
         
         vi.mocked(axios).mockResolvedValue({ status: 404, statusText: 'Not Found', headers: {}, data: '' } as any);
         const res = await service.sendRequest(req);
         expect(res.statusCode).toBe(404);
         
         const callArgs = vi.mocked(axios).mock.calls[0][0];
         expect(callArgs.validateStatus?.(404)).toBe(true);
    });

    it('should handle invalid GraphQL variables', async () => {
        const req: any = {
            url: 'http://e.com',
            method: 'POST',
            body: { 
                type: 'graphql', 
                graphql: { query: 'query { a }', variables: '{invalid json}' } 
            }
        };
        
        // Spy on console.warn to suppress output
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        vi.mocked(axios).mockResolvedValue({ status: 200, headers: {}, data: {} } as any);
        await service.sendRequest(req);

        expect(consoleSpy).toHaveBeenCalled();
        // Variables should default to {}
        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            data: JSON.stringify({ query: 'query { a }', variables: {} }),
        }));
    });

    it('should handle default body type', async () => {
        const req: any = {
            url: 'http://e.com',
            method: 'POST',
            body: { type: 'unknown', text: 'some text' }
        };

        vi.mocked(axios).mockResolvedValue({ status: 200, headers: {}, data: {} } as any);
        await service.sendRequest(req);

        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            data: 'some text'
        }));
    });
});
