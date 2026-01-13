import { useState, useMemo } from 'react';
import { Response } from '../../../shared/types';
import { ResponseHeaders } from './ResponseHeaders';
import { CodeEditor } from '../common/CodeEditor';

interface ResponseTabsProps {
  response: Response;
}

type TabType = 'body' | 'headers';

export function ResponseTabs({ response }: ResponseTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('body');

  const isJson = useMemo(() => {
    const contentType = response.headers?.find(h => h.name.toLowerCase() === 'content-type');
    return contentType?.value.includes('application/json');
  }, [response.headers]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
        <button
          onClick={() => setActiveTab('body')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'body'
              ? 'border-primary-600 text-primary-600 dark:text-primary-500 bg-white dark:bg-gray-950'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Body
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'headers'
              ? 'border-primary-600 text-primary-600 dark:text-primary-500 bg-white dark:bg-gray-950'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Headers {response.headers ? `(${response.headers.length})` : ''}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-white dark:bg-gray-950">
        {activeTab === 'body' && (
          isJson ? (
            <CodeEditor
              value={response.body || ''}
              language="json"
              readOnly={true}
              onChange={() => {}}
            />
          ) : (
            <textarea 
              readOnly
              value={response.body || ''}
              className="w-full h-full p-4 font-mono text-sm bg-transparent border-none resize-none focus:ring-0 text-gray-800 dark:text-gray-200"
            />
          )
        )}
        
        {activeTab === 'headers' && (
           <ResponseHeaders headers={response.headers || []} />
        )}
      </div>
    </div>
  );
}
