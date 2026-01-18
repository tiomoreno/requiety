// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportCurlDialog } from './ImportCurlDialog';

describe('ImportCurlDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnImport.mockResolvedValue(undefined);
  });

  const renderDialog = (isOpen = true) => {
    return render(
      <ImportCurlDialog
        isOpen={isOpen}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );
  };

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      renderDialog();

      expect(screen.getByText('Import from cURL')).toBeTruthy();
      expect(screen.getByPlaceholderText(/curl -X POST/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy();
    });

    it('should not render when isOpen is false', () => {
      renderDialog(false);
      expect(screen.queryByText('Import from cURL')).toBeNull();
    });

    it('should render description text', () => {
      renderDialog();
      expect(
        screen.getByText(/Paste a cURL command to create a new request/)
      ).toBeTruthy();
    });

    it('should render paste button', () => {
      renderDialog();
      expect(screen.getByTitle('Paste from clipboard')).toBeTruthy();
    });
  });

  describe('user interactions', () => {
    it('should update textarea value on input', async () => {
      const user = userEvent.setup();
      renderDialog();

      const textarea = screen.getByPlaceholderText(/curl -X POST/) as HTMLTextAreaElement;
      await user.type(textarea, 'curl https://api.example.com');

      expect(textarea.value).toBe('curl https://api.example.com');
    });

    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when X button is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      const closeButton = screen.getByRole('button', { name: 'Close dialog' });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show error when importing empty command', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Import' }));

      expect(screen.getByText('Please paste a cURL command')).toBeTruthy();
      expect(mockOnImport).not.toHaveBeenCalled();
    });
  });

  describe('import functionality', () => {
    it('should call onImport with cURL command on import', async () => {
      const user = userEvent.setup();
      renderDialog();

      const curlCommand = 'curl https://api.example.com';
      const textarea = screen.getByPlaceholderText(/curl -X POST/);
      await user.type(textarea, curlCommand);
      await user.click(screen.getByRole('button', { name: 'Import' }));

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(curlCommand);
      });
    });

    it('should close dialog after successful import', async () => {
      const user = userEvent.setup();
      renderDialog();

      const textarea = screen.getByPlaceholderText(/curl -X POST/);
      await user.type(textarea, 'curl https://api.example.com');
      await user.click(screen.getByRole('button', { name: 'Import' }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error message on import failure', async () => {
      const user = userEvent.setup();
      mockOnImport.mockRejectedValueOnce(new Error('Invalid cURL command'));
      renderDialog();

      const textarea = screen.getByPlaceholderText(/curl -X POST/);
      await user.type(textarea, 'curl');
      await user.click(screen.getByRole('button', { name: 'Import' }));

      await waitFor(() => {
        expect(screen.getByText('Invalid cURL command')).toBeTruthy();
      });
    });

    it('should not close dialog on import failure', async () => {
      const user = userEvent.setup();
      mockOnImport.mockRejectedValueOnce(new Error('Failed'));
      renderDialog();

      const textarea = screen.getByPlaceholderText(/curl -X POST/);
      await user.type(textarea, 'curl https://example.com');
      await user.click(screen.getByRole('button', { name: 'Import' }));

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeTruthy();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('error clearing', () => {
    it('should clear error when typing in textarea', async () => {
      const user = userEvent.setup();
      renderDialog();

      // First, trigger validation error
      await user.click(screen.getByRole('button', { name: 'Import' }));
      expect(screen.getByText('Please paste a cURL command')).toBeTruthy();

      // Then type something
      const textarea = screen.getByPlaceholderText(/curl -X POST/);
      await user.type(textarea, 'c');

      // Error should be cleared
      expect(screen.queryByText('Please paste a cURL command')).toBeNull();
    });
  });
});
