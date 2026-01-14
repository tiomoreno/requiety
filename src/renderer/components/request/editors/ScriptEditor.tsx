import { CodeEditor } from '../../common/CodeEditor';

interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const ScriptEditor = ({ value, onChange }: ScriptEditorProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <CodeEditor
          value={value}
          onChange={onChange}
          language="javascript"
        />
      </div>
      <div className="p-2 text-xs text-gray-500 dark:text-gray-400">
        Available globals: <code>pm.environment</code>, <code>pm.variables</code>, <code>console</code>
      </div>
    </div>
  );
};
