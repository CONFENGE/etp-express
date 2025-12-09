import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignManagerDialog } from './AssignManagerDialog';
import { apiHelpers } from '@/lib/api';
import { useAdminStore } from '@/store/adminStore';
import type { User } from '@/types/user';

vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
  },
}));

vi.mock('@/store/adminStore', () => ({
  useAdminStore: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'user',
  },
  {
    id: 'user-2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    role: 'domain_manager',
  },
];

describe('AssignManagerDialog', () => {
  const mockAssignManager = vi.fn();
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  // Store pending promise resolvers for cleanup to prevent test hangs
  let pendingResolvers: Array<(value: unknown) => void> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    pendingResolvers = [];
    vi.mocked(useAdminStore).mockReturnValue({
      assignManager: mockAssignManager,
    } as ReturnType<typeof useAdminStore>);
  });

  afterEach(() => {
    // Resolve any pending promises to prevent test runner hangs
    pendingResolvers.forEach((resolve) => resolve(undefined));
    pendingResolvers = [];
  });

  describe('Rendering', () => {
    it('should render dialog content when open', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Assign Domain Manager')).toBeInTheDocument();
      expect(screen.getByText('Select Manager')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <AssignManagerDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show loading skeleton while fetching users', async () => {
      // Use pending promise with cleanup in afterEach to prevent test hangs
      vi.mocked(apiHelpers.get).mockImplementation(
        () =>
          new Promise((resolve) => {
            pendingResolvers.push(resolve as (value: unknown) => void);
          }),
      );

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Promise cleanup happens in afterEach
    });

    it('should show message when no users in domain', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue([]);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('No users found in this domain.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('User Selection', () => {
    it('should fetch users when dialog opens', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalledWith(
          '/system-admin/domains/domain-1/users',
        );
      });
    });

    it('should pre-select current manager if provided', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
          currentManagerId="user-2"
        />,
      );

      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalled();
      });
    });

    it('should display users in select dropdown', async () => {
      const user = userEvent.setup();
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(
          screen.getByText('John Doe (john@example.com)'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Jane Smith (jane@example.com)'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Submission', () => {
    it('should call assignManager with selected user', async () => {
      const user = userEvent.setup();
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);
      mockAssignManager.mockResolvedValue(undefined);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
          onSuccess={mockOnSuccess}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(
          screen.getByText('John Doe (john@example.com)'),
        ).toBeInTheDocument();
      });

      const userOption = screen.getByText('John Doe (john@example.com)');
      await user.click(userOption);

      const submitButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAssignManager).toHaveBeenCalledWith('domain-1', 'user-1');
      });
    });

    it('should close dialog after successful submission', async () => {
      const user = userEvent.setup();
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);
      mockAssignManager.mockResolvedValue(undefined);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(
          screen.getByText('John Doe (john@example.com)'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe (john@example.com)'));

      const submitButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should call onSuccess callback after successful assignment', async () => {
      const user = userEvent.setup();
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);
      mockAssignManager.mockResolvedValue(undefined);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
          onSuccess={mockOnSuccess}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(
          screen.getByText('John Doe (john@example.com)'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe (john@example.com)'));

      const submitButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should disable button when no user selected', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state while assigning', async () => {
      const user = userEvent.setup();
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);
      // Use pending promise with cleanup in afterEach to prevent test hangs
      mockAssignManager.mockImplementation(
        () =>
          new Promise((resolve) => {
            pendingResolvers.push(resolve as (value: unknown) => void);
          }),
      );

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(
          screen.getByText('John Doe (john@example.com)'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe (john@example.com)'));

      const submitButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Assigning...')).toBeInTheDocument();
      });
      // Promise cleanup happens in afterEach
    });
  });

  describe('Cancel', () => {
    it('should call onOpenChange with false when cancel clicked', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle API error when fetching users', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Network error'));

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('No users found in this domain.'),
        ).toBeInTheDocument();
      });
    });

    it('should handle error when assigning manager fails', async () => {
      const user = userEvent.setup();
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);
      mockAssignManager.mockRejectedValue(new Error('Assignment failed'));

      render(
        <AssignManagerDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          domainId="domain-1"
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(
          screen.getByText('John Doe (john@example.com)'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe (john@example.com)'));

      const submitButton = screen.getByRole('button', {
        name: 'Assign Manager',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
      });
    });
  });
});
