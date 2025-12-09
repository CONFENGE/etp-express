import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignManagerDialog } from './AssignManagerDialog';
import { apiHelpers } from '@/lib/api';

// Mock apiHelpers
vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

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
    vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);
  });

  describe('Rendering', () => {
    it('should render dialog content when open', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
        />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Assign Domain Manager')).toBeInTheDocument();

      // Wait for users to load to avoid act warnings
      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalled();
      });
    });

    it('should not render dialog when closed', () => {
      render(
        <AssignManagerDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should fetch users when dialog opens', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
        />,
      );

      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalledWith(
          `/system-admin/domains/${mockDomainId}/users`,
        );
      });
    });

    it('should show message when no users available', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue([]);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('No users available in this domain'),
        ).toBeInTheDocument();
      });
    });

    it('should show dialog description', async () => {
      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
        />,
      );

      expect(
        screen.getByText(/Select a user to manage this domain/),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalled();
      });
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
        />,
      );

      // Wait for users to load
      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalled();
      });

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
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeInTheDocument();

      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalled();
      });
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
        />,
      );

      // Wait for users to load
      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalled();
      });

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Error Handling', () => {
    it('should show error message when user fetch fails', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Network error'));

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId={mockDomainId}
          onAssign={mockOnAssign}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
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
        />,
      );

      expect(screen.getByText('Manager')).toBeInTheDocument();

      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalled();
      });
    });
  });

  // Note: Tests that interact with Radix UI Select are skipped until #533 (PointerEvent mocks) is resolved
  // The following tests would require PointerEvent mocks:
  // - should call onAssign with selected user id
  // - should close dialog after successful assignment
  // - should show loading state while assigning
  // - should pre-select current manager if provided
});
