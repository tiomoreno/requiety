import { Authentication, AuthType } from '@shared/types';
import { OAuth2Editor } from './OAuth2Editor';

interface AuthEditorProps {
  auth: Authentication;
  onChange: (auth: Authentication) => void;
}

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const handleTypeChange = (type: AuthType) => {
    // Reset fields when type changes for cleanliness
    onChange({ type });
  };

  const handleChange = (field: keyof Authentication, value: string) => {
    onChange({ ...auth, [field]: value });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-4">
      <div className="max-w-xl">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
          Auth Type
        </label>
        <select
          value={auth.type}
          onChange={(e) => handleTypeChange(e.target.value as AuthType)}
          className="w-full mb-6 p-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="none">No Authentication</option>
          <option value="basic">Basic Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="oauth2">OAuth 2.0</option>
        </select>

        {auth.type === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={auth.username || ''}
                onChange={(e) => handleChange('username', e.target.value)}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={auth.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Password"
              />
            </div>
          </div>
        )}

        {auth.type === 'bearer' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Token
            </label>
            <textarea
              value={auth.token || ''}
              onChange={(e) => handleChange('token', e.target.value)}
              className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              rows={4}
              placeholder="e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
          </div>
        )}

        {auth.type === 'oauth2' && <OAuth2Editor auth={auth} onChange={onChange} />}

        {auth.type === 'none' && (
          <div className="text-sm text-gray-500 italic">
            This request does not use any authentication.
          </div>
        )}
      </div>
    </div>
  );
}
