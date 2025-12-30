import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { ManagerDashboard } from './ManagerDashboard';
import { useManagerStore, DomainUser, QuotaInfo } from '@/store/managerStore';

// Mock the managerStore
vi.mock('@/store/managerStore', async () => {
  const actual = await vi.importActual('@/store/managerStore');
  return {
    ...actual,
    useManagerStore: vi.fn(),
  };
});

describe('ManagerDashboard', () => {
  const mockQuota: QuotaInfo = {
    currentUsers: 5,
    maxUsers: 10,
    available: 5,
    percentUsed: 50,
  };

  const mockUsers: DomainUser[] = [
    {
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      cargo: 'Developer',
      isActive: true,
      mustChangePassword: false,
      createdAt: '2024-03-15T10:00:00Z',
      lastLoginAt: '2024-03-20T14:30:00Z',
    },
    {
      id: 'user-2',
      email: 'jane@example.com',
      name: 'Jane Smith',
      cargo: 'Designer',
      isActive: true,
      mustChangePassword: true,
      createdAt: '2024-03-10T09:00:00Z',
    },
    {
      id: 'user-3',
      email: 'bob@example.com',
      name: 'Bob Wilson',
      isActive: false,
      mustChangePassword: false,
      createdAt: '2024-02-01T08:00:00Z',
    },
  ];

  const mockFetchUsers = vi.fn();
  const mockFetchQuota = vi.fn();

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Header', () => {
    it('should render the header with title and description', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(screen.getByText('Gestor de Domínio')).toBeInTheDocument();
      expect(
        screen.getByText('Gerencie os usuários do seu domínio'),
      ).toBeInTheDocument();
    });

    it('should have a Manage Users button linking to /manager/users', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      const manageButton = screen.getByRole('link', {
        name: /gerenciar usuários/i,
      });
      expect(manageButton).toBeInTheDocument();
      expect(manageButton).toHaveAttribute('href', '/manager/users');
    });
  });

  describe('Quota Card', () => {
    it('should render User Quota card', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(screen.getByText('Cota de Usuários')).toBeInTheDocument();
      expect(
        screen.getByText('Uso da capacidade do domínio'),
      ).toBeInTheDocument();
    });

    it('should display quota values in QuotaIndicator', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('/ 10')).toBeInTheDocument();
      expect(screen.getByText('50% utilizado')).toBeInTheDocument();
    });
  });

  describe('Statistics Cards', () => {
    it('should render all 4 statistics cards', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(screen.getByText('Total de Usuários')).toBeInTheDocument();
      expect(screen.getByText('Usuários Ativos')).toBeInTheDocument();
      expect(screen.getByText('Usuários Inativos')).toBeInTheDocument();
      expect(screen.getByText('Pendente Setup')).toBeInTheDocument();
    });

    it('should calculate and display correct statistics', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      // Total users: 3
      expect(screen.getByText('3')).toBeInTheDocument();
      // Active users: 2 (John and Jane are active)
      expect(screen.getByText('2')).toBeInTheDocument();
      // Inactive users: 1 (Bob is inactive)
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      // Pending password change: 1 (Jane has mustChangePassword: true)
    });

    it('should show card descriptions', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(screen.getByText('Usuários no domínio')).toBeInTheDocument();
      expect(screen.getByText('Atualmente ativos')).toBeInTheDocument();
      expect(screen.getByText('Contas desativadas')).toBeInTheDocument();
      expect(screen.getByText('Precisam trocar senha')).toBeInTheDocument();
    });
  });

  describe('Recent Users', () => {
    it('should render Recent Users section', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(screen.getByText('Usuários Recentes')).toBeInTheDocument();
      expect(
        screen.getByText('Últimos 5 usuários cadastrados'),
      ).toBeInTheDocument();
    });

    it('should display user list items with names and emails', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should show active/inactive status badges', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      const activeBadges = screen.getAllByText('Ativo');
      const inactiveBadges = screen.getAllByText('Inativo');

      expect(activeBadges.length).toBe(2);
      expect(inactiveBadges.length).toBe(1);
    });

    it('should display user cargo when available', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(screen.getByText(/Developer/)).toBeInTheDocument();
      expect(screen.getByText(/Designer/)).toBeInTheDocument();
    });

    it('should show empty state when no users', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: [],
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(
        screen.getByText('Nenhum usuário no seu domínio ainda'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /adicionar primeiro usuário/i }),
      ).toBeInTheDocument();
    });

    it('should sort users by creation date (newest first)', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      const userElements = screen.getAllByText(/Doe|Smith|Wilson/);
      // John (Mar 15) should appear before Jane (Mar 10) who should appear before Bob (Feb 1)
      expect(userElements[0]).toHaveTextContent('John Doe');
    });
  });

  describe('Loading state', () => {
    it('should show skeleton placeholders when loading', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: [],
        quota: null,
        loading: true,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      const { container } = renderWithRouter(<ManagerDashboard />);

      // Should have skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show loading state for QuotaIndicator', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: [],
        quota: null,
        loading: true,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      // QuotaIndicator should be in loading state
      const loadingElement = screen.getByRole('status', {
        name: /loading quota/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Data fetching', () => {
    it('should call fetchUsers and fetchQuota on mount', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(mockFetchUsers).toHaveBeenCalledTimes(1);
      expect(mockFetchQuota).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsiveness', () => {
    it('should use container layout', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      const { container } = renderWithRouter(<ManagerDashboard />);

      const contentContainer = container.querySelector('.container');
      expect(contentContainer).toBeInTheDocument();
    });

    it('should have responsive header with flex-col on mobile', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      const { container } = renderWithRouter(<ManagerDashboard />);

      // Header should use flex-col for mobile-first layout
      const header = container.querySelector('.flex.flex-col');
      expect(header).toBeInTheDocument();
    });

    it('should have responsive button that is full-width on mobile', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      const manageButton = screen.getByRole('link', {
        name: /gerenciar usuários/i,
      });
      // Button should have responsive width classes
      expect(manageButton).toHaveClass('w-full', 'sm:w-auto');
    });

    it('should have responsive grid for statistics cards', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      const { container } = renderWithRouter(<ManagerDashboard />);

      // Stats grid should have responsive columns
      const statsGrid = container.querySelector('.grid.gap-4.sm\\:grid-cols-2');
      expect(statsGrid).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Gestor de Domínio');
    });

    it('should have accessible QuotaIndicator with meter role', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      const meter = screen.getByRole('meter');
      expect(meter).toHaveAttribute('aria-valuenow', '5');
      expect(meter).toHaveAttribute('aria-valuemax', '10');
    });

    it('should have accessible links with proper text', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      // All links should be accessible
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should have loading indicators with proper aria labels', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: [],
        quota: null,
        loading: true,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      const loadingElements = screen.getAllByRole('status');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('User initials', () => {
    it('should display correct user initials in avatars', () => {
      vi.mocked(useManagerStore).mockReturnValue({
        users: mockUsers,
        quota: mockQuota,
        loading: false,
        fetchUsers: mockFetchUsers,
        fetchQuota: mockFetchQuota,
        error: null,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        resetUserPassword: vi.fn(),
        clearError: vi.fn(),
      });

      renderWithRouter(<ManagerDashboard />);

      expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe
      expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
      expect(screen.getByText('BW')).toBeInTheDocument(); // Bob Wilson
    });
  });
});
