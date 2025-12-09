import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DomainDetail } from './DomainDetail';
import { apiHelpers } from '@/lib/api';
import type { AuthorizedDomain } from '@/store/adminStore';
import type { User } from '@/types/user';

vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
  },
}));

vi.mock('@/store/adminStore', () => ({
  useAdminStore: vi.fn(() => ({
    assignManager: vi.fn(),
  })),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockDomain: AuthorizedDomain = {
  id: 'domain-1',
  domain: 'example.com',
  createdAt: '2024-01-01T00:00:00Z',
  maxUsers: 100,
  isActive: true,
  managerId: 'user-2',
  managerName: 'Jane Smith',
  currentUsers: 5,
};

const mockDomainNoManager: AuthorizedDomain = {
  ...mockDomain,
  managerId: undefined,
  managerName: undefined,
};

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
  {
    id: 'user-3',
    email: 'bob@example.com',
    name: 'Bob Wilson',
    role: 'user',
  },
];

function renderWithRouter(domainId: string = 'domain-1') {
  return render(
    <MemoryRouter initialEntries={[`/admin/domains/${domainId}`]}>
      <Routes>
        <Route path="/admin/domains/:id" element={<DomainDetail />} />
        <Route path="/admin/domains" element={<div>Domains List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DomainDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(async () => {
    // Run all pending timers to clean up Radix UI animations
    await act(async () => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('should show loading skeleton initially', async () => {
      vi.mocked(apiHelpers.get).mockImplementation(
        () => new Promise(() => {}), // Never resolves - we check synchronously
      );

      renderWithRouter();

      // Skeleton should be visible during loading
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

      await act(async () => {
        vi.runAllTimers();
      });
    });
  });

  describe('Successful Data Load', () => {
    beforeEach(() => {
      vi.mocked(apiHelpers.get).mockImplementation((url) => {
        if (url.includes('/users')) {
          return Promise.resolve(mockUsers);
        }
        return Promise.resolve(mockDomain);
      });
    });

    it('should display domain information', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('example.com')).toBeInTheDocument();
      });

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should display domain users', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should display manager name when assigned', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('example.com')).toBeInTheDocument();
      });

      // Manager name from users list
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should show "Change Manager" button when manager is assigned', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('Change Manager')).toBeInTheDocument();
      });
    });

    it('should show "Assign Manager" button when no manager', async () => {
      vi.mocked(apiHelpers.get).mockImplementation((url) => {
        if (url.includes('/users')) {
          return Promise.resolve(mockUsers);
        }
        return Promise.resolve(mockDomainNoManager);
      });

      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('Assign Manager')).toBeInTheDocument();
      });
    });

    it('should have back button linking to domains list', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('example.com')).toBeInTheDocument();
      });

      const backLink = screen.getByRole('link', { name: 'Back to domains' });
      expect(backLink).toHaveAttribute('href', '/admin/domains');
    });

    it('should display user count correctly', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('3 / 100')).toBeInTheDocument();
      });
    });

    it('should show user roles with badges', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('Manager')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Users State', () => {
    it('should show empty state when no users', async () => {
      vi.mocked(apiHelpers.get).mockImplementation((url) => {
        if (url.includes('/users')) {
          return Promise.resolve([]);
        }
        return Promise.resolve(mockDomain);
      });

      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(
          screen.getByText('No users in this domain yet.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show not found component on error', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Not found'));

      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('Domain Not Found')).toBeInTheDocument();
      });
    });

    it('should have button to go back to domains on not found', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Not found'));

      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Back to Domains' }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Assign Manager Dialog', () => {
    beforeEach(() => {
      vi.mocked(apiHelpers.get).mockImplementation((url) => {
        if (url.includes('/users')) {
          return Promise.resolve(mockUsers);
        }
        return Promise.resolve(mockDomainNoManager);
      });
    });

    it('should open assign manager dialog on button click', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('Assign Manager')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Assign Manager'));

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Assign Domain Manager')).toBeInTheDocument();
      });
    });
  });

  describe('Inactive Domain', () => {
    it('should show inactive badge for inactive domain', async () => {
      vi.mocked(apiHelpers.get).mockImplementation((url) => {
        if (url.includes('/users')) {
          return Promise.resolve(mockUsers);
        }
        return Promise.resolve({ ...mockDomain, isActive: false });
      });

      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getAllByText('Inactive')).toHaveLength(2); // Header and info card
      });
    });
  });

  describe('API Calls', () => {
    it('should fetch domain and users on mount', async () => {
      vi.mocked(apiHelpers.get).mockImplementation((url) => {
        if (url.includes('/users')) {
          return Promise.resolve(mockUsers);
        }
        return Promise.resolve(mockDomain);
      });

      renderWithRouter('domain-1');

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalledWith(
          '/system-admin/domains/domain-1',
        );
        expect(apiHelpers.get).toHaveBeenCalledWith(
          '/system-admin/domains/domain-1/users',
        );
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      vi.mocked(apiHelpers.get).mockImplementation((url) => {
        if (url.includes('/users')) {
          return Promise.resolve(mockUsers);
        }
        return Promise.resolve(mockDomain);
      });
    });

    it('should have accessible heading', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: 'example.com' }),
        ).toBeInTheDocument();
      });
    });

    it('should have aria-label on back button', async () => {
      renderWithRouter();

      await act(async () => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: 'Back to domains' }),
        ).toBeInTheDocument();
      });
    });
  });
});
