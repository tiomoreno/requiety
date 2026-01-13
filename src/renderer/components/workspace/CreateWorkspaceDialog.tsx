import { useState, FormEvent } from 'react';
import { Dialog } from '../common/Dialog';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useWorkspaces } from '../../hooks/useWorkspaces';

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWorkspaceDialog = ({
  isOpen,
  onClose,
}: CreateWorkspaceDialogProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { createWorkspace } = useWorkspaces();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    try {
      setLoading(true);
      await createWorkspace(name.trim());
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Create Workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Workspace Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My API Project"
          error={error}
          autoFocus
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
