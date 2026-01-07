import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/store/uiStore', () => ({
  useUIStore: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const renderSidebar = () => {
  return render(
    <BrowserRouter>
      <Sidebar />
    </BrowserRouter>,
  );
};

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should not render when sidebar is closed', () => {
      vi.mocked(useUIStore).mockReturnValue({ sidebarOpen: false });
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({ user: null } as ReturnType<typeof useAuthStore.getState>),
      );

      const { container } = renderSidebar();
      expect(container.firstChild).toBeNull();
    });

    it('should render when sidebar is open', () => {
      vi.mocked(useUIStore).mockReturnValue({ sidebarOpen: true });
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user' },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();
      expect(
        screen.getByRole('navigation', { name: /main navigation/i }),
      ).toBeInTheDocument();
    });
  });

  describe('base navigation', () => {
    beforeEach(() => {
      vi.mocked(useUIStore).mockReturnValue({ sidebarOpen: true });
    });

    it('should render base navigation items for all users', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user' },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Meus ETPs')).toBeInTheDocument();
      expect(screen.getByText('Import & Analysis')).toBeInTheDocument();
    });

    it('should render Novo ETP button', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user' },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      expect(screen.getByText('Novo ETP')).toBeInTheDocument();
    });
  });

  describe('role-based navigation', () => {
    beforeEach(() => {
      vi.mocked(useUIStore).mockReturnValue({ sidebarOpen: true });
    });

    it('should show Administracao link for system_admin', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: {
            id: '1',
            email: 'admin@test.com',
            name: 'Admin',
            role: 'system_admin',
          },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      expect(screen.getByText('Administração')).toBeInTheDocument();
      expect(screen.queryByText('Gerenciamento')).not.toBeInTheDocument();
    });

    it('should show Gerenciamento link for domain_manager', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: {
            id: '1',
            email: 'manager@test.com',
            name: 'Manager',
            role: 'domain_manager',
          },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      expect(screen.getByText('Gerenciamento')).toBeInTheDocument();
      expect(screen.queryByText('Administração')).not.toBeInTheDocument();
    });

    it('should NOT show admin links for regular user', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: { id: '1', email: 'user@test.com', name: 'User', role: 'user' },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      expect(screen.queryByText('Administração')).not.toBeInTheDocument();
      expect(screen.queryByText('Gerenciamento')).not.toBeInTheDocument();
    });

    it('should NOT show admin links for viewer role', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: {
            id: '1',
            email: 'viewer@test.com',
            name: 'Viewer',
            role: 'viewer',
          },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      expect(screen.queryByText('Administração')).not.toBeInTheDocument();
      expect(screen.queryByText('Gerenciamento')).not.toBeInTheDocument();
    });

    it('should NOT show admin links for demo role', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: {
            id: '1',
            email: 'demo@test.com',
            name: 'Demo',
            role: 'demo',
          },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      expect(screen.queryByText('Administração')).not.toBeInTheDocument();
      expect(screen.queryByText('Gerenciamento')).not.toBeInTheDocument();
    });

    it('should NOT show admin links when user is null', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({ user: null } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      expect(screen.queryByText('Administração')).not.toBeInTheDocument();
      expect(screen.queryByText('Gerenciamento')).not.toBeInTheDocument();
    });
  });

  describe('navigation links', () => {
    beforeEach(() => {
      vi.mocked(useUIStore).mockReturnValue({ sidebarOpen: true });
    });

    it('should have correct href for admin link', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: {
            id: '1',
            email: 'admin@test.com',
            name: 'Admin',
            role: 'system_admin',
          },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      const adminLink = screen.getByText('Administração').closest('a');
      expect(adminLink).toHaveAttribute('href', '/admin');
    });

    it('should have correct href for manager link', () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: {
            id: '1',
            email: 'manager@test.com',
            name: 'Manager',
            role: 'domain_manager',
          },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      const managerLink = screen.getByText('Gerenciamento').closest('a');
      expect(managerLink).toHaveAttribute('href', '/manager');
    });
  });

  describe('tip section', () => {
    it('should render tip section', () => {
      vi.mocked(useUIStore).mockReturnValue({ sidebarOpen: true });
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
          user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user' },
        } as ReturnType<typeof useAuthStore.getState>),
      );

      renderSidebar();

      expect(screen.getByText('Dica')).toBeInTheDocument();
    });
  });
});
