import React, { useState } from 'react';
import { buildClientSchema } from 'graphql';
import { CodeEditor } from '../../common/CodeEditor';
import { RequestHeader } from '../../../../shared/types';

interface GraphQLEditorProps {
  query: string;
  variables: string;
  url: string;
  headers: RequestHeader[];
  onChange: (query: string, variables: string) => void;
}

export function GraphQLEditor({ query, variables, url, headers, onChange }: GraphQLEditorProps) {
  const [showVariables, setShowVariables] = useState(true);
  const [schema, setSchema] = useState<any>(null); // GraphQLSchema type
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleQueryChange = (newQuery: string) => {
    onChange(newQuery, variables);
  };

  const handleVariablesChange = (newVariables: string) => {
    onChange(query, newVariables);
  };

  const handleRefreshSchema = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      // Prepare headers object
      const headerObj: Record<string, string> = {};
      headers.forEach(h => {
        if (h.enabled && h.name) {
          if (h.isAuto && h.name === 'Host' && h.value.includes('<calculated')) {
             try {
               const urlObj = new URL(url);
               headerObj[h.name] = urlObj.host;
             } catch (e) {
               // Invalid URL, skip host calculation or let it fail naturally later
             }
          } else {
            headerObj[h.name] = h.value;
          }
        }
      });

      const result = await window.api.graphql.introspect(url, headerObj);
      
      if (result.success && result.data) {
        // buildClientSchema expects the 'data' property of the introspection result
        // result.data is the full JSON response: { data: { __schema: ... } }
        const introspectionWithData = result.data.data ? result.data.data : result.data;
        const clientSchema = buildClientSchema(introspectionWithData);
        setSchema(clientSchema);
        setMessage({ text: 'Schema loaded', type: 'success' });
      } else {
        throw new Error(result.error || 'Failed to fetch schema');
      }
    } catch (error) {
      console.error('Introspection error:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Error loading schema', 
        type: 'error' 
      });
      setSchema(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row h-full border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      {/* Query Section */}
      <div className={`flex flex-col min-w-0 h-full ${showVariables ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'flex-1'}`}>
        <div className="flex items-center justify-between px-3 py-1 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase">Query</span>
            <button 
               onClick={handleRefreshSchema}
               disabled={isLoading || !url}
               className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                 isLoading 
                   ? 'bg-gray-100 text-gray-400 border-gray-200' 
                   : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
               }`}
               title="Refresh Schema"
            >
              {isLoading ? 'Loading...' : 'Refresh Schema'}
            </button>
            {message && (
              <span className={`text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {message.text}
              </span>
            )}
          </div>
          <button 
            onClick={() => setShowVariables(!showVariables)}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            {showVariables ? 'Hide Variables' : 'Show Variables'}
          </button>
        </div>
        <div className="flex-1 relative">
           <CodeEditor 
             value={query} 
             onChange={handleQueryChange} 
             language="graphql" 
             schema={schema}
           />
        </div>
      </div>

      {/* Variables Section */}
      {showVariables && (
        <div className="w-1/2 flex flex-col min-w-0 h-full">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-[29px] flex items-center">
            <span className="text-xs font-medium text-gray-500 uppercase">GraphQL Variables</span>
          </div>
          <div className="flex-1 relative">
            <CodeEditor value={variables} onChange={handleVariablesChange} language="json" />
          </div>
        </div>
      )}
    </div>
  );
}
