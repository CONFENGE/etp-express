import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignManagerDialog } from './AssignManagerDialog';
import { createDeferredPromise } from '@/test/setup';

const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user' as const,
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'admin' as const,
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    role: 'user' as const,
  },
];

describe('AssignManagerDialog', () => {
  const mockOnAssign = vi.fn();
  const mockOnOpenChange = vi.fn();
  const mockDomainId = 'domain-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog content when open', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Assign Domain Manager')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <AssignManagerDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show message when no users available', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={[]}
        />,
      );

      expect(
        screen.getByText('No users available in this domain'),
      ).toBeInTheDocument();
    });

    it('should show dialog description', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      expect(
        screen.getByText(/Select a user to manage this domain/),
      ).toBeInTheDocument();
    });
  });

  describe('Buttons', () => {
    it('should disable assign button when no user selected', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      const assignButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      expect(assignButton).toBeDisabled();
    });

    it('should have cancel button', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('Cancel', () => {
    it('should call onOpenChange with false when cancel clicked', async () => {
      const user = userEvent.setup();

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Manager Label', () => {
    it('should have manager label', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      expect(screen.getByText('Manager')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state while assigning', async () => {
      const user = userEvent.setup();
      const { promise, resolve } = createDeferredPromise<void>();
      const slowOnAssign = vi.fn().mockReturnValue(promise);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={slowOnAssign}
          users={mockUsers}
        />,
      );

      // Open select and choose a user
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const option = screen.getByRole('option', { name: /John Doe/i });
      await user.click(option);

      // Click assign button
      const assignButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      await user.click(assignButton);

      // Should show loading text
      expect(
        screen.getByRole('button', { name: 'Assigning...' }),
      ).toBeInTheDocument();

      // Resolve to complete and cleanup
      resolve();

      await waitFor(() => {
        expect(slowOnAssign).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('User Selection and Assignment', () => {
    it('should call onAssign with selected user id', async () => {
      const user = userEvent.setup();
      mockOnAssign.mockResolvedValue(undefined);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      // Open select and choose a user
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const option = screen.getByRole('option', { name: /Jane Smith/i });
      await user.click(option);

      // Assign button should now be enabled
      const assignButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      expect(assignButton).not.toBeDisabled();

      await user.click(assignButton);

      // Should call onAssign with selected user id
      expect(mockOnAssign).toHaveBeenCalledWith('2');
    });

    it('should close dialog after successful assignment', async () => {
      const user = userEvent.setup();
      mockOnAssign.mockResolvedValue(undefined);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      // Select a user
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const option = screen.getByRole('option', { name: /John Doe/i });
      await user.click(option);

      // Click assign
      const assignButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      await user.click(assignButton);

      // Should close dialog after successful assignment
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should pre-select current manager if provided', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          currentManagerId="2"
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      // The select should show the current manager's name
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveTextContent(/Jane Smith/i);
      });
    });

    it('should enable assign button when user is selected', async () => {
      const user = userEvent.setup();

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
          users={mockUsers}
        />,
      );

      // Initially disabled
      const assignButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      expect(assignButton).toBeDisabled();

      // Select a user
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const option = screen.getByRole('option', { name: /Bob Wilson/i });
      await user.click(option);

      // Now enabled
      expect(assignButton).not.toBeDisabled();
    });
  });
});
