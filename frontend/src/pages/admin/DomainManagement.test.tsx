import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { DomainManagement } from './DomainManagement';
import { useAdminStore, AuthorizedDomain } from '@/store/adminStore';

// Mock the store
vi.mock('@/store/adminStore', () => ({
  useAdminStore: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockDomains: AuthorizedDomain[] = [
  {
    id: '1',
    domain: 'example.com',
    createdAt: '2024-01-01T00:00:00Z',
    maxUsers: 50,
    isActive: true,
    managerId: 'user-1',
    managerName: 'John Doe',
    currentUsers: 25,
  },
  {
    id: '2',
    domain: 'test.org',
    createdAt: '2024-01-02T00:00:00Z',
    maxUsers: 100,
    isActive: false,
    currentUsers: 0,
  },
];

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('DomainManagement', () => {
  const mockFetchDomains = vi.fn();
  const mockCreateDomain = vi.fn();
  const mockDeleteDomain = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminStore).mockReturnValue({
      domains: mockDomains,
      loading: false,
      error: null,
      fetchDomains: mockFetchDomains,
      createDomain: mockCreateDomain,
      deleteDomain: mockDeleteDomain,
    });
  });

  describe('Rendering', () => {
    it('should render page header', () => {
      renderWithRouter(<DomainManagement />);

      expect(
        screen.getByRole('heading', { level: 1, name: 'Domínios' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Gerencie os domínios institucionais autorizados'),
      ).toBeInTheDocument();
    });

    it('should render Add Domain button', () => {
      renderWithRouter(<DomainManagement />);

      expect(
        screen.getByRole('button', { name: /adicionar domínio/i }),
      ).toBeInTheDocument();
    });

    it('should render breadcrumb navigation', () => {
      renderWithRouter(<DomainManagement />);

      // Breadcrumb should have home and admin links
      expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Administração' }),
      ).toBeInTheDocument();
    });

    it('should call fetchDomains on mount', () => {
      renderWithRouter(<DomainManagement />);

      expect(mockFetchDomains).toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('should show loading state', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        domains: [],
        loading: true,
        error: null,
        fetchDomains: mockFetchDomains,
        createDomain: mockCreateDomain,
        deleteDomain: mockDeleteDomain,
      });

      const { container } = renderWithRouter(<DomainManagement />);

      // Should show skeleton loading
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Create domain', () => {
    it('should open create dialog on Add Domain click', () => {
      renderWithRouter(<DomainManagement />);

      const addButton = screen.getByRole('button', {
        name: /adicionar domínio/i,
      });
      fireEvent.click(addButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should call createDomain on form submit', async () => {
      const user = userEvent.setup();
      mockCreateDomain.mockResolvedValue(undefined);

      renderWithRouter(<DomainManagement />);

      // Open dialog
      const addButton = screen.getByRole('button', {
        name: /adicionar domínio/i,
      });
      fireEvent.click(addButton);

      // Fill form
      const domainInput = screen.getByLabelText('Domínio');
      const institutionNameInput = screen.getByLabelText('Nome da Instituição');
      await user.type(domainInput, 'newdomain.com');
      await user.type(institutionNameInput, 'Prefeitura de Novo Domínio');

      // Submit
      const submitButton = screen.getByRole('button', {
        name: 'Criar Domínio',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateDomain).toHaveBeenCalledWith({
          domain: 'newdomain.com',
          institutionName: 'Prefeitura de Novo Domínio',
          maxUsers: 10,
        });
      });
    });
  });

  describe('Domain list', () => {
    it('should display all domains', () => {
      renderWithRouter(<DomainManagement />);

      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('test.org')).toBeInTheDocument();
    });

    it('should show empty state when no domains', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        domains: [],
        loading: false,
        error: null,
        fetchDomains: mockFetchDomains,
        createDomain: mockCreateDomain,
        deleteDomain: mockDeleteDomain,
      });

      renderWithRouter(<DomainManagement />);

      expect(
        screen.getByText('Nenhum domínio cadastrado ainda.'),
      ).toBeInTheDocument();
    });
  });

  describe('Responsiveness', () => {
    it('should have responsive header layout', () => {
      const { container } = renderWithRouter(<DomainManagement />);

      // Header should use flex-col for mobile-first layout
      const header = container.querySelector('.flex.flex-col');
      expect(header).toBeInTheDocument();
    });

    it('should have responsive Add Domain button', () => {
      renderWithRouter(<DomainManagement />);

      const addButton = screen.getByRole('button', {
        name: /adicionar domínio/i,
      });
      expect(addButton).toHaveClass('w-full', 'sm:w-auto');
    });

    it('should have container with proper spacing', () => {
      const { container } = renderWithRouter(<DomainManagement />);

      const contentContainer = container.querySelector('.container');
      expect(contentContainer).toBeInTheDocument();
      expect(contentContainer).toHaveClass('mx-auto');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithRouter(<DomainManagement />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Domínios');
    });

    it('should have breadcrumb navigation with proper links', () => {
      renderWithRouter(<DomainManagement />);

      // Home link should go to dashboard
      const homeLink = screen.getByRole('link', { name: 'Início' });
      expect(homeLink).toHaveAttribute('href', '/dashboard');

      // Admin link should go to admin dashboard
      const adminLink = screen.getByRole('link', { name: 'Administração' });
      expect(adminLink).toHaveAttribute('href', '/admin');
    });

    it('should have descriptive table headers', () => {
      renderWithRouter(<DomainManagement />);

      expect(screen.getByText('Domínio')).toBeInTheDocument();
      expect(screen.getByText('Usuários')).toBeInTheDocument();
      expect(screen.getByText('Gestor')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });
  });
});
