import { useState, useEffect, useCallback } from 'react';
import { Request } from '../../../shared/types';
import { HeadersEditor } from './editors/HeadersEditor';
import { BodyEditor } from './editors/BodyEditor';
import { AuthEditor } from './editors/AuthEditor';
import { AssertionsEditor } from './editors/AssertionsEditor';
import { ScriptEditor } from './editors/ScriptEditor';
import { requestService } from '../../services/request.service';

import { WebSocketEditor } from './editors/WebSocketEditor';
import { mergeAutoHeaders } from '../../utils/header-utils';

// Simple debounce implementation
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
};


interface RequestTabsProps {
  request: Request;
  onRequestUpdate: (updatedRequest: Request) => void;
}

type TabType = 'params' | 'headers' | 'body' | 'auth' | 'tests' | 'scripts';

export function RequestTabs({ request, onRequestUpdate }: RequestTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('params');
  const [activeScriptType, setActiveScriptType] = useState<'pre' | 'post'>('pre');

  // Debounced save function
  const debouncedUpdateRequest = useCallback(
    debounce((requestId: string, data: Partial<Request>) => {
      requestService.update(requestId, data);
    }, 500),
    []
  );

  const handleUpdate = (update: Partial<Request>) => {
    const updatedRequest = { ...request, ...update };
    onRequestUpdate(updatedRequest); // Update parent state immediately for UI responsiveness
    debouncedUpdateRequest(request._id, update); // Persist changes with debounce
  };

  // Merge auto-headers when request changes or loads
  useEffect(() => {
    const merged = mergeAutoHeaders(request.headers || []);
    // Only update if there's a difference to avoid infinite loops
    // Simple length check + check if auto headers are present
    const hasAutoHeaders = request.headers?.some(h => h.isAuto);
    if (!hasAutoHeaders || request.headers?.length !== merged.length) {
       handleUpdate({ headers: merged });
    }
  }, [request._id]); // Re-run when switching requests, but be careful about infinite loops if we depend on request.headers


  if (request.method === 'WS') {
    return (
      <WebSocketEditor
        requestId={request._id}
        url={request.url}
        onUrlChange={(url) => handleUpdate({ url })}
      />
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: `Headers ${request.headers ? `(${request.headers.length})` : ''}` },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
    { id: 'scripts', label: 'Scripts' },
    { id: 'tests', label: `Tests ${request.assertions && request.assertions.length > 0 ? `(${request.assertions.length})` : ''}` },
  ];

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
            headers={request.headers || []}
            onChange={(headers) => handleUpdate({ headers })}
          />
        )}

        {activeTab === 'body' && (
          <BodyEditor
            body={request.body || { type: 'none' }}
            grpcData={request.grpc}
            onChange={(body, grpcData) => {
              const update: Partial<Request> = { body };
              if (grpcData) {
                update.grpc = grpcData;
              }
              handleUpdate(update);
            }}
            url={request.url}
            headers={request.headers || []}
          />
        )}

        {activeTab === 'auth' && (
          <AuthEditor
            auth={request.authentication || { type: 'none' }}
            onChange={(auth) => handleUpdate({ authentication: auth })}
          />
        )}

        {activeTab === 'scripts' && (
           <div className="flex flex-col h-full">
             <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
               <button
                 onClick={() => setActiveScriptType('pre')}
                 className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                   activeScriptType === 'pre' 
                    ? 'text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-700' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                 }`}
               >
                 Pre-request
               </button>
               <button
                 onClick={() => setActiveScriptType('post')}
                 className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                   activeScriptType === 'post' 
                    ? 'text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-700' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                 }`}
               >
                 Post-request
               </button>
             </div>
             <div className="flex-1 p-0">
               <ScriptEditor 
                 value={activeScriptType === 'pre' ? request.preRequestScript || '' : request.postRequestScript || ''} 
                 onChange={(val) => handleUpdate(activeScriptType === 'pre' ? { preRequestScript: val } : { postRequestScript: val })} 
               />
             </div>
           </div>
        )}

        {activeTab === 'tests' && (
          <AssertionsEditor
            assertions={request.assertions || []}
            onChange={(assertions) => handleUpdate({ assertions })}
          />
        )}
      </div>
    </div>
  );
}
