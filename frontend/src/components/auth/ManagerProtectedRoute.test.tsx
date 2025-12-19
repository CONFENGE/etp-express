import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ManagerProtectedRoute } from './ManagerProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/user';

// Mock the authStore
vi.mock('@/store/authStore', () => ({
 useAuthStore: vi.fn(),
}));

describe('ManagerProtectedRoute', () => {
 const mockDomainManager: User = {
 id: 'user-1',
 email: 'manager@lages.sc.gov.br',
 name: 'Manager User',
 role: 'domain_manager',
 };

 const mockRegularUser: User = {
 id: 'user-2',
 email: 'user@lages.sc.gov.br',
 name: 'Regular User',
 role: 'user',
 };

 const mockAdmin: User = {
 id: 'user-3',
 email: 'admin@lages.sc.gov.br',
 name: 'Admin User',
 role: 'admin',
 };

 const mockSystemAdmin: User = {
 id: 'user-4',
 email: 'sysadmin@lages.sc.gov.br',
 name: 'System Admin',
 role: 'system_admin',
 };

 function setupMock(
 overrides: Partial<{
 user: User | null;
 isAuthenticated: boolean;
 }> = {},
 ) {
 vi.mocked(useAuthStore).mockReturnValue({
 user: mockDomainManager,
 isAuthenticated: true,
 ...overrides,
 } as ReturnType<typeof useAuthStore>);
 }

 function renderWithRouter(initialEntries = ['/manager']) {
 return render(
 <MemoryRouter initialEntries={initialEntries}>
 <Routes>
 <Route path="/login" element={<div>Login Page</div>} />
 <Route path="/" element={<div>Home Page</div>} />
 <Route path="/manager" element={<ManagerProtectedRoute />}>
 <Route index element={<div>Manager Dashboard</div>} />
 <Route path="users" element={<div>User Management</div>} />
 </Route>
 </Routes>
 </MemoryRouter>,
 );
 }

 beforeEach(() => {
 vi.clearAllMocks();
 setupMock();
 });

 afterEach(() => {
 vi.restoreAllMocks();
 });

 describe('Authentication', () => {
 it('should redirect to /login when not authenticated', () => {
 setupMock({ isAuthenticated: false, user: null });
 renderWithRouter();

 expect(screen.getByText('Login Page')).toBeInTheDocument();
 });

 it('should allow access when authenticated as domain_manager', () => {
 setupMock({ isAuthenticated: true, user: mockDomainManager });
 renderWithRouter();

 expect(screen.getByText('Manager Dashboard')).toBeInTheDocument();
 });
 });

 describe('Authorization', () => {
 it('should redirect to / when user role is not domain_manager', () => {
 setupMock({ isAuthenticated: true, user: mockRegularUser });
 renderWithRouter();

 expect(screen.getByText('Home Page')).toBeInTheDocument();
 });

 it('should redirect admin users to home', () => {
 setupMock({ isAuthenticated: true, user: mockAdmin });
 renderWithRouter();

 expect(screen.getByText('Home Page')).toBeInTheDocument();
 });

 it('should redirect system_admin users to home', () => {
 setupMock({ isAuthenticated: true, user: mockSystemAdmin });
 renderWithRouter();

 expect(screen.getByText('Home Page')).toBeInTheDocument();
 });
 });

 describe('Nested Routes', () => {
 it('should render nested route content for domain_manager', () => {
 setupMock({ isAuthenticated: true, user: mockDomainManager });
 renderWithRouter(['/manager/users']);

 expect(screen.getByText('User Management')).toBeInTheDocument();
 });

 it('should redirect nested routes when not authorized', () => {
 setupMock({ isAuthenticated: true, user: mockRegularUser });
 renderWithRouter(['/manager/users']);

 expect(screen.getByText('Home Page')).toBeInTheDocument();
 });
 });

 describe('Edge Cases', () => {
 it('should redirect to home when user is null but authenticated', () => {
 setupMock({ isAuthenticated: true, user: null });
 renderWithRouter();

 expect(screen.getByText('Home Page')).toBeInTheDocument();
 });
 });
});
