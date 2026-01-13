import type { HttpMethod, Request } from '../../../shared/types';

interface RequestUrlBarProps {
  request: Request;
  loading: boolean;
  onUrlChange: (url: string) => void;
  onMethodChange: (method: HttpMethod) => void;
  onSend: () => void;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export function RequestUrlBar({
  request,
  loading,
  onUrlChange,
  onMethodChange,
  onSend,
}: RequestUrlBarProps) {
  const methodColors: Record<string, string> = {
    GET: 'text-green-600',
    POST: 'text-blue-600',
    PUT: 'text-orange-600',
    DELETE: 'text-red-600',
    PATCH: 'text-purple-600',
  };

  return (
    <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex-1 flex gap-2">
        {/* Method Selector */}
        <div className="relative">
          <select
            value={request.method}
            onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
            disabled={loading}
            className={`h-10 px-3 pr-8 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold ${
              methodColors[request.method] || 'text-gray-700'
            } focus:outline-none focus:ring-2 focus:ring-primary-500`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* URL Input */}
        <input
          type="text"
          value={request.url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Enter request URL"
          disabled={loading}
          className="flex-1 h-10 px-4 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              onSend();
            }
          }}
        />
      </div>

      {/* Send Button */}
      <button
        onClick={onSend}
        disabled={loading || !request.url}
        className={`h-10 px-6 rounded font-semibold text-white transition-all ${
          loading || !request.url
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 shadow-sm'
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending...
          </span>
        ) : (
          'Send'
        )}
      </button>
    </div>
  );
}
