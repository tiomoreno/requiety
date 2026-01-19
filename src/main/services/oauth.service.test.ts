// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OAuthService } from './oauth.service';
import type { OAuth2Config, OAuth2Token } from '@shared/types';

// Mock dependencies
vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock('../database/models', () => ({
  saveToken: vi.fn(),
  getTokenByRequestId: vi.fn(),
  deleteTokenByRequestId: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import * as models from '../database/models';

describe('OAuthService', () => {
  const mockConfig: OAuth2Config = {
    grantType: 'authorization_code',
    authUrl: 'https://auth.example.com/authorize',
    tokenUrl: 'https://auth.example.com/token',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:8080/callback',
    scope: 'openid profile',
  };

  const mockTokenResponse = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'openid profile',
  };

  const mockSavedToken: OAuth2Token = {
    _id: 'token_1',
    type: 'OAuth2Token',
    requestId: 'req_1',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer',
    expiresAt: Date.now() + 3600000,
    scope: 'openid profile',
    created: Date.now(),
    modified: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange authorization code for token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await OAuthService.exchangeCodeForToken(mockConfig, 'auth-code-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      // Check that the body contains expected params
      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('grant_type=authorization_code');
      expect(callBody).toContain('code=auth-code-123');
      expect(callBody).toContain('client_id=test-client-id');
      expect(callBody).toContain('client_secret=test-client-secret');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.tokenType).toBe('Bearer');
    });

    it('should include code_verifier for PKCE', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      await OAuthService.exchangeCodeForToken(mockConfig, 'auth-code-123', 'code-verifier-xyz');

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('code_verifier=code-verifier-xyz');
    });

    it('should throw error on failed token exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid grant',
      });

      await expect(OAuthService.exchangeCodeForToken(mockConfig, 'invalid-code')).rejects.toThrow(
        'Token exchange failed: 400 Invalid grant'
      );
    });

    it('should throw error when access_token is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token_type: 'Bearer' }), // No access_token
      });

      await expect(OAuthService.exchangeCodeForToken(mockConfig, 'auth-code')).rejects.toThrow(
        'No access_token in response'
      );
    });
  });

  describe('clientCredentialsGrant', () => {
    it('should obtain token using client credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      vi.mocked(models.saveToken).mockResolvedValue(mockSavedToken);

      const result = await OAuthService.clientCredentialsGrant(mockConfig, 'req_1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/token',
        expect.objectContaining({
          method: 'POST',
        })
      );

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('grant_type=client_credentials');
      expect(callBody).toContain('client_id=test-client-id');
      expect(callBody).toContain('scope=openid+profile');

      expect(models.saveToken).toHaveBeenCalled();
      expect(result).toEqual(mockSavedToken);
    });

    it('should throw error on failed client credentials grant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid client',
      });

      await expect(OAuthService.clientCredentialsGrant(mockConfig, 'req_1')).rejects.toThrow(
        'Client credentials grant failed: 401 Invalid client'
      );
    });
  });

  describe('passwordGrant', () => {
    const configWithPassword: OAuth2Config = {
      ...mockConfig,
      grantType: 'password',
      username: 'testuser',
      password: 'testpass',
    };

    it('should obtain token using password grant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      vi.mocked(models.saveToken).mockResolvedValue(mockSavedToken);

      const result = await OAuthService.passwordGrant(configWithPassword, 'req_1');

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('grant_type=password');
      expect(callBody).toContain('username=testuser');
      expect(callBody).toContain('password=testpass');

      expect(result).toEqual(mockSavedToken);
    });

    it('should throw error when username is missing', async () => {
      const configNoUser: OAuth2Config = { ...mockConfig, grantType: 'password' };

      await expect(OAuthService.passwordGrant(configNoUser, 'req_1')).rejects.toThrow(
        'Username and password required for password grant'
      );
    });

    it('should throw error when password is missing', async () => {
      const configNoPass: OAuth2Config = { ...mockConfig, grantType: 'password', username: 'user' };

      await expect(OAuthService.passwordGrant(configNoPass, 'req_1')).rejects.toThrow(
        'Username and password required for password grant'
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh an access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });

      const newToken: OAuth2Token = {
        ...mockSavedToken,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(models.saveToken).mockResolvedValue(newToken);

      const result = await OAuthService.refreshToken(mockConfig, 'old-refresh-token', 'req_1');

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toContain('grant_type=refresh_token');
      expect(callBody).toContain('refresh_token=old-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw error on failed token refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid refresh token',
      });

      await expect(OAuthService.refreshToken(mockConfig, 'invalid-token', 'req_1')).rejects.toThrow(
        'Token refresh failed: 400 Invalid refresh token'
      );
    });
  });

  describe('getToken', () => {
    it('should return stored token if valid', async () => {
      const validToken: OAuth2Token = {
        ...mockSavedToken,
        expiresAt: Date.now() + 3600000, // Expires in 1 hour
      };

      vi.mocked(models.getTokenByRequestId).mockResolvedValue(validToken);

      const result = await OAuthService.getToken('req_1');

      expect(models.getTokenByRequestId).toHaveBeenCalledWith('req_1');
      expect(result).toEqual(validToken);
    });

    it('should return undefined for expired token', async () => {
      const expiredToken: OAuth2Token = {
        ...mockSavedToken,
        expiresAt: Date.now() - 1000, // Already expired
      };

      vi.mocked(models.getTokenByRequestId).mockResolvedValue(expiredToken);

      const result = await OAuthService.getToken('req_1');

      expect(result).toBeUndefined();
    });

    it('should return undefined when no token exists', async () => {
      vi.mocked(models.getTokenByRequestId).mockResolvedValue(null);

      const result = await OAuthService.getToken('req_1');

      expect(result).toBeUndefined();
    });

    it('should return token without expiry check if expiresAt is undefined', async () => {
      const tokenNoExpiry: OAuth2Token = {
        ...mockSavedToken,
        expiresAt: undefined,
      };

      vi.mocked(models.getTokenByRequestId).mockResolvedValue(tokenNoExpiry);

      const result = await OAuthService.getToken('req_1');

      expect(result).toEqual(tokenNoExpiry);
    });
  });

  describe('clearToken', () => {
    it('should delete stored token', async () => {
      vi.mocked(models.deleteTokenByRequestId).mockResolvedValue(undefined);

      await OAuthService.clearToken('req_1');

      expect(models.deleteTokenByRequestId).toHaveBeenCalledWith('req_1');
    });
  });
});
