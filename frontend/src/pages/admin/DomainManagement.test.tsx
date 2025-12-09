import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
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

      expect(screen.getByText('Domains')).toBeInTheDocument();
      expect(
        screen.getByText('Manage authorized institutional domains'),
      ).toBeInTheDocument();
    });

    it('should render Add Domain button', () => {
      renderWithRouter(<DomainManagement />);

      expect(
        screen.getByRole('button', { name: /add domain/i }),
      ).toBeInTheDocument();
    });

    it('should render back link', () => {
      renderWithRouter(<DomainManagement />);

      expect(
        screen.getByRole('link', { name: /back to admin dashboard/i }),
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

      const addButton = screen.getByRole('button', { name: /add domain/i });
      fireEvent.click(addButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should call createDomain on form submit', async () => {
      const user = userEvent.setup();
      mockCreateDomain.mockResolvedValue(undefined);

      renderWithRouter(<DomainManagement />);

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add domain/i });
      fireEvent.click(addButton);

      // Fill form
      const domainInput = screen.getByLabelText('Domain');
      await user.type(domainInput, 'newdomain.com');

      // Submit
      const submitButton = screen.getByRole('button', {
        name: 'Create Domain',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateDomain).toHaveBeenCalledWith({
          domain: 'newdomain.com',
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
        screen.getByText('No domains registered yet.'),
      ).toBeInTheDocument();
    });
  });
});
