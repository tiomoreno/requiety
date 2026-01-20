// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { variableService } from './variable.service';

describe('VariableService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window = {
      api: {
        variable: {
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          getByEnvironment: vi.fn(),
        },
      },
    } as any;
  });

  it('create should return new variable', async () => {
    const mockVar = { _id: 'v1', key: 'K' };
    vi.mocked(window.api.variable.create).mockResolvedValue({ success: true, data: mockVar });
    const result = await variableService.create({
      environmentId: 'e1',
      key: 'K',
      value: 'V',
      isSecret: false,
    });
    expect(result).toEqual(mockVar);
  });

  it('update should return updated variable', async () => {
    const mockVar = { _id: 'v1', value: 'V2' };
    vi.mocked(window.api.variable.update).mockResolvedValue({ success: true, data: mockVar });
    const result = await variableService.update('v1', { value: 'V2' });
    expect(result).toEqual(mockVar);
  });

  it('getByEnvironment should return variables', async () => {
    const mockVars = [{ _id: 'v1' }];
    vi.mocked(window.api.variable.getByEnvironment).mockResolvedValue({
      success: true,
      data: mockVars,
    });
    const result = await variableService.getByEnvironment('e1');
    expect(result).toEqual(mockVars);
  });

  it('getByEnvironment should return empty on success null data', async () => {
    vi.mocked(window.api.variable.getByEnvironment).mockResolvedValue({
      success: true,
      data: null,
    });
    const result = await variableService.getByEnvironment('e1');
    expect(result).toEqual([]);
  });

  it('delete should succeed', async () => {
    vi.mocked(window.api.variable.delete).mockResolvedValue({ success: true });
    await variableService.delete('v1');
    expect(window.api.variable.delete).toHaveBeenCalledWith('v1');
  });
});
