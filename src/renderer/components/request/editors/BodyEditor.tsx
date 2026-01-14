import { RequestBody, BodyType, RequestHeader } from '../../../../shared/types';
import { CodeEditor } from '../../common/CodeEditor';
import { GraphQLEditor } from './GraphQLEditor';

interface BodyEditorProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
  url: string;
  headers: RequestHeader[];
}

export function BodyEditor({ body, onChange, url, headers }: BodyEditorProps) {
  const handleTypeChange = (type: BodyType) => {
    onChange({ ...body, type });
  };

  const handleContentChange = (text: string) => {
    onChange({ ...body, text });
  };

  const handleGraphQLChange = (query: string, variables: string) => {
     onChange({
       ...body,
       graphql: { query, variables }
     });
  };
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
           <label className="text-xs font-semibold text-gray-500 uppercase">Body Type:</label>
           <select
             value={body.type}
             onChange={(e) => handleTypeChange(e.target.value as BodyType)}
             className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
           >
             <option value="none">None</option>
             <option value="json">JSON</option>
             <option value="raw">Text (Raw)</option>
             <option value="graphql">GraphQL</option>
             {/* <option value="form-urlencoded">Form URL Encoded</option> */}
             {/* <option value="form-data">Multipart Form</option> */}
           </select>
        </div>
        
      </div>

      {/* Editor Area */}
      {body.type === 'none' ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No body
        </div>
      ) : body.type === 'json' ? (
        <div className="flex-1 relative border-t border-gray-200 dark:border-gray-800">
           <CodeEditor
             value={body.text || ''}
             onChange={handleContentChange}
             language="json"
           />
        </div>
      ) : body.type === 'graphql' ? (
        <div className="flex-1 relative border-t border-gray-200 dark:border-gray-800">
           <GraphQLEditor
             query={body.graphql?.query || ''}
             variables={body.graphql?.variables || ''}
             url={url}
             headers={headers}
             onChange={handleGraphQLChange} 
           />
        </div>
      ) : (
        <div className="flex-1 relative">
          <textarea
            value={body.text || ''}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none bg-transparent text-gray-800 dark:text-gray-200"
            placeholder="Enter text body..."
          />
        </div>
      )}
    </div>
  );
}
