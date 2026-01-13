import { useState } from 'react';
import { Request } from '../../../shared/types';
import { HeadersEditor } from './editors/HeadersEditor';
import { BodyEditor } from './editors/BodyEditor';
import { AuthEditor } from './editors/AuthEditor';

interface RequestTabsProps {
  request: Request;
  onRequestUpdate: (updatedRequest: Request) => void;
}

type TabType = 'params' | 'headers' | 'body' | 'auth';

export function RequestTabs({ request, onRequestUpdate }: RequestTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('params');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: `Headers ${request.headers.length > 0 ? `(${request.headers.length})` : ''}` },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
  ];

  const handleUpdate = (field: keyof Request, value: any) => {
    onRequestUpdate({ ...request, [field]: value });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        {activeTab === 'params' && (
          <div className="p-4 text-center text-gray-500 text-sm mt-10">
            Query Params Editor coming soon.
            <br />
            (For now, edit params directly in the URL)
          </div>
        )}

        {activeTab === 'headers' && (
          <HeadersEditor
            headers={request.headers || []} // Ensure array
            onChange={(headers) => handleUpdate('headers', headers)}
          />
        )}

        {activeTab === 'body' && (
          <BodyEditor
            body={request.body || { type: 'none' }} // Ensure object
            onChange={(body) => handleUpdate('body', body)}
          />
        )}

        {activeTab === 'auth' && (
          <AuthEditor
            auth={request.authentication || { type: 'none' }} // Ensure object
            onChange={(auth) => handleUpdate('authentication', auth)}
          />
        )}
      </div>
    </div>
  );
}
