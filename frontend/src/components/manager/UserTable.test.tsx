import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { UserTable } from './UserTable';
import { DomainUser } from '@/store/managerStore';

const mockUsers: DomainUser[] = [
  {
    id: '1',
    email: 'john@example.com',
    name: 'John Doe',
    cargo: 'Software Engineer',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-06-01T10:00:00Z',
  },
  {
    id: '2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    cargo: 'Product Manager',
    isActive: false,
    mustChangePassword: true,
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: '3',
    email: 'bob@example.com',
    name: 'Bob Wilson',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2024-03-20T00:00:00Z',
  },
];

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('UserTable', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnToggleActive = vi.fn();
  const mockOnResetPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render table headers', () => {
      renderWithRouter(
        <UserTable
          users={mockUsers}
          loading={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      expect(screen.getByText('Nome')).toBeInTheDocument();
      expect(screen.getByText('E-mail')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });

    it('should render user data correctly', () => {
      renderWithRouter(
        <UserTable
          users={mockUsers}
          loading={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('should show "Não definido" for users without cargo', () => {
      renderWithRouter(
        <UserTable
          users={mockUsers}
          loading={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      expect(screen.getByText('Não definido')).toBeInTheDocument();
    });

    it('should show correct status badges', () => {
      renderWithRouter(
        <UserTable
          users={mockUsers}
          loading={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      // Two active users
      const activeBadges = screen.getAllByText('Ativo');
      expect(activeBadges.length).toBe(2);

      // One inactive user
      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });

    it('should show pending setup badge for users who must change password', () => {
      renderWithRouter(
        <UserTable
          users={mockUsers}
          loading={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });

    it('should display user initials as avatar', () => {
      renderWithRouter(
        <UserTable
          users={mockUsers}
          loading={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe
      expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
      expect(screen.getByText('BW')).toBeInTheDocument(); // Bob Wilson
    });
  });

  describe('Loading state', () => {
    it('should show skeleton when loading', () => {
      const { container } = renderWithRouter(
        <UserTable
          users={[]}
          loading={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty state', () => {
    it('should show empty message when no users', () => {
      renderWithRouter(
        <UserTable
          users={[]}
          loading={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      expect(
        screen.getByText('Nenhum usuário no seu domínio ainda.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Adicione seu primeiro usuário para começar.'),
      ).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should have action buttons for each user', () => {
      renderWithRouter(
        <UserTable
          users={mockUsers}
          loading={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      const actionButtons = screen.getAllByRole('button', {
        name: /actions for/i,
      });
      expect(actionButtons.length).toBe(mockUsers.length);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels on action buttons', () => {
      renderWithRouter(
        <UserTable
          users={mockUsers}
          loading={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleActive={mockOnToggleActive}
          onResetPassword={mockOnResetPassword}
        />,
      );

      expect(
        screen.getByRole('button', { name: 'Actions for John Doe' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Actions for Jane Smith' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Actions for Bob Wilson' }),
      ).toBeInTheDocument();
    });
  });
});
