import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import type { User } from '@/types/user';

// Mock the stores
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/store/uiStore', () => ({
  useUIStore: vi.fn(),
}));

describe('Sidebar', () => {
  const mockSystemAdmin: User = {
    id: 'user-1',
    email: 'sysadmin@confenge.com.br',
    name: 'System Admin',
    role: 'system_admin',
  };

  const mockRegularUser: User = {
    id: 'user-2',
    email: 'user@confenge.com.br',
    name: 'Regular User',
    role: 'user',
  };

  const mockDomainManager: User = {
    id: 'user-3',
    email: 'manager@lages.sc.gov.br',
    name: 'Domain Manager',
    role: 'domain_manager',
  };

  const mockAdmin: User = {
    id: 'user-4',
    email: 'admin@confenge.com.br',
    name: 'Admin User',
    role: 'admin',
  };

  const defaultUIState = {
    sidebarOpen: true,
    openModal: vi.fn(),
  };

  function setupMocks(
    user: User | null = mockRegularUser,
    uiOverrides: Partial<typeof defaultUIState> = {},
  ) {
    vi.mocked(useAuthStore).mockReturnValue({
      user,
    } as ReturnType<typeof useAuthStore>);

    vi.mocked(useUIStore).mockReturnValue({
      ...defaultUIState,
      ...uiOverrides,
    } as ReturnType<typeof useUIStore>);
  }

  function renderSidebar() {
    return render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Visibility', () => {
    it('should render when sidebar is open', () => {
      setupMocks(mockRegularUser, { sidebarOpen: true });
      renderSidebar();

      expect(
        screen.getByRole('navigation', { name: /main navigation/i }),
      ).toBeInTheDocument();
    });

    it('should not render when sidebar is closed', () => {
      setupMocks(mockRegularUser, { sidebarOpen: false });
      renderSidebar();

      expect(
        screen.queryByRole('navigation', { name: /main navigation/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Primary Navigation', () => {
    it('should render Dashboard link', () => {
      renderSidebar();
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
        'href',
        '/dashboard',
      );
    });

    it('should render Meus ETPs link', () => {
      renderSidebar();
      expect(screen.getByRole('link', { name: /meus etps/i })).toHaveAttribute(
        'href',
        '/etps',
      );
    });

    it('should render Import & Analysis link', () => {
      renderSidebar();
      expect(
        screen.getByRole('link', { name: /import & analysis/i }),
      ).toHaveAttribute('href', '/analysis');
    });

    it('should render Novo ETP button', () => {
      renderSidebar();
      expect(
        screen.getByRole('button', { name: /create new etp/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Admin Navigation', () => {
    it('should show Administracao link for system_admin users', () => {
      setupMocks(mockSystemAdmin);
      renderSidebar();

      const adminLink = screen.getByRole('link', { name: /administração/i });
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute('href', '/admin');
    });

    it('should NOT show Administracao link for regular users', () => {
      setupMocks(mockRegularUser);
      renderSidebar();

      expect(
        screen.queryByRole('link', { name: /administração/i }),
      ).not.toBeInTheDocument();
    });

    it('should NOT show Administracao link for domain_manager users', () => {
      setupMocks(mockDomainManager);
      renderSidebar();

      expect(
        screen.queryByRole('link', { name: /administração/i }),
      ).not.toBeInTheDocument();
    });

    it('should NOT show Administracao link for admin users', () => {
      setupMocks(mockAdmin);
      renderSidebar();

      expect(
        screen.queryByRole('link', { name: /administração/i }),
      ).not.toBeInTheDocument();
    });

    it('should render admin navigation with correct aria label for system_admin', () => {
      setupMocks(mockSystemAdmin);
      renderSidebar();

      expect(
        screen.getByRole('navigation', { name: /admin navigation/i }),
      ).toBeInTheDocument();
    });

    it('should NOT render admin navigation section for non-system_admin users', () => {
      setupMocks(mockRegularUser);
      renderSidebar();

      expect(
        screen.queryByRole('navigation', { name: /admin navigation/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on main navigation', () => {
      renderSidebar();
      expect(
        screen.getByRole('navigation', { name: /primary navigation/i }),
      ).toBeInTheDocument();
    });

    it('should have proper aria-label on tip section', () => {
      renderSidebar();
      expect(screen.getByRole('complementary')).toHaveAccessibleName(
        /helpful tip/i,
      );
    });
  });
});
