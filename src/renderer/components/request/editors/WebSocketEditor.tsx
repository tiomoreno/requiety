import React, { useState, useEffect, useRef } from 'react';
import { WebSocketMessage } from '../../../../shared/types';
import { CodeEditor } from '../../common/CodeEditor';
import { format } from 'date-fns';

interface WebSocketEditorProps {
  requestId: string;
  url: string;
  onUrlChange: (url: string) => void;
}

export function WebSocketEditor({ requestId, url, onUrlChange }: WebSocketEditorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanup = (window as any).api.ws.onEvent((payload: any) => {
      if (payload.requestId === requestId) {
        if (payload.type === 'status') {
          setIsConnected(payload.data === 'connected');
        } else {
          setMessages(prev => [...prev, payload]);
        }
      }
    });
    return cleanup;
  }, [requestId]);

  const handleConnect = () => {
    console.log('Connect clicked', { requestId, url, isConnected });
    if (isConnected) {
      console.log('Disconnecting...');
      (window as any).api.ws.disconnect(requestId);
    } else {
      if (!url) {
        console.error('URL is empty');
        return;
      }
      console.log('Connecting to', url);
      (window as any).api.ws.connect(requestId, url);
    }
  };

  const handleSend = () => {
    if (!messageInput) return;
    (window as any).api.ws.send(requestId, messageInput);
    setMessageInput('');
  };

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
           <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
           <span className="text-xs text-gray-500 font-mono">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <button
          onClick={handleConnect}
          className={`px-4 py-1.5 text-xs font-medium rounded text-white ${
            isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-4 space-y-2 bg-white dark:bg-gray-900 font-mono text-sm">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            No messages yet. Connect to a server to start.
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.type === 'outgoing' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] rounded p-2 ${
                msg.type === 'outgoing' ? 'bg-blue-100 dark:bg-blue-900' : 
                msg.type === 'incoming' ? 'bg-gray-100 dark:bg-gray-800' :
                msg.type === 'error' ? 'bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800' :
                'bg-yellow-50 dark:bg-yellow-900/30 text-gray-500 italic'
            }`}>
               <div className="text-xs opacity-50 mb-1 flex justify-between gap-4">
                 <span className="uppercase">{msg.type}</span>
                 <span>{format(msg.timestamp, 'HH:mm:ss')}</span>
               </div>
               <div className="break-all whitespace-pre-wrap">{msg.data}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="h-1/4 min-h-[100px] border-t border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
           <span className="text-xs font-medium text-gray-500">Message</span>
           <button 
             onClick={handleSend}
             disabled={!isConnected}
             className="text-xs bg-primary-600 text-white px-3 py-1 rounded disabled:opacity-50"
           >
             Send
           </button>
        </div>
        <div className="flex-1 relative">
           <CodeEditor 
             value={messageInput}
             onChange={setMessageInput}
             language="json" // Defaulting to JSON as it's common
           />
        </div>
      </div>
    </div>
  );
}
