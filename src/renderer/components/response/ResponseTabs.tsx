import { useState, useMemo } from 'react';
import { Response } from '../../../shared/types';
import { ResponseHeaders } from './ResponseHeaders';
import { CodeEditor } from '../common/CodeEditor';

interface ResponseTabsProps {
  response: Response;
}

type TabType = 'body' | 'headers' | 'tests';

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
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'tests'
              ? 'border-primary-600 text-primary-600 dark:text-primary-500 bg-white dark:bg-gray-950'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Tests {response.testResults ? `(${response.testResults.passed}/${response.testResults.total})` : ''}
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

        {activeTab === 'tests' && (
          <div className="p-4 overflow-auto h-full">
            {!response.testResults ? (
              <div className="text-center text-gray-500 mt-10">No tests executed for this request.</div>
            ) : (
              <div>
                <div className="flex gap-4 mb-4">
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                    Passed: {response.testResults.passed}
                  </div>
                  <div className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                    Failed: {response.testResults.failed}
                  </div>
                </div>

                <div className="space-y-2">
                  {response.testResults.results.map((result) => (
                    <div 
                      key={result.assertionId}
                      className={`p-3 rounded border ${
                        result.status === 'pass' 
                          ? 'bg-green-50 border-green-200 text-green-800' 
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                         <span className="font-bold uppercase text-xs">
                           {result.status}
                         </span>
                         {result.error ? (
                           <span>Error: {result.error}</span>
                         ) : (
                           <span className="text-sm">
                             Expected <strong>{String(result.expectedValue)}</strong> but got <strong>{String(result.actualValue)}</strong>
                           </span>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
