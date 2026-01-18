import { BrowserWindow, shell } from 'electron';
import crypto from 'crypto';
import http from 'http';
import { URL } from 'url';
import type { OAuth2Config, OAuth2Token } from '../../shared/types';
import { saveToken, getTokenByRequestId, deleteTokenByRequestId } from '../database/models';

// PKCE helpers
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}


function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export class OAuthService {
  private static callbackServer: http.Server | null = null;
  private static pendingAuth: {
    resolve: (code: string) => void;
    reject: (error: Error) => void;
    state: string;
  } | null = null;

  /**
   * Start the authorization code flow
   * Opens a browser window for user authentication
   */
  static async startAuthCodeFlow(
    config: OAuth2Config,
    requestId: string
  ): Promise<OAuth2Token> {
    const state = crypto.randomBytes(16).toString('hex');
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;

    if (config.pkceEnabled) {
      codeVerifier = generateCodeVerifier();
      codeChallenge = generateCodeChallenge(codeVerifier);
    }

    // Build authorization URL
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('state', state);

    if (config.scope) {
      authUrl.searchParams.set('scope', config.scope);
    }

    if (config.pkceEnabled && codeChallenge) {
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
    }

    // Start local callback server if redirect is localhost
    const redirectUrl = new URL(config.redirectUri);
    let code: string;

    if (redirectUrl.hostname === 'localhost' || redirectUrl.hostname === '127.0.0.1') {
      code = await this.startCallbackServer(redirectUrl.port || '8080', redirectUrl.pathname, state);
    } else {
      // For non-localhost redirects, just open browser
      // User will need to manually copy code
      throw new Error('Non-localhost redirect URIs require manual code entry');
    }

    // Open browser for authorization
    await shell.openExternal(authUrl.toString());

    // Wait for callback with code
    // This happens in startCallbackServer

    // Exchange code for token
    const tokenData = await this.exchangeCodeForToken(config, code, codeVerifier);

    // Save token
    const token = await saveToken({ ...tokenData, requestId });

    return token;
  }

  /**
   * Start a local server to receive OAuth callback
   */
  private static startCallbackServer(
    port: string,
    path: string,
    expectedState: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Close any existing server
      if (this.callbackServer) {
        this.callbackServer.close();
      }

      this.callbackServer = http.createServer((req, res) => {
        const url = new URL(req.url || '', `http://localhost:${port}`);

        if (url.pathname === path) {
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Authorization Failed</h1><p>You can close this window.</p></body></html>');
            reject(new Error(`OAuth error: ${error}`));
          } else if (state !== expectedState) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Invalid State</h1><p>Security validation failed.</p></body></html>');
            reject(new Error('State mismatch - possible CSRF attack'));
          } else if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Authorization Successful</h1><p>You can close this window and return to Requiety.</p></body></html>');
            resolve(code);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Missing Code</h1><p>No authorization code received.</p></body></html>');
            reject(new Error('No authorization code received'));
          }

          // Close server after handling
          setTimeout(() => {
            this.callbackServer?.close();
            this.callbackServer = null;
          }, 1000);
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      this.callbackServer.listen(parseInt(port), 'localhost', () => {
        console.log(`OAuth callback server listening on http://localhost:${port}${path}`);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.callbackServer) {
          this.callbackServer.close();
          this.callbackServer = null;
          reject(new Error('Authorization timeout'));
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    config: OAuth2Config,
    code: string,
    codeVerifier?: string
  ): Promise<OAuth2Token> {
    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', config.redirectUri);
    params.set('client_id', config.clientId);

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }

    if (codeVerifier) {
      params.set('code_verifier', codeVerifier);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return this.parseTokenResponse(data);
  }

  /**
   * Client Credentials grant flow
   */
  static async clientCredentialsGrant(
    config: OAuth2Config,
    requestId: string
  ): Promise<OAuth2Token> {
    const params = new URLSearchParams();
    params.set('grant_type', 'client_credentials');
    params.set('client_id', config.clientId);

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }

    if (config.scope) {
      params.set('scope', config.scope);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Client credentials grant failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const tokenData = this.parseTokenResponse(data);

    // Save token
    const token = await saveToken({ ...tokenData, requestId });

    return token;
  }

  /**
   * Password grant flow (Resource Owner Password Credentials)
   */
  static async passwordGrant(
    config: OAuth2Config,
    requestId: string
  ): Promise<OAuth2Token> {
    if (!config.username || !config.password) {
      throw new Error('Username and password required for password grant');
    }

    const params = new URLSearchParams();
    params.set('grant_type', 'password');
    params.set('username', config.username);
    params.set('password', config.password);
    params.set('client_id', config.clientId);

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }

    if (config.scope) {
      params.set('scope', config.scope);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Password grant failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const tokenData = this.parseTokenResponse(data);

    // Save token
    const token = await saveToken({ ...tokenData, requestId });

    return token;
  }

  /**
   * Refresh an access token
   */
  static async refreshToken(
    config: OAuth2Config,
    refreshToken: string,
    requestId: string
  ): Promise<OAuth2Token> {
    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);
    params.set('client_id', config.clientId);

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const tokenData = this.parseTokenResponse(data);

    // Update stored token
    const token = await saveToken({ ...tokenData, requestId });

    return token;
  }

  /**
   * Get stored token for a request
   */
  static async getToken(requestId: string): Promise<OAuth2Token | undefined> {
    const token = await getTokenByRequestId(requestId);

    if (token && token.expiresAt) {
      // Check if token is expired
      if (Date.now() >= token.expiresAt) {
        // If there's a refresh token, try to refresh it automatically
        if (token.refreshToken) {
          // This part needs the config. We should probably pass it in.
          // For now, we'll just return undefined and let the caller handle refresh.
          return undefined;
        }
        return undefined; // Token expired
      }
    }

    return token || undefined;
  }

  /**
   * Clear stored token for a request
   */
  static async clearToken(requestId: string): Promise<void> {
    await deleteTokenByRequestId(requestId);
  }

  /**
   * Parse token response from OAuth server
   */
  private static parseTokenResponse(data: Record<string, unknown>): Omit<OAuth2Token, '_id' | 'type' | 'created' | 'modified' | 'requestId'> {
    const accessToken = data.access_token as string;
    if (!accessToken) {
      throw new Error('No access_token in response');
    }

    let expiresAt: number | undefined;
    if (data.expires_in) {
      expiresAt = Date.now() + (data.expires_in as number) * 1000;
    }

    return {
      accessToken,
      refreshToken: data.refresh_token as string | undefined,
      tokenType: (data.token_type as string) || 'Bearer',
      expiresAt,
      scope: data.scope as string | undefined,
    };
  }
}
