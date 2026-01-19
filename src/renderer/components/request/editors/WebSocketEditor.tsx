import React, { useState, useEffect, useRef } from 'react';
import { WebSocketMessage } from '@shared/types';
import { CodeEditor } from '../../common/CodeEditor';
import { format } from 'date-fns';

interface WebSocketEditorProps {
  requestId: string;
  url: string;
  onUrlChange: (url: string) => void;
}

export const WebSocketEditor: React.FC<WebSocketEditorProps> = ({
  requestId,
  url,
  onUrlChange,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connected' | 'connecting'
  >('disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [messageToSend, setMessageToSend] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWsEvent = (event: {
      requestId: string;
      type: string;
      data: any;
      timestamp: number;
      id: string;
    }) => {
      if (event.requestId !== requestId) return;

      if (event.type === 'status') {
        setConnectionStatus(event.data);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: event.id,
            type: event.type as WebSocketMessage['type'],
            data: event.data,
            timestamp: event.timestamp,
          },
        ]);
      }
    };

    const unsubscribe = window.api.ws.onEvent(handleWsEvent);
    return () => unsubscribe();
  }, [requestId]);

  useEffect(() => {
    // Auto-scroll to bottom of log
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConnect = () => {
    if (connectionStatus === 'disconnected') {
      setConnectionStatus('connecting');
      setMessages([]);
      window.api.ws.connect(requestId, url);
    }
  };

  const handleDisconnect = () => {
    window.api.ws.disconnect(requestId);
  };

  const handleSendMessage = () => {
    if (messageToSend.trim() && connectionStatus === 'connected') {
      window.api.ws.send(requestId, messageToSend);
      setMessageToSend('');
    }
  };

  const getStatusColor = () => {
    if (connectionStatus === 'connected') return 'text-green-500';
    if (connectionStatus === 'connecting') return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-4 mb-4">
        <span className={`font-bold text-sm uppercase ${getStatusColor()}`}>
          {connectionStatus}
        </span>
        {connectionStatus === 'disconnected' ? (
          <button
            onClick={handleConnect}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Connect
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Disconnect
          </button>
        )}
      </div>

      <div
        ref={logRef}
        className="flex-1 border rounded p-2 mb-4 overflow-y-auto bg-gray-50 dark:bg-gray-800"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-1.5 font-mono text-xs ${
              msg.type === 'incoming'
                ? 'text-blue-600 dark:text-blue-400'
                : msg.type === 'outgoing'
                  ? 'text-green-600 dark:text-green-400'
                  : msg.type === 'error'
                    ? 'text-red-500'
                    : 'text-gray-500'
            }`}
          >
            <span className="font-semibold mr-2">
              {format(msg.timestamp, 'HH:mm:ss')} [{msg.type.toUpperCase()}]
            </span>
            <span>{msg.data}</span>
          </div>
        ))}
      </div>

      <div className="h-32 flex flex-col">
        <div className="flex-1 relative border rounded">
          <CodeEditor value={messageToSend} onChange={setMessageToSend} language="json" />
        </div>
        <button
          onClick={handleSendMessage}
          disabled={connectionStatus !== 'connected'}
          className="mt-2 px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-400"
        >
          Send
        </button>
      </div>
    </div>
  );
};
