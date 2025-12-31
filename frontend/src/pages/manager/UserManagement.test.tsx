import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { UserManagement } from './UserManagement';
import * as managerStore from '@/store/managerStore';
import * as authStore from '@/store/authStore';

// Mock the stores
vi.mock('@/store/managerStore', async () => {
  const actual = await vi.importActual<typeof managerStore>(
    '@/store/managerStore',
  );
  return {
    ...actual,
    useManagerStore: vi.fn(),
  };
});

vi.mock('@/store/authStore', async () => {
  const actual = await vi.importActual<typeof authStore>('@/store/authStore');
  return {
    ...actual,
    useAuthStore: vi.fn(),
  };
});

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockUsers: managerStore.DomainUser[] = [
  {
    id: '1',
    email: 'john@example.com',
    name: 'John Doe',
    cargo: 'Software Engineer',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    cargo: 'Product Manager',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2024-02-15T00:00:00Z',
  },
];

const mockQuota: managerStore.QuotaInfo = {
  currentUsers: 2,
  maxUsers: 10,
  available: 8,
  percentUsed: 20,
};

const defaultManagerStoreState = {
  users: mockUsers,
  quota: mockQuota,
  loading: false,
  error: null,
  fetchUsers: vi.fn(),
  fetchQuota: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  resetUserPassword: vi.fn(),
  clearError: vi.fn(),
};

const defaultAuthStoreState = {
  user: {
    id: 'manager-1',
    email: 'manager@example.com',
    name: 'Domain Manager',
    role: 'domain_manager' as const,
  },
  isAuthenticated: true,
  isLoading: false,
  error: null,
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(managerStore.useManagerStore).mockReturnValue(
      defaultManagerStoreState,
    );
    vi.mocked(authStore.useAuthStore).mockReturnValue(defaultAuthStoreState);
  });

  describe('Rendering', () => {
    it('should render page title', () => {
      renderWithRouter(<UserManagement />);

      expect(screen.getByText('Gerenciamento de Usuários')).toBeInTheDocument();
      expect(
        screen.getByText('Gerencie os usuários do seu domínio'),
      ).toBeInTheDocument();
    });

    it('should render breadcrumb navigation', () => {
      renderWithRouter(<UserManagement />);

      // Breadcrumb should have home link and manager link
      const homeLink = screen.getByRole('link', { name: 'Início' });
      expect(homeLink).toHaveAttribute('href', '/dashboard');

      const managerLink = screen.getByRole('link', { name: 'Gerenciamento' });
      expect(managerLink).toHaveAttribute('href', '/manager');
    });

    it('should render new user button', () => {
      renderWithRouter(<UserManagement />);

      expect(
        screen.getByRole('button', { name: /Novo Usuário/i }),
      ).toBeInTheDocument();
    });

    it('should render quota indicator', () => {
      renderWithRouter(<UserManagement />);

      expect(screen.getByText('Cota de Usuários')).toBeInTheDocument();
      expect(screen.getByText('Capacidade do domínio')).toBeInTheDocument();
    });

    it('should render search input', () => {
      renderWithRouter(<UserManagement />);

      expect(
        screen.getByPlaceholderText('Buscar por nome, e-mail ou cargo...'),
      ).toBeInTheDocument();
    });

    it('should render user table', () => {
      renderWithRouter(<UserManagement />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('Data fetching', () => {
    it('should fetch users and quota on mount', () => {
      renderWithRouter(<UserManagement />);

      expect(defaultManagerStoreState.fetchUsers).toHaveBeenCalled();
      expect(defaultManagerStoreState.fetchQuota).toHaveBeenCalled();
    });
  });

  describe('Search functionality', () => {
    it('should filter users by search query', async () => {
      const user = userEvent.setup();
      renderWithRouter(<UserManagement />);

      const searchInput = screen.getByPlaceholderText(
        'Buscar por nome, e-mail ou cargo...',
      );
      await user.type(searchInput, 'John');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should render search input for filtering', () => {
      renderWithRouter(<UserManagement />);

      const searchInput = screen.getByPlaceholderText(
        'Buscar por nome, e-mail ou cargo...',
      );
      expect(searchInput).toBeInTheDocument();
    });

    it('should clear search when X button clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<UserManagement />);

      const searchInput = screen.getByPlaceholderText(
        'Buscar por nome, e-mail ou cargo...',
      );
      await user.type(searchInput, 'John');

      const clearButton = screen.getByRole('button', { name: 'Limpar busca' });
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('Quota handling', () => {
    it('should disable new user button when quota exhausted', () => {
      vi.mocked(managerStore.useManagerStore).mockReturnValue({
        ...defaultManagerStoreState,
        quota: { ...mockQuota, available: 0 },
      });

      renderWithRouter(<UserManagement />);

      const newUserButton = screen.getByRole('button', {
        name: /Novo Usuário/i,
      });
      expect(newUserButton).toBeDisabled();
    });
  });

  describe('Create user dialog', () => {
    it('should have new user button to open dialog', () => {
      renderWithRouter(<UserManagement />);

      const newUserButton = screen.getByRole('button', {
        name: /Novo Usuário/i,
      });
      expect(newUserButton).toBeInTheDocument();
      expect(newUserButton).not.toBeDisabled();
    });
  });

  describe('Loading state', () => {
    it('should show loading skeleton when loading', () => {
      vi.mocked(managerStore.useManagerStore).mockReturnValue({
        ...defaultManagerStoreState,
        loading: true,
        users: [],
      });

      const { container } = renderWithRouter(<UserManagement />);

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should call clearError when error is shown', async () => {
      vi.mocked(managerStore.useManagerStore).mockReturnValue({
        ...defaultManagerStoreState,
        error: 'Test error',
      });

      renderWithRouter(<UserManagement />);

      await waitFor(() => {
        expect(defaultManagerStoreState.clearError).toHaveBeenCalled();
      });
    });
  });
});
