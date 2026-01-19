import { ResponseHeader } from '@shared/types';

interface ResponseHeadersProps {
  headers: ResponseHeader[];
}

export function ResponseHeaders({ headers }: ResponseHeadersProps) {
  if (!headers || headers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm p-4">
        No headers available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="grid grid-cols-12 gap-0 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 uppercase">
        <div className="col-span-4 py-2 px-3 border-r border-gray-200 dark:border-gray-800">
          Key
        </div>
        <div className="col-span-8 py-2 px-3">Value</div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {headers.map((header, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-0 text-sm group hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div className="col-span-4 py-2 px-3 font-medium text-gray-700 dark:text-gray-300 break-all border-r border-gray-100 dark:border-gray-800">
              {header.name}
            </div>
            <div className="col-span-8 py-2 px-3 text-gray-600 dark:text-gray-400 break-all font-mono text-xs">
              {header.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
