import { useState, useEffect } from 'react';
import type { OAuth2Config, OAuth2GrantType, OAuth2Token } from '@shared/types';
import { FaSync, FaTrash } from 'react-icons/fa';

interface OAuthEditorProps {
  config: OAuth2Config;
  onChange: (config: OAuth2Config) => void;
  requestId: string;
}

const grantTypes: { value: OAuth2GrantType; label: string; description: string }[] = [
  {
    value: 'authorization_code',
    label: 'Authorization Code',
    description: 'Most secure flow, requires user interaction',
  },
  {
    value: 'client_credentials',
    label: 'Client Credentials',
    description: 'For server-to-server authentication',
  },
  { value: 'password', label: 'Password', description: 'Direct username/password (legacy)' },
  {
    value: 'implicit',
    label: 'Implicit',
    description: 'Deprecated, use Auth Code with PKCE instead',
  },
];

export function OAuthEditor({ config, onChange, requestId }: OAuthEditorProps) {
  const [token, setToken] = useState<OAuth2Token | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialToken = async () => {
      const result = await window.api.oauth.getToken(requestId);
      if (result.success && result.data) {
        setToken(result.data);
      }
    };
    loadInitialToken();
  }, [requestId]);

  const handleFieldChange = (field: keyof OAuth2Config, value: string | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const handleGetOrRefreshToken = async () => {
    if (token && token.refreshToken) {
      await refreshTokenHandler();
    } else {
      await getToken();
    }
  };

  const getToken = async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      switch (config.grantType) {
        case 'authorization_code':
          result = await window.api.oauth.startAuthCodeFlow(config, requestId);
          break;
        case 'client_credentials':
          result = await window.api.oauth.clientCredentials(config, requestId);
          break;
        case 'password':
          result = await window.api.oauth.passwordGrant(config, requestId);
          break;
        default:
          throw new Error(`Grant type ${config.grantType} not supported`);
      }
      if (result.success && result.data) {
        setToken(result.data);
      } else {
        throw new Error(result.error || 'Failed to get token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const refreshTokenHandler = async () => {
    if (!token?.refreshToken) {
      setError('No refresh token available to refresh.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.oauth.refreshToken(config, token.refreshToken, requestId);
      if (result.success && result.data) {
        setToken(result.data);
      } else {
        throw new Error(result.error || 'Failed to refresh token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const clearToken = async () => {
    await window.api.oauth.clearToken(requestId);
    setToken(null);
  };

  const isTokenExpired = token?.expiresAt && Date.now() >= token.expiresAt;
  const buttonText = token
    ? token.refreshToken
      ? 'Get / Refresh Token'
      : 'Get New Token'
    : 'Get New Token';

  return (
    <div className="p-4 space-y-4 overflow-auto">
      {/* Grant Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Grant Type
        </label>
        <select
          value={config.grantType}
          onChange={(e) => handleFieldChange('grantType', e.target.value as OAuth2GrantType)}
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {grantTypes.map((gt) => (
            <option key={gt.value} value={gt.value}>
              {gt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {grantTypes.find((gt) => gt.value === config.grantType)?.description}
        </p>
      </div>

      {/* Authorization URL (for auth code flow) */}
      {(config.grantType === 'authorization_code' || config.grantType === 'implicit') && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
            Authorization URL
          </label>
          <input
            type="url"
            value={config.authUrl}
            onChange={(e) => handleFieldChange('authUrl', e.target.value)}
            placeholder="https://provider.com/oauth/authorize"
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Token URL */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Token URL
        </label>
        <input
          type="url"
          value={config.tokenUrl}
          onChange={(e) => handleFieldChange('tokenUrl', e.target.value)}
          placeholder="https://provider.com/oauth/token"
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Client ID */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Client ID
        </label>
        <input
          type="text"
          value={config.clientId}
          onChange={(e) => handleFieldChange('clientId', e.target.value)}
          placeholder="Your client ID"
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Client Secret */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Client Secret
        </label>
        <input
          type="password"
          value={config.clientSecret || ''}
          onChange={(e) => handleFieldChange('clientSecret', e.target.value)}
          placeholder="Your client secret (optional for PKCE)"
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Redirect URI (for auth code flow) */}
      {config.grantType === 'authorization_code' && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
            Redirect URI
          </label>
          <input
            type="url"
            value={config.redirectUri}
            onChange={(e) => handleFieldChange('redirectUri', e.target.value)}
            placeholder="http://localhost:8080/callback"
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Scope */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Scope</label>
        <input
          type="text"
          value={config.scope || ''}
          onChange={(e) => handleFieldChange('scope', e.target.value)}
          placeholder="openid profile email"
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* PKCE (for auth code flow) */}
      {config.grantType === 'authorization_code' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pkce"
            checked={config.pkceEnabled || false}
            onChange={(e) => handleFieldChange('pkceEnabled', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
          />
          <label htmlFor="pkce" className="text-sm text-gray-700 dark:text-gray-300">
            Enable PKCE (recommended)
          </label>
        </div>
      )}

      {/* Username/Password (for password grant) */}
      {config.grantType === 'password' && (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Username
            </label>
            <input
              type="text"
              value={config.username || ''}
              onChange={(e) => handleFieldChange('username', e.target.value)}
              placeholder="Username"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              value={config.password || ''}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Token Status */}
      {token && (
        <div
          className={`p-3 border rounded ${
            isTokenExpired
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FaCheck className={isTokenExpired ? 'text-yellow-600' : 'text-green-600'} />
            <span className="text-sm font-medium">
              {isTokenExpired ? 'Token Expired' : 'Token Acquired'}
            </span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>Type: {token.tokenType}</p>
            {token.expiresAt && <p>Expires: {new Date(token.expiresAt).toLocaleString()}</p>}
            {token.scope && <p>Scope: {token.scope}</p>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleGetOrRefreshToken}
          disabled={loading || !config.tokenUrl || !config.clientId}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
        >
          {loading ? <span className="animate-spin">&#9696;</span> : <FaSync className="w-3 h-3" />}
          {buttonText}
        </button>

        {token && (
          <button
            onClick={clearToken}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            title="Clear Token"
          >
            <FaTrash className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
