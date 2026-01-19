import { Authentication, OAuth2GrantType } from '@shared/types';
import { useState, useEffect } from 'react';

interface OAuth2EditorProps {
  auth: Authentication;
  onChange: (auth: Authentication) => void;
}

export function OAuth2Editor({ auth, onChange }: OAuth2EditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null); // To display if a token is active

  const oauthConfig = auth.oauth2 || { grantType: 'authorization_code' };

  const handleChange = (field: string, value: string | boolean) => {
    onChange({
      ...auth,
      oauth2: {
        ...oauthConfig,
        [field]: value,
      },
    });
  };

  const handleGetToken = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let result;
      switch (oauthConfig.grantType) {
        case 'authorization_code':
          result = await window.api.oauth.startAuthCodeFlow(oauthConfig, 'some-request-id'); // TODO: Pass real request ID
          break;
        case 'client_credentials':
          result = await window.api.oauth.clientCredentials(oauthConfig, 'some-request-id');
          break;
        case 'password':
          result = await window.api.oauth.passwordGrant(oauthConfig, 'some-request-id');
          break;
        default:
          throw new Error(`Grant type ${oauthConfig.grantType} not supported yet.`);
      }

      if (result.success && result.data) {
        setToken(result.data.accessToken);
      } else {
        throw new Error(result.error || 'Failed to get token.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: Get current token for request and display its status
  // useEffect(() => { ... });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 items-center">
        <label className="text-xs font-medium">Grant Type</label>
        <select
          value={oauthConfig.grantType}
          onChange={(e) => handleChange('grantType', e.target.value)}
          className="col-span-2 p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="authorization_code">Authorization Code</option>
          <option value="client_credentials">Client Credentials</option>
          <option value="password">Password Credentials</option>
          <option value="implicit" disabled>
            Implicit (Not Recommended)
          </option>
        </select>
      </div>

      {oauthConfig.grantType === 'authorization_code' && (
        <>
          <Input
            fieldKey="authUrl"
            label="Authorization URL"
            value={oauthConfig.authUrl}
            onChange={handleChange}
          />
          <Input
            fieldKey="redirectUri"
            label="Redirect URI"
            value={oauthConfig.redirectUri}
            onChange={handleChange}
            placeholder="e.g., http://localhost:3000/oauth/callback"
          />
        </>
      )}

      {(oauthConfig.grantType === 'authorization_code' ||
        oauthConfig.grantType === 'client_credentials' ||
        oauthConfig.grantType === 'password') && (
        <Input
          fieldKey="tokenUrl"
          label="Access Token URL"
          value={oauthConfig.tokenUrl}
          onChange={handleChange}
        />
      )}

      <Input
        fieldKey="clientId"
        label="Client ID"
        value={oauthConfig.clientId}
        onChange={handleChange}
      />
      <Input
        fieldKey="clientSecret"
        label="Client Secret"
        type="password"
        value={oauthConfig.clientSecret}
        onChange={handleChange}
      />
      <Input
        fieldKey="scope"
        label="Scope"
        value={oauthConfig.scope}
        onChange={handleChange}
        placeholder="e.g., read:user,repo"
      />

      {oauthConfig.grantType === 'password' && (
        <>
          <Input
            fieldKey="username"
            label="Username"
            value={oauthConfig.username}
            onChange={handleChange}
          />
          <Input
            fieldKey="password"
            label="Password"
            type="password"
            value={oauthConfig.password}
            onChange={handleChange}
          />
        </>
      )}

      <div className="pt-4 flex items-center justify-between">
        <button
          onClick={handleGetToken}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isLoading ? 'Fetching Token...' : 'Get New Access Token'}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {token && (
        <div className="mt-4 p-2 bg-green-100 dark:bg-green-900/20 rounded">
          <p className="text-xs text-green-800 dark:text-green-300">Active token found.</p>
        </div>
      )}
    </div>
  );
}

// Helper component
const Input = ({
  fieldKey,
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  fieldKey: string;
  label: string;
  value: string;
  onChange: (k: string, v: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div className="grid grid-cols-3 gap-4 items-center">
    <label className="text-xs font-medium">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(fieldKey, e.target.value)}
      className="col-span-2 p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
      placeholder={placeholder}
    />
  </div>
);
