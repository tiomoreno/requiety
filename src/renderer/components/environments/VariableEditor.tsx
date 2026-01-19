import { Variable } from '@shared/types';

export interface DraftVariable {
  _id?: string; // present if existing
  key: string;
  value: string;
  isSecret: boolean;
  environmentId: string;
}

interface VariableEditorProps {
  variables: DraftVariable[];
  onChange: (index: number, field: keyof DraftVariable, value: any) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

export function VariableEditor({ variables, onChange, onRemove, onAdd }: VariableEditorProps) {
  return (
    <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
      <div className="flex bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="flex-1 py-2 px-3">Variable</div>
        <div className="flex-1 py-2 px-3">Value</div>
        <div className="w-8 py-2 px-3 text-center" title="Is Secret?">
          🔒
        </div>
        <div className="w-8 py-2 px-3"></div>
      </div>

      <div className="flex flex-col">
        {variables.map((variable, index) => (
          <div
            key={index}
            className="flex border-b border-gray-100 dark:border-gray-800 last:border-0 group"
          >
            {/* Key Input */}
            <div className="flex-1 border-r border-gray-100 dark:border-gray-800 relative">
              <input
                type="text"
                value={variable.key}
                onChange={(e) => onChange(index, 'key', e.target.value)}
                placeholder="Variable Name"
                className="w-full py-2 px-3 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            {/* Value Input */}
            <div className="flex-1 border-r border-gray-100 dark:border-gray-800 relative">
              <input
                type={variable.isSecret ? 'password' : 'text'}
                value={variable.value}
                onChange={(e) => onChange(index, 'value', e.target.value)}
                placeholder="Value"
                className="w-full py-2 px-3 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            {/* Secret Toggle */}
            <div className="w-8 py-2 px-3 flex items-center justify-center border-r border-gray-100 dark:border-gray-800">
              <input
                type="checkbox"
                checked={variable.isSecret}
                onChange={(e) => onChange(index, 'isSecret', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            {/* Delete Button */}
            <div className="w-8 py-2 px-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onRemove(index)}
                className="text-gray-400 hover:text-red-500"
                title="Remove variable"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {/* Add Row Button (or just empty row? Let's use simple Add button at bottom or auto-add) */}
      </div>
      <button
        onClick={onAdd}
        className="self-start m-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
      >
        + Add Variable
      </button>
    </div>
  );
}
