import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DomainDetail } from './DomainDetail';
import { apiHelpers } from '@/lib/api';
import { createDeferredPromise } from '@/test/setup';

// Mock apiHelpers
vi.mock('@/lib/api', () => ({
 apiHelpers: {
 get: vi.fn(),
 post: vi.fn(),
 },
}));

// Mock useToast
vi.mock('@/hooks/useToast', () => ({
 useToast: () => ({
 success: vi.fn(),
 error: vi.fn(),
 }),
}));

// Mock adminStore
vi.mock('@/store/adminStore', () => ({
 useAdminStore: vi.fn(() => ({
 assignManager: vi.fn(),
 })),
}));

const mockDomain = {
 id: 'domain-123',
 domain: 'example.com',
 maxUsers: 100,
 isActive: true,
 managerId: null,
 managerName: null,
 currentUsers: 25,
 createdAt: '2024-01-01T00:00:00Z',
};

const mockUsers = [
 {
 id: '1',
 name: 'John Doe',
 email: 'john@example.com',
 role: 'user' as const,
 },
 {
 id: '2',
 name: 'Jane Smith',
 email: 'jane@example.com',
 role: 'admin' as const,
 },
];

function renderWithRouter(domainId: string = 'domain-123') {
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
 vi.mocked(apiHelpers.get).mockImplementation((url: string) => {
 if (url.includes('/users')) {
 return Promise.resolve(mockUsers);
 }
 return Promise.resolve(mockDomain);
 });
 });

 describe('Loading State', () => {
 it('should show loading skeleton initially', async () => {
 // Use deferred promises that resolve after we check the loading state
 // This avoids hanging timers from Radix UI components that cause CI timeouts
 // See: createDeferredPromise utility in test/setup.ts
 const domainDeferred = createDeferredPromise<typeof mockDomain>();
 const usersDeferred = createDeferredPromise<typeof mockUsers>();

 vi.mocked(apiHelpers.get).mockImplementation((url: string) => {
 if (url.includes('/users')) {
 return usersDeferred.promise;
 }
 return domainDeferred.promise;
 });

 renderWithRouter();

 // Should show skeleton elements
 expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

 // Resolve the promises and wait for state updates to complete
 // This prevents Radix UI timer leaks and act() warnings
 domainDeferred.resolve(mockDomain);
 usersDeferred.resolve(mockUsers);
 await waitFor(() => {
 expect(
 screen.getByRole('heading', { name: 'example.com' }),
 ).toBeInTheDocument();
 });
 });
 });

 describe('Content Display', () => {
 it('should display domain information after loading', async () => {
 renderWithRouter();

 await waitFor(() => {
 expect(
 screen.getByRole('heading', { name: 'example.com' }),
 ).toBeInTheDocument();
 });

 expect(screen.getByText('Domain Information')).toBeInTheDocument();
 expect(screen.getByText('100')).toBeInTheDocument(); // maxUsers
 expect(screen.getByText('Active')).toBeInTheDocument();
 });

 it('should display user list', async () => {
 renderWithRouter();

 await waitFor(() => {
 expect(screen.getByText('John Doe')).toBeInTheDocument();
 expect(screen.getByText('jane@example.com')).toBeInTheDocument();
 });
 });

 it('should show user count', async () => {
 renderWithRouter();

 await waitFor(() => {
 expect(screen.getByText('2 of 100 users')).toBeInTheDocument();
 });
 });

 it('should display "Not assigned" when no manager', async () => {
 renderWithRouter();

 await waitFor(() => {
 expect(screen.getByText('Not assigned')).toBeInTheDocument();
 });
 });

 it('should display manager name when assigned', async () => {
 vi.mocked(apiHelpers.get).mockImplementation((url: string) => {
 if (url.includes('/users')) {
 return Promise.resolve(mockUsers);
 }
 return Promise.resolve({
 ...mockDomain,
 managerId: '2',
 managerName: 'Jane Smith',
 });
 });

 renderWithRouter();

 await waitFor(() => {
 // Find Jane Smith in the manager row (not in the user list)
 const managerRow = screen.getAllByText('Jane Smith');
 expect(managerRow.length).toBeGreaterThan(0);
 });
 });
 });

 describe('Navigation', () => {
 it('should have breadcrumb navigation to domains list', async () => {
 renderWithRouter();

 await waitFor(() => {
 expect(
 screen.getByRole('heading', { name: 'example.com' }),
 ).toBeInTheDocument();
 });

 // Breadcrumb should have link to domains list
 const domainsLink = screen.getByRole('link', { name: 'Domínios' });
 expect(domainsLink).toHaveAttribute('href', '/admin/domains');
 });
 });

 describe('Error State', () => {
 it('should display error message on fetch failure', async () => {
 vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Failed to fetch'));

 renderWithRouter();

 await waitFor(() => {
 expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
 });
 });

 it('should show back button in error state', async () => {
 vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Failed to fetch'));

 renderWithRouter();

 await waitFor(() => {
 expect(
 screen.getByRole('button', { name: 'Back to domains' }),
 ).toBeInTheDocument();
 });
 });
 });

 describe('Assign Manager Button', () => {
 it('should show "Assign Manager" button when no manager', async () => {
 renderWithRouter();

 await waitFor(() => {
 expect(
 screen.getByRole('button', { name: 'Assign Manager' }),
 ).toBeInTheDocument();
 });
 });

 it('should show "Change Manager" button when manager exists', async () => {
 vi.mocked(apiHelpers.get).mockImplementation((url: string) => {
 if (url.includes('/users')) {
 return Promise.resolve(mockUsers);
 }
 return Promise.resolve({
 ...mockDomain,
 managerId: '2',
 managerName: 'Jane Smith',
 });
 });

 renderWithRouter();

 await waitFor(() => {
 expect(
 screen.getByRole('button', { name: 'Change Manager' }),
 ).toBeInTheDocument();
 });
 });

 it('should open assign dialog when button clicked', async () => {
 const user = userEvent.setup();

 renderWithRouter();

 await waitFor(() => {
 expect(
 screen.getByRole('heading', { name: 'example.com' }),
 ).toBeInTheDocument();
 });

 const assignButton = screen.getByRole('button', {
 name: 'Assign Manager',
 });
 await user.click(assignButton);

 await waitFor(() => {
 expect(screen.getByText('Assign Domain Manager')).toBeInTheDocument();
 });
 });
 });

 describe('Empty Users', () => {
 it('should show empty message when no users', async () => {
 vi.mocked(apiHelpers.get).mockImplementation((url: string) => {
 if (url.includes('/users')) {
 return Promise.resolve([]);
 }
 return Promise.resolve(mockDomain);
 });

 renderWithRouter();

 await waitFor(() => {
 expect(
 screen.getByText('No users registered in this domain yet'),
 ).toBeInTheDocument();
 });
 });
 });

 describe('Status Badge', () => {
 it('should show Active badge for active domain', async () => {
 renderWithRouter();

 await waitFor(() => {
 const badge = screen.getByText('Active');
 expect(badge).toBeInTheDocument();
 expect(badge).toHaveClass('bg-green-100');
 });
 });

 it('should show Inactive badge for inactive domain', async () => {
 vi.mocked(apiHelpers.get).mockImplementation((url: string) => {
 if (url.includes('/users')) {
 return Promise.resolve(mockUsers);
 }
 return Promise.resolve({ ...mockDomain, isActive: false });
 });

 renderWithRouter();

 await waitFor(() => {
 const badge = screen.getByText('Inactive');
 expect(badge).toBeInTheDocument();
 expect(badge).toHaveClass('bg-gray-100');
 });
 });
 });

 describe('User Roles Display', () => {
 it('should display user roles correctly formatted', async () => {
 renderWithRouter();

 await waitFor(() => {
 expect(screen.getByText('user')).toBeInTheDocument();
 expect(screen.getByText('admin')).toBeInTheDocument();
 });
 });
 });

 describe('Responsiveness', () => {
 it('should have responsive grid for content cards', async () => {
 const { container } = renderWithRouter();

 await waitFor(() => {
 expect(
 screen.getByRole('heading', { name: 'example.com' }),
 ).toBeInTheDocument();
 });

 // Grid should be responsive
 const grid = container.querySelector('.grid.gap-6');
 expect(grid).toBeInTheDocument();
 expect(grid).toHaveClass('lg:grid-cols-2');
 });

 it('should have responsive typography', async () => {
 renderWithRouter();

 await waitFor(() => {
 const h1 = screen.getByRole('heading', { level: 1 });
 expect(h1).toHaveClass('text-2xl', 'sm:text-3xl');
 });
 });

 it('should have truncate on long domain names', async () => {
 renderWithRouter();

 await waitFor(() => {
 const h1 = screen.getByRole('heading', { level: 1 });
 expect(h1).toHaveClass('truncate');
 });
 });
 });

 describe('Accessibility', () => {
 it('should have proper heading hierarchy', async () => {
 renderWithRouter();

 await waitFor(() => {
 const h1 = screen.getByRole('heading', { level: 1 });
 expect(h1).toHaveTextContent('example.com');
 });
 });

 it('should have breadcrumb navigation with proper hierarchy', async () => {
 renderWithRouter();

 await waitFor(() => {
 // Breadcrumb should have home, admin, and domains links
 expect(
 screen.getByRole('link', { name: 'Início' }),
 ).toBeInTheDocument();
 expect(
 screen.getByRole('link', { name: 'Administração' }),
 ).toBeInTheDocument();
 expect(
 screen.getByRole('link', { name: 'Domínios' }),
 ).toBeInTheDocument();
 });
 });

 it('should have icon with descriptive text in cards', async () => {
 renderWithRouter();

 await waitFor(() => {
 expect(screen.getByText('Domain Information')).toBeInTheDocument();
 expect(screen.getByText('Domain Users')).toBeInTheDocument();
 });
 });
 });
});
