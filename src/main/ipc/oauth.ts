import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { OAuthService } from '../services/oauth.service';
import type { OAuth2Config } from '@shared/types';
import { LoggerService } from '../services/logger.service';

export function registerOAuthHandlers() {
  // Start authorization code flow
  ipcMain.handle(
    IPC_CHANNELS.OAUTH_START_AUTH_FLOW,
    async (_event, config: OAuth2Config, requestId: string) => {
      try {
        const token = await OAuthService.startAuthCodeFlow(config, requestId);
        return { success: true, data: token };
      } catch (error) {
        LoggerService.error('OAuth auth flow error:', error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Exchange code for token (manual flow)
  ipcMain.handle(
    IPC_CHANNELS.OAUTH_EXCHANGE_CODE,
    async (_event, config: OAuth2Config, code: string, requestId: string) => {
      try {
        const token = await OAuthService.exchangeCodeForToken(config, code);
        return { success: true, data: token };
      } catch (error) {
        LoggerService.error('OAuth code exchange error:', error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Refresh token
  ipcMain.handle(
    IPC_CHANNELS.OAUTH_REFRESH_TOKEN,
    async (_event, config: OAuth2Config, refreshToken: string, requestId: string) => {
      try {
        const token = await OAuthService.refreshToken(config, refreshToken, requestId);
        return { success: true, data: token };
      } catch (error) {
        LoggerService.error('OAuth refresh error:', error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Get stored token
  ipcMain.handle(IPC_CHANNELS.OAUTH_GET_TOKEN, async (_event, requestId: string) => {
    try {
      const token = await OAuthService.getToken(requestId);
      return { success: true, data: token };
    } catch (error) {
      LoggerService.error('OAuth get token error:', error);
      return { success: false, error: String(error) };
    }
  });

  // Clear stored token
  ipcMain.handle(IPC_CHANNELS.OAUTH_CLEAR_TOKEN, async (_event, requestId: string) => {
    try {
      await OAuthService.clearToken(requestId);
      return { success: true };
    } catch (error) {
      LoggerService.error('OAuth clear token error:', error);
      return { success: false, error: String(error) };
    }
  });

  // Client credentials grant
  ipcMain.handle(
    IPC_CHANNELS.OAUTH_CLIENT_CREDENTIALS,
    async (_event, config: OAuth2Config, requestId: string) => {
      try {
        const token = await OAuthService.clientCredentialsGrant(config, requestId);
        return { success: true, data: token };
      } catch (error) {
        LoggerService.error('OAuth client credentials error:', error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Password grant
  ipcMain.handle(
    IPC_CHANNELS.OAUTH_PASSWORD_GRANT,
    async (_event, config: OAuth2Config, requestId: string) => {
      try {
        const token = await OAuthService.passwordGrant(config, requestId);
        return { success: true, data: token };
      } catch (error) {
        LoggerService.error('OAuth password grant error:', error);
        return { success: false, error: String(error) };
      }
    }
  );
}
