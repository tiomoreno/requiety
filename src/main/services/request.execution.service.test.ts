// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestExecutionService } from './request.execution.service';
import { TemplateEngine } from '../utils/template-engine';
import { HttpService } from '../http/client';
import * as assertionService from './assertion.service';
import { ScriptService } from './script.service';
import * as models from '../database/models';
import * as fileManager from '../utils/file-manager';

// Mocks
vi.mock('../utils/template-engine');
vi.mock('../http/client');
vi.mock('./assertion.service');
vi.mock('./script.service');
vi.mock('../database/models');
vi.mock('../utils/file-manager');

describe('RequestExecutionService', () => {
  const mockRequest = {
    _id: 'req1',
    type: 'Request',
    name: 'Test Request',
    url: 'http://example.com/api',
    method: 'GET',
    parentId: 'folder1',
    sortOrder: 0,
    headers: [],
    body: {},
    authentication: {},
    assertions: [],
    preRequestScript: '',
    postRequestScript: '',
    created: 0,
    modified: 0
  };

  const mockResponse = {
    _id: 'res1',
    statusCode: 200,
    statusMessage: 'OK',
    headers: [],
    body: '{"foo":"bar"}',
    elapsedTime: 100
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default Mocks
    vi.mocked(models.getWorkspaceIdForRequest).mockResolvedValue('w1');
    vi.mocked(models.getActiveEnvironment).mockResolvedValue({ _id: 'e1', name: 'Env', workspaceId: 'w1', isActive: true, created: 0, modified: 0, type: 'Environment' });
    vi.mocked(models.getVariablesByEnvironment).mockResolvedValue([{ _id: 'v1', key: 'VAR', value: 'VAL', isSecret: false, environmentId: 'e1', created: 0, modified: 0, type: 'Variable' }]);
    vi.mocked(models.createResponse).mockResolvedValue({ ...mockResponse, type: 'Response', requestId: 'req1', bodyPath: '/path/to/body', created: 0, modified: 0 });
    vi.mocked(models.getSettings).mockResolvedValue({ _id: 'settings', type: 'Settings', timeout: 30000, followRedirects: true, validateSSL: true, maxRedirects: 10, theme: 'auto', fontSize: 14, maxHistoryResponses: 50, created: 0, modified: 0 });
    
    vi.mocked(TemplateEngine.renderRequest).mockReturnValue({ ...mockRequest });
    
    // HttpService Mock
    const mockSendRequest = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(HttpService).mockImplementation(() => ({
      sendRequest: mockSendRequest
    } as any));

    vi.mocked(fileManager.saveResponseBody).mockResolvedValue('/path/to/body');
  });

  it('should execute a simple request successfully', async () => {
    const result = await RequestExecutionService.executeRequest(mockRequest as any);

    expect(models.getWorkspaceIdForRequest).toHaveBeenCalledWith('req1');
    expect(models.getActiveEnvironment).toHaveBeenCalledWith('w1');
    expect(models.getVariablesByEnvironment).toHaveBeenCalledWith('e1');
    expect(TemplateEngine.renderRequest).toHaveBeenCalled();
    expect(HttpService).toHaveBeenCalled();
    expect(fileManager.saveResponseBody).toHaveBeenCalledWith(mockResponse._id, mockResponse.body);
    expect(models.createResponse).toHaveBeenCalled();
    expect(result).toMatchObject({
        statusCode: 200,
        body: '{"foo":"bar"}'
    });
  });

  it('should run pre-request script if present', async () => {
    const req = { ...mockRequest, preRequestScript: 'console.log("pre")' };
    vi.mocked(TemplateEngine.renderRequest).mockReturnValue(req); // Render returns same req

    await RequestExecutionService.executeRequest(req as any);

    expect(ScriptService.executeScript).toHaveBeenCalledWith(
        'console.log("pre")',
        expect.objectContaining({ pm: expect.any(Object) })
    );
  });

  it('should run post-request script if present', async () => {
    const req = { ...mockRequest, postRequestScript: 'console.log("post")' };
    vi.mocked(TemplateEngine.renderRequest).mockReturnValue(req);

    await RequestExecutionService.executeRequest(req as any);

    // Should be called twice? No, preRequest is empty.
    // ScriptService.executeScript is reused.
    expect(ScriptService.executeScript).toHaveBeenCalledWith(
        'console.log("post")',
        expect.objectContaining({ pm: expect.any(Object) })
    );
  });

  it('should calculate Host header if auto-header is present', async () => {
    const headers = [{ name: 'Host', value: '', isAuto: true, enabled: true }];
    const req = { ...mockRequest, headers };
    
    vi.mocked(TemplateEngine.renderRequest).mockReturnValue({ ...req });
    
    // Capture what HttpService sends
    const mockSend = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(HttpService).mockImplementation(() => ({ sendRequest: mockSend } as any));

    await RequestExecutionService.executeRequest(req as any);

    const sentReq = mockSend.mock.calls[0][0];
    expect(sentReq.headers[0].value).toBe('example.com');
  });

  it('should run assertions if present', async () => {
    const req = { ...mockRequest, assertions: [{ id: 'a1', source: 'status', operator: 'equals', value: '200', enabled: true }] };
    vi.mocked(TemplateEngine.renderRequest).mockReturnValue(req);

    vi.mocked(assertionService.runAssertions).mockReturnValue({
        passed: 1, failed: 0, total: 1, results: [{ assertionId: 'a1', status: 'pass' }]
    });

    await RequestExecutionService.executeRequest(req as any);

    expect(assertionService.runAssertions).toHaveBeenCalled();
    expect(models.createResponse).toHaveBeenCalledWith(expect.objectContaining({
        testResults: expect.objectContaining({ passed: 1 })
    }));
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(HttpService).mockImplementation(() => ({
        sendRequest: vi.fn().mockRejectedValue(new Error('Network Error'))
    } as any));

    await expect(RequestExecutionService.executeRequest(mockRequest as any))
        .rejects.toThrow('Network Error');
  });
  
  it('should update variables from scripts', async () => {
      const req = { ...mockRequest, preRequestScript: 'pm.environment.set("VAR", "NEW_VAL")' };
      
      // We need to verify that pending updates from script execution are applied
      // ScriptService.executeScript is mocked, strict implementation won't run.
      // But RequestExecutionService.runScript creates the `pm` object passed to executeScript.
      // We need to spy on `pm.environment.set` OR mock `executeScript` to call the passed `pm` methods.
      
      vi.mocked(ScriptService.executeScript).mockImplementation(async (script, ctx) => {
          // Simulate script calling set
          ctx.pm.environment.set("VAR", "NEW_VAL");
      });
      
      await RequestExecutionService.executeRequest(req as any);
      
      expect(models.updateVariable).toHaveBeenCalledWith('v1', { value: 'NEW_VAL' });
  });
});
