import { useState } from 'react';
import { Request, Response } from '../../../shared/types';
import { requestService } from '../../services/request.service';
import { responseService } from '../../services/response.service';
import { RequestUrlBar } from './RequestUrlBar';
import { RequestTabs } from './RequestTabs';
import { ResponseTabs } from '../response/ResponseTabs';
import { HistorySidebar } from './HistorySidebar';

interface RequestPanelProps {
  request: Request;
  onRequestUpdate: (updatedRequest: Request) => void;
}

export function RequestPanel({ request, onRequestUpdate }: RequestPanelProps) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshHistoryCount, setRefreshHistoryCount] = useState(0);

  const handleHistorySelect = async (selected: Response) => {
    try {
      // If the selected response doesn't have a body loaded (it's from history list usually lightweight)
      // We should fetch the full details including body from disk
      const fullResponseData = await responseService.getById(selected._id);
      setResponse({
        ...fullResponseData.response,
        body: fullResponseData.body 
      });
    } catch (err) {
      console.error('Failed to load history item:', err);
    }
  };

  const handleSend = async () => {
    if (!request.url) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Save changes before sending
      await requestService.update(request._id, {
        url: request.url,
        method: request.method,
      });

      const result = await requestService.send(request._id);
      setResponse(result);
      setRefreshHistoryCount(prev => prev + 1); // Trigger history refresh
    } catch (err) {
      console.error('Failed to send request:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (url: string) => {
    // Optimistic update for UI responsiveness
    onRequestUpdate({ ...request, url });
    // Debounce save or save on blur could be better, but for MVP saving on send is okay 
    // or we can autosave. Let's start with just updating parent state and saving on Send.
    // Ideally we should persist to DB on change (debounced).
    // For now we trust the parent to handle state, and we do partial updates via service on blur or debounced.
    // But to keep it simple for MVP: We update local state via prop callback, and save on Send.
    
    // Actually, let's just trigger a service update to ensure it persists if user switches tabs
    // This might be too many IPC calls without debounce. 
    // Let's implement a simple debounce here? Or just update parent prop and let parent handle persistence?
    // Given the architecture, let's keep it simple: update parent state, parent might save.
    // For "Implementing", let's assume `onRequestUpdate` persists it.
    
    // Wait, the parent (likely App or a Workspace container) holds the state.
    // Let's update the specific fields.
    
    requestService.update(request._id, { url });
  };

  const handleMethodChange = (method: Request['method']) => {
    onRequestUpdate({ ...request, method });
    requestService.update(request._id, { method });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <RequestUrlBar
        request={request}
        loading={loading}
        onUrlChange={handleUrlChange}
        onMethodChange={handleMethodChange}
        onSend={handleSend}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Request Tabs */}
        <div className="h-1/2 border-b border-gray-200 dark:border-gray-800">
           <RequestTabs 
             request={request} 
             onRequestUpdate={onRequestUpdate} 
           />
        </div>

        {/* Response Section */}
        <div className="h-1/2 bg-gray-50 dark:bg-gray-950 flex flex-col">
          {loading && (
             <div className="flex items-center justify-center h-full text-gray-500">
               Sending request...
             </div>
          )}
          
          {error && (
            <div className="p-4 text-red-600 bg-red-50 dark:bg-red-900/10 h-full overflow-auto">
              Error: {error}
            </div>
          )}

          {response && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Response Status Bar */}
              <div className="flex items-center justify-between p-2 pl-4 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-sm">
                <div className="flex gap-4">
                  <span className={`font-bold ${response.statusCode >= 200 && response.statusCode < 300 ? 'text-green-600' : 'text-red-600'}`}>
                    {response.statusCode} {response.statusMessage}
                  </span>
                  <span className="text-gray-500">{response.elapsedTime}ms</span>
                </div>
                
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-800 ${showHistory ? 'text-primary-600 font-medium' : 'text-gray-500'}`}
                >
                  ⏱ History
                </button>
              </div>
              
              {/* Response Content & History Split */}
              <div className="flex-1 flex overflow-hidden">
                 <div className="flex-1 overflow-hidden">
                    <ResponseTabs response={response} />
                 </div>
                 
                 {showHistory && (
                   <HistorySidebar 
                     requestId={request._id}
                     activeResponseId={response._id}
                     refreshTrigger={refreshHistoryCount}
                     onSelectResponse={handleHistorySelect}
                   />
                 )}
              </div>
            </div>
          )}
          
          {!loading && !response && !error && (
            <div className="flex flex-col h-full"> 
               {/* Empty state, but lets show history sidebar if user wants to see past ones? 
                   For now, keep it simple. If no active response, user can't toggle history.
                   Wait, typically you want to see history even if no CURRENT response is loaded.
                   But for MVP, let's stick to "Send -> See Result". 
                   Actually, let's allow opening history even if no response.
               */}
               <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  <div className="text-center">
                    <p>Enter a URL and click Send</p>
                    <button 
                      onClick={() => setShowHistory(!showHistory)}
                      className="mt-2 text-xs text-primary-600 hover:underline"
                    >
                      {showHistory ? 'Hide History' : 'Show History'}
                    </button>
                  </div>
               </div>
               
               {showHistory && (
                 <div className="h-full border-l border-gray-200 dark:border-gray-800 w-48 absolute right-0 top-1/2 bottom-0 bg-white">
                    {/* Absolute positioning is tricky here. Let's restructure current block if we want this.
                        For now, let's just stick to the simplistic logic: response needed or empty state.
                        I'll just add the history sidebar to the empty state container if showHistory is true.
                    */}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
