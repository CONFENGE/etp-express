import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateDomainDialog } from './CreateDomainDialog';

describe('CreateDomainDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog content when open', () => {
      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Domain')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Users')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <CreateDomainDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should have default value for maxUsers', () => {
      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const maxUsersInput = screen.getByLabelText('Max Users');
      expect(maxUsersInput).toHaveValue(10);
    });
  });

  describe('Validation', () => {
    it('should show error for invalid domain format', async () => {
      const user = userEvent.setup();

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domain');
      await user.type(domainInput, 'invalid');

      const submitButton = screen.getByRole('button', {
        name: 'Create Domain',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid domain (e.g., example.com)'),
        ).toBeInTheDocument();
      });
    });

    it('should show error for domain too short', async () => {
      const user = userEvent.setup();

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domain');
      await user.type(domainInput, 'ab');

      const submitButton = screen.getByRole('button', {
        name: 'Create Domain',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Domain must be at least 3 characters'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domain');
      const maxUsersInput = screen.getByLabelText('Max Users');

      await user.type(domainInput, 'example.com');
      await user.clear(maxUsersInput);
      await user.type(maxUsersInput, '50');

      const submitButton = screen.getByRole('button', {
        name: 'Create Domain',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          domain: 'example.com',
          maxUsers: 50,
        });
      });
    });

    it('should close dialog after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domain');
      await user.type(domainInput, 'example.com');

      const submitButton = screen.getByRole('button', {
        name: 'Create Domain',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should show loading state while submitting', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domain');
      await user.type(domainInput, 'example.com');

      const submitButton = screen.getByRole('button', {
        name: 'Create Domain',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel', () => {
    it('should call onOpenChange with false when cancel clicked', () => {
      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
