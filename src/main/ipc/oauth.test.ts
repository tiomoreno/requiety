import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerOAuthHandlers } from './oauth';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { OAuthService } from '../services/oauth.service';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('../services/oauth.service', () => ({
  OAuthService: {
    startAuthCodeFlow: vi.fn(),
    exchangeCodeForToken: vi.fn(),
    refreshToken: vi.fn(),
    getToken: vi.fn(),
    clearToken: vi.fn(),
    clientCredentialsGrant: vi.fn(),
    passwordGrant: vi.fn(),
  },
}));

describe('OAuth IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerOAuthHandlers();
  });

  const getHandler = (channel: string) => {
    const call = vi.mocked(ipcMain.handle).mock.calls.find((c) => c[0] === channel);
    return call ? call[1] : null;
  };

  it('OAUTH_START_AUTH_FLOW', async () => {
    const handler = getHandler(IPC_CHANNELS.OAUTH_START_AUTH_FLOW);
    vi.mocked(OAuthService.startAuthCodeFlow).mockResolvedValue({ accessToken: 'token' } as any);

    const result = await handler({} as any, { config: 1 }, 'req1');

    expect(OAuthService.startAuthCodeFlow).toHaveBeenCalledWith({ config: 1 }, 'req1');
    expect(result).toEqual({ success: true, data: { accessToken: 'token' } });
  });

  it('OAUTH_START_AUTH_FLOW - error', async () => {
    const handler = getHandler(IPC_CHANNELS.OAUTH_START_AUTH_FLOW);
    vi.mocked(OAuthService.startAuthCodeFlow).mockRejectedValue(new Error('Auth failed'));

    const result = await handler({} as any, { config: 1 }, 'req1');
    expect(result).toEqual({ success: false, error: 'Error: Auth failed' });
  });

  it('OAUTH_EXCHANGE_CODE', async () => {
    const handler = getHandler(IPC_CHANNELS.OAUTH_EXCHANGE_CODE);
    vi.mocked(OAuthService.exchangeCodeForToken).mockResolvedValue({ accessToken: 'token' } as any);

    const result = await handler({} as any, {}, 'code1', 'req1');
    expect(OAuthService.exchangeCodeForToken).toHaveBeenCalledWith({}, 'code1');
    expect(result).toEqual({ success: true, data: { accessToken: 'token' } });
  });

  it('OAUTH_REFRESH_TOKEN', async () => {
    const handler = getHandler(IPC_CHANNELS.OAUTH_REFRESH_TOKEN);
    vi.mocked(OAuthService.refreshToken).mockResolvedValue({ accessToken: 'new_token' } as any);

    const result = await handler({} as any, {}, 'ref_token', 'req1');
    expect(OAuthService.refreshToken).toHaveBeenCalledWith({}, 'ref_token', 'req1');
    expect(result).toEqual({ success: true, data: { accessToken: 'new_token' } });
  });

  it('OAUTH_GET_TOKEN', async () => {
    const handler = getHandler(IPC_CHANNELS.OAUTH_GET_TOKEN);
    vi.mocked(OAuthService.getToken).mockResolvedValue({ accessToken: 'token' } as any);

    const result = await handler({} as any, 'req1');
    expect(OAuthService.getToken).toHaveBeenCalledWith('req1');
    expect(result).toEqual({ success: true, data: { accessToken: 'token' } });
  });

  it('OAUTH_CLEAR_TOKEN', async () => {
    const handler = getHandler(IPC_CHANNELS.OAUTH_CLEAR_TOKEN);
    vi.mocked(OAuthService.clearToken).mockResolvedValue();

    const result = await handler({} as any, 'req1');
    expect(OAuthService.clearToken).toHaveBeenCalledWith('req1');
    expect(result).toEqual({ success: true });
  });

  it('OAUTH_CLIENT_CREDENTIALS', async () => {
    const handler = getHandler(IPC_CHANNELS.OAUTH_CLIENT_CREDENTIALS);
    vi.mocked(OAuthService.clientCredentialsGrant).mockResolvedValue({
      accessToken: 'token',
    } as any);

    const result = await handler({} as any, {}, 'req1');
    expect(OAuthService.clientCredentialsGrant).toHaveBeenCalledWith({}, 'req1');
    expect(result).toEqual({ success: true, data: { accessToken: 'token' } });
  });

  it('OAUTH_PASSWORD_GRANT', async () => {
    const handler = getHandler(IPC_CHANNELS.OAUTH_PASSWORD_GRANT);
    vi.mocked(OAuthService.passwordGrant).mockResolvedValue({ accessToken: 'token' } as any);

    const result = await handler({} as any, {}, 'req1');
    expect(OAuthService.passwordGrant).toHaveBeenCalledWith({}, 'req1');
    expect(result).toEqual({ success: true, data: { accessToken: 'token' } });
  });
});
