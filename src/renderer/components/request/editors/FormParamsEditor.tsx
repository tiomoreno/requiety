import { useState } from 'react';
import { RequestBodyParam } from '@shared/types';
import { FaPlus, FaTrash, FaFile } from 'react-icons/fa';
import { logger } from '../../../utils/logger';

interface FormParamsEditorProps {
  params: RequestBodyParam[];
  onChange: (params: RequestBodyParam[]) => void;
  allowFiles?: boolean; // Only for form-data
}

export function FormParamsEditor({ params, onChange, allowFiles = false }: FormParamsEditorProps) {
  const [newParam, setNewParam] = useState<RequestBodyParam>({
    name: '',
    value: '',
    enabled: true,
    type: 'text',
  });

  const handleAddParam = () => {
    if (newParam.name.trim()) {
      onChange([...params, { ...newParam }]);
      setNewParam({ name: '', value: '', enabled: true, type: 'text' });
    }
  };

  const handleUpdateParam = (index: number, updates: Partial<RequestBodyParam>) => {
    const updated = [...params];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleDeleteParam = (index: number) => {
    onChange(params.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newParam.name.trim()) {
      handleAddParam();
    }
  };

  const handleFileSelect = async (index: number) => {
    // In Electron, we can use window.api to open file dialog
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).api?.dialog?.showOpenDialog?.({
        properties: ['openFile'],
        filters: [{ name: 'All Files', extensions: ['*'] }],
      });

      if (result && !result.canceled && result.filePaths?.[0]) {
        handleUpdateParam(index, {
          filePath: result.filePaths[0],
          value: result.filePaths[0].split('/').pop() || '',
        });
      }
    } catch (error) {
      logger.error('Error selecting file:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_1fr_80px_32px] gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">
        <div></div>
        <div>Name</div>
        <div>Value</div>
        {allowFiles && <div>Type</div>}
        {!allowFiles && <div></div>}
        <div></div>
      </div>

      {/* Params List */}
      <div className="flex-1 overflow-y-auto">
        {params.map((param, index) => (
          <div
            key={index}
            className="grid grid-cols-[32px_1fr_1fr_80px_32px] gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 items-center"
          >
            {/* Enabled Checkbox */}
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={param.enabled}
                onChange={(e) => handleUpdateParam(index, { enabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
              />
            </div>

            {/* Name */}
            <input
              type="text"
              value={param.name}
              onChange={(e) => handleUpdateParam(index, { name: e.target.value })}
              placeholder="Parameter name"
              className="px-2 py-1 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />

            {/* Value or File Path */}
            {param.type === 'file' ? (
              <button
                onClick={() => handleFileSelect(index)}
                className="flex items-center gap-2 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left truncate"
              >
                <FaFile className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{param.filePath || 'Select file...'}</span>
              </button>
            ) : (
              <input
                type="text"
                value={param.value}
                onChange={(e) => handleUpdateParam(index, { value: e.target.value })}
                placeholder="Value"
                className="px-2 py-1 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            )}

            {/* Type Selector (only for form-data) */}
            {allowFiles ? (
              <select
                value={param.type || 'text'}
                onChange={(e) =>
                  handleUpdateParam(index, { type: e.target.value as 'text' | 'file' })
                }
                className="px-2 py-1 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="text">Text</option>
                <option value="file">File</option>
              </select>
            ) : (
              <div></div>
            )}

            {/* Delete Button */}
            <button
              onClick={() => handleDeleteParam(index)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <FaTrash className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Add New Param Row */}
        <div className="grid grid-cols-[32px_1fr_1fr_80px_32px] gap-2 px-3 py-2 items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={newParam.enabled}
              onChange={(e) => setNewParam({ ...newParam, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
            />
          </div>

          <input
            type="text"
            value={newParam.name}
            onChange={(e) => setNewParam({ ...newParam, name: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Add parameter..."
            className="px-2 py-1 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />

          <input
            type="text"
            value={newParam.value}
            onChange={(e) => setNewParam({ ...newParam, value: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Value"
            className="px-2 py-1 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />

          {allowFiles ? (
            <select
              value={newParam.type || 'text'}
              onChange={(e) =>
                setNewParam({ ...newParam, type: e.target.value as 'text' | 'file' })
              }
              className="px-2 py-1 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="text">Text</option>
              <option value="file">File</option>
            </select>
          ) : (
            <div></div>
          )}

          <button
            onClick={handleAddParam}
            disabled={!newParam.name.trim()}
            className="p-1 text-gray-400 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaPlus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
