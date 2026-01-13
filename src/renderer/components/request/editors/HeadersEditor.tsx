import { RequestHeader } from '../../../../shared/types';
import { useState } from 'react';

interface HeadersEditorProps {
  headers: RequestHeader[];
  onChange: (headers: RequestHeader[]) => void;
}

export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  const handleChange = (index: number, field: keyof RequestHeader, value: string | boolean) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    onChange(newHeaders);
    
    // Auto-add new row if modifying the last empty row
    if (index === newHeaders.length - 1 && (field === 'name' || field === 'value') && value) {
      onChange([...newHeaders, { name: '', value: '', enabled: true }]);
    }
  };

  const handleRemove = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    // Ensure always at least one empty row
    if (newHeaders.length === 0) {
      newHeaders.push({ name: '', value: '', enabled: true });
    }
    onChange(newHeaders);
  };

  // Ensure there's always at least one row to start
  if (headers.length === 0) {
    // We shouldn't mutate props directly, but we can call onChange via useEffect or just render an empty row
    // For a controlled component, it's better if the parent initializes it, but we can handle render logic here.
    // Let's just render an empty row state if props are empty, but safer to let parent/useEffect handle it.
    // Actually, simpler: just map over headers, and if last one isn't empty, showing an "Add" button or logic 
    // is common. Or key-value editors usually have a "ghost" row at the bottom.
  }
  
  // Let's use a "display headers" approach: render existing + 1 empty if not exists
  const displayHeaders = headers.length > 0 ? headers : [{ name: '', value: '', enabled: true }];

  return (
    <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
      <div className="flex bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="w-8 py-2 px-3 text-center"></div>
        <div className="flex-1 py-2 px-3">Key</div>
        <div className="flex-1 py-2 px-3">Value</div>
        <div className="w-8 py-2 px-3"></div>
      </div>
      
      <div className="flex flex-col">
        {displayHeaders.map((header, index) => (
          <div key={index} className="flex border-b border-gray-100 dark:border-gray-800 last:border-0 group">
            {/* Checkbox */}
            <div className="w-8 py-2 px-3 flex items-center justify-center">
              <input
                type="checkbox"
                checked={header.enabled}
                onChange={(e) => handleChange(index, 'enabled', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            
            {/* Key Input */}
            <div className="flex-1 border-r border-gray-100 dark:border-gray-800 relative">
              <input
                type="text"
                value={header.name}
                onChange={(e) => handleChange(index, 'name', e.target.value)}
                placeholder="Key"
                className="w-full py-2 px-3 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
            
            {/* Value Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={header.value}
                onChange={(e) => handleChange(index, 'value', e.target.value)}
                placeholder="Value"
                className="w-full py-2 px-3 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
            
            {/* Delete Button */}
            <div className="w-8 py-2 px-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               {/* Only show delete if it's not the only empty row, or clearer logic: show delete button */}
               <button 
                 onClick={() => handleRemove(index)}
                 className="text-gray-400 hover:text-red-500"
                 title="Remove header"
               >
                 ×
               </button>
            </div>
          </div>
        ))}
        
        {/* If the last row is fully filled, automatically add a draft row logic is handled in handleChange 
            But if we are strictly using displayHeaders initialized above, we need to ensure the update propagates correctly.
            The 'displayHeaders' above only creates a local variable if props are empty. 
            If props are NOT empty, we rely on the parent updating headers via onChange.
            The auto-add logic in handleChange (line 15) handles adding a NEW row to the list when user types in the last one.
            We need to make sure 'index' aligns with 'headers'.
            If 'headers' was empty, 'displayHeaders' has 1 item.
            If user types in it, index 0. We need to call onChange with valid headers array.
        */}
      </div>
    </div>
  );
}
