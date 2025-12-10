import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteUserDialog } from './DeleteUserDialog';
import { DomainUser } from '@/store/managerStore';

const mockUser: DomainUser = {
  id: '1',
  email: 'john@example.com',
  name: 'John Doe',
  cargo: 'Software Engineer',
  isActive: true,
  mustChangePassword: false,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('DeleteUserDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog content when open with user', () => {
      render(
        <DeleteUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
          isDeleting={false}
        />,
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      // Title and button both say "Delete User", so check heading specifically
      expect(
        screen.getByRole('heading', { name: 'Delete User' }),
      ).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <DeleteUserDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
          isDeleting={false}
        />,
      );

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should not render dialog when user is null', () => {
      render(
        <DeleteUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          user={null}
          onConfirm={mockOnConfirm}
          isDeleting={false}
        />,
      );

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onConfirm when delete button clicked', async () => {
      mockOnConfirm.mockResolvedValue(undefined);

      render(
        <DeleteUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
          isDeleting={false}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: 'Delete User' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });

    it('should call onOpenChange with false when cancel clicked', () => {
      render(
        <DeleteUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
          isDeleting={false}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Loading state', () => {
    it('should show loading text when deleting', () => {
      render(
        <DeleteUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
          isDeleting={true}
        />,
      );

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should disable buttons when deleting', () => {
      render(
        <DeleteUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
          isDeleting={true}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: 'Deleting...' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      expect(deleteButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });
});
