import { formatDistanceToNow } from 'date-fns';
import { Response } from '@shared/types';
import { useEffect, useState } from 'react';
import { responseService } from '../../services/response.service';
import { logger } from '../../utils/logger';

interface HistorySidebarProps {
  requestId: string;
  onSelectResponse: (response: Response) => void;
  activeResponseId?: string;
  refreshTrigger?: number; // Prop to trigger refresh when a new response is added
}

export function HistorySidebar({
  requestId,
  onSelectResponse,
  activeResponseId,
  refreshTrigger,
}: HistorySidebarProps) {
  const [history, setHistory] = useState<Response[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [requestId, refreshTrigger]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await responseService.getHistory(requestId);
      setHistory(data);
    } catch (error) {
      logger.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Implementation for deleting specific history item (if API supported it easily, or just ignoring for now)
    // The current API deleteHistory deletes ALL history for a request.
  };

  if (loading && history.length === 0) {
    return <div className="p-4 text-xs text-center text-gray-500">Loading history...</div>;
  }

  if (history.length === 0) {
    return <div className="p-4 text-xs text-center text-gray-500">No history yet</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 w-48">
      <div className="p-2 border-b border-gray-200 dark:border-gray-800 font-semibold text-xs text-gray-500 uppercase">
        History
      </div>
      <div className="flex-1 overflow-auto">
        {history.map((item) => (
          <div
            key={item._id}
            onClick={() => onSelectResponse(item)}
            className={`p-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
              activeResponseId === item._id
                ? 'bg-primary-50 dark:bg-primary-900/10 border-l-2 border-l-primary-600'
                : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-xs font-bold ${
                  item.statusCode >= 200 && item.statusCode < 300
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {item.statusCode}
              </span>
              <span className="text-xs text-gray-400">{item.elapsedTime}ms</span>
            </div>
            <div className="text-[10px] text-gray-400 truncate">
              {formatDistanceToNow(new Date(item.created), { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
