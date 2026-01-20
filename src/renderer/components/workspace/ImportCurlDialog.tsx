import { useState } from 'react';
import { Dialog } from '../common/Dialog';
import { Button } from '../common/Button';

interface ImportCurlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (curlCommand: string) => Promise<void>;
}

export const ImportCurlDialog = ({ isOpen, onClose, onImport }: ImportCurlDialogProps) => {
  const [curlCommand, setCurlCommand] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!curlCommand.trim()) {
      setError('Please paste a cURL command');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onImport(curlCommand);
      setCurlCommand('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import cURL command');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurlCommand('');
    setError(null);
    onClose();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCurlCommand(text);
      setError(null);
    } catch {
      setError('Failed to read clipboard. Please paste manually.');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Import from cURL" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Paste a cURL command to create a new request. You can copy cURL commands from browser
          DevTools or API documentation.
        </p>

        <div className="relative">
          <textarea
            value={curlCommand}
            onChange={(e) => {
              setCurlCommand(e.target.value);
              setError(null);
            }}
            placeholder={`curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer token123" \\
  -d '{"name": "John", "email": "john@example.com"}'`}
            className="w-full h-48 px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none"
            spellCheck={false}
          />
          <button
            onClick={handlePaste}
            className="absolute top-2 right-2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded transition-colors"
            title="Paste from clipboard"
          >
            Paste
          </button>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleImport} loading={loading}>
            Import
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
