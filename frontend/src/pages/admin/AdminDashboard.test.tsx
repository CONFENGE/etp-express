import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { AdminDashboard } from './AdminDashboard';
import {
  useAdminStore,
  AuthorizedDomain,
  GlobalStatistics,
} from '@/store/adminStore';

// Mock the adminStore
vi.mock('@/store/adminStore', async () => {
  const actual = await vi.importActual('@/store/adminStore');
  return {
    ...actual,
    useAdminStore: vi.fn(),
  };
});

describe('AdminDashboard', () => {
  const mockStatistics: GlobalStatistics = {
    totalDomains: 10,
    activeDomains: 8,
    totalUsers: 100,
    activeUsers: 85,
  };

  const mockDomains: AuthorizedDomain[] = [
    {
      id: 'domain-1',
      domain: 'example.com',
      createdAt: '2024-01-01T00:00:00Z',
      maxUsers: 10,
      isActive: true,
      managerId: 'user-1',
      managerName: 'John Doe',
      currentUsers: 5,
    },
    {
      id: 'domain-2',
      domain: 'test.org',
      createdAt: '2024-02-01T00:00:00Z',
      maxUsers: 20,
      isActive: false,
      currentUsers: 0,
    },
  ];

  const mockFetchStatistics = vi.fn();
  const mockFetchDomains = vi.fn();

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
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('System Admin')).toBeInTheDocument();
      expect(
        screen.getByText('Manage domains and users across the platform'),
      ).toBeInTheDocument();
    });

    it('should have a Manage Domains button linking to /admin/domains', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      const manageButton = screen.getByRole('link', {
        name: /manage domains/i,
      });
      expect(manageButton).toBeInTheDocument();
      expect(manageButton).toHaveAttribute('href', '/admin/domains');
    });
  });

  describe('Statistics Cards', () => {
    it('should render StatisticsCards component', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      // PT-BR translations
      expect(screen.getByText('Total de Domínios')).toBeInTheDocument();
      expect(screen.getByText('Domínios Ativos')).toBeInTheDocument();
      expect(screen.getByText('Total de Usuários')).toBeInTheDocument();
      expect(screen.getByText('Usuários Ativos')).toBeInTheDocument();
    });

    it('should show statistics values', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });
  });

  describe('Recent Domains', () => {
    it('should render Recent Domains section', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('Recent Domains')).toBeInTheDocument();
      expect(screen.getByText('Last 5 registered domains')).toBeInTheDocument();
    });

    it('should display domain list items', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('test.org')).toBeInTheDocument();
    });

    it('should show active/inactive status badges', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should show user count and manager info', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText(/5 \/ 10 users/i)).toBeInTheDocument();
      expect(screen.getByText(/Manager: John Doe/i)).toBeInTheDocument();
    });

    it('should show empty state when no domains', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: [],
      });

      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('No domains registered yet')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /add your first domain/i }),
      ).toBeInTheDocument();
    });

    it('should link domains to detail page', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      const domainLink = screen.getByText('example.com').closest('a');
      expect(domainLink).toHaveAttribute('href', '/admin/domains/domain-1');
    });
  });

  describe('Loading state', () => {
    it('should show skeleton placeholders when loading', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: null,
        loading: true,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: [],
      });

      const { container } = renderWithRouter(<AdminDashboard />);

      // Should have skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Data fetching', () => {
    it('should call fetchStatistics and fetchDomains on mount', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      expect(mockFetchStatistics).toHaveBeenCalledTimes(1);
      expect(mockFetchDomains).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsiveness', () => {
    it('should use container layout', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      const { container } = renderWithRouter(<AdminDashboard />);

      const contentContainer = container.querySelector('.container');
      expect(contentContainer).toBeInTheDocument();
    });

    it('should have responsive header with flex-col on mobile', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      const { container } = renderWithRouter(<AdminDashboard />);

      // Header should use flex-col for mobile-first layout
      const header = container.querySelector('.flex.flex-col');
      expect(header).toBeInTheDocument();
    });

    it('should have responsive button that is full-width on mobile', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      const manageButton = screen.getByRole('link', {
        name: /manage domains/i,
      });
      // Button should have responsive width classes
      expect(manageButton).toHaveClass('w-full', 'sm:w-auto');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('System Admin');
    });

    it('should have accessible links with proper text', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      // All domain links should be accessible
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should provide descriptive text for screen readers', () => {
      vi.mocked(useAdminStore).mockReturnValue({
        statistics: mockStatistics,
        loading: false,
        fetchStatistics: mockFetchStatistics,
        fetchDomains: mockFetchDomains,
        domains: mockDomains,
      });

      renderWithRouter(<AdminDashboard />);

      // Card descriptions should be present (PT-BR)
      expect(screen.getByText('Domínios cadastrados')).toBeInTheDocument();
      expect(screen.getByText('Atualmente ativos')).toBeInTheDocument();
    });
  });
});
