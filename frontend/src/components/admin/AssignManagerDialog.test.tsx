import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignManagerDialog } from './AssignManagerDialog';
import { apiHelpers } from '@/lib/api';
import { createDeferredPromise } from '@/test/setup';

// Mock apiHelpers
vi.mock('@/lib/api', () => ({
 apiHelpers: {
 get: vi.fn(),
 post: vi.fn(),
 },
}));

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
 {
 id: '3',
 name: 'Bob Wilson',
 email: 'bob@example.com',
 role: 'user' as const,
 },
];

describe('AssignManagerDialog', () => {
 const mockOnAssign = vi.fn();
 const mockOnOpenChange = vi.fn();
 const mockDomainId = 'domain-123';

 beforeEach(() => {
 vi.clearAllMocks();
 vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);
 });

 describe('Rendering', () => {
 it('should render dialog content when open', async () => {
 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 expect(screen.getByRole('dialog')).toBeInTheDocument();
 expect(screen.getByText('Assign Domain Manager')).toBeInTheDocument();

 // Wait for users to load to avoid act warnings
 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });
 });

 it('should not render dialog when closed', () => {
 render(
 <AssignManagerDialog
 open={false}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 });

 it('should fetch users when dialog opens', async () => {
 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalledWith(
 `/system-admin/domains/${mockDomainId}/users`,
 );
 });
 });

 it('should show message when no users available', async () => {
 vi.mocked(apiHelpers.get).mockResolvedValue([]);

 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 await waitFor(() => {
 expect(
 screen.getByText('No users available in this domain'),
 ).toBeInTheDocument();
 });
 });

 it('should show dialog description', async () => {
 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 expect(
 screen.getByText(/Select a user to manage this domain/),
 ).toBeInTheDocument();

 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });
 });
 });

 describe('Buttons', () => {
 it('should disable assign button when no user selected', async () => {
 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 // Wait for users to load
 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });

 const assignButton = screen.getByRole('button', {
 name: 'Assign Manager',
 });
 expect(assignButton).toBeDisabled();
 });

 it('should have cancel button', async () => {
 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 const cancelButton = screen.getByRole('button', { name: 'Cancel' });
 expect(cancelButton).toBeInTheDocument();

 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });
 });
 });

 describe('Cancel', () => {
 it('should call onOpenChange with false when cancel clicked', async () => {
 const user = userEvent.setup();

 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 // Wait for users to load
 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });

 const cancelButton = screen.getByRole('button', { name: 'Cancel' });
 await user.click(cancelButton);

 expect(mockOnOpenChange).toHaveBeenCalledWith(false);
 });
 });

 describe('Error Handling', () => {
 it('should show error message when user fetch fails', async () => {
 vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Network error'));

 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 await waitFor(() => {
 expect(screen.getByText('Network error')).toBeInTheDocument();
 });
 });
 });

 describe('Manager Label', () => {
 it('should have manager label', async () => {
 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 expect(screen.getByText('Manager')).toBeInTheDocument();

 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });
 });
 });

 describe('Loading States', () => {
 it('should show loading skeleton while fetching users', async () => {
 // Use deferred promise to control when the API resolves
 const { promise, resolve } = createDeferredPromise<typeof mockUsers>();
 vi.mocked(apiHelpers.get).mockReturnValue(promise);

 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 // Wait for skeleton to appear (Radix renders in portal, use document.body)
 await waitFor(() => {
 const skeleton = document.body.querySelector('.animate-pulse');
 expect(skeleton).toBeInTheDocument();
 });

 // Resolve to allow cleanup and avoid timeout
 resolve(mockUsers);

 // After resolution, skeleton should disappear and select should appear
 await waitFor(() => {
 expect(
 document.body.querySelector('.animate-pulse'),
 ).not.toBeInTheDocument();
 });

 // Verify select is now visible
 expect(screen.getByRole('combobox')).toBeInTheDocument();
 });

 it('should show loading state while assigning', async () => {
 const user = userEvent.setup();
 const { promise, resolve } = createDeferredPromise<void>();
 const slowOnAssign = vi.fn().mockReturnValue(promise);

 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={slowOnAssign}
 />,
 );

 // Wait for users to load
 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });

 // Open select and choose a user
 const selectTrigger = screen.getByRole('combobox');
 await user.click(selectTrigger);

 const option = screen.getByRole('option', { name: /John Doe/i });
 await user.click(option);

 // Click assign button
 const assignButton = screen.getByRole('button', {
 name: 'Assign Manager',
 });
 await user.click(assignButton);

 // Should show loading text
 expect(
 screen.getByRole('button', { name: 'Assigning...' }),
 ).toBeInTheDocument();

 // Resolve to complete and cleanup
 resolve();

 await waitFor(() => {
 expect(slowOnAssign).toHaveBeenCalledWith('1');
 });
 });
 });

 describe('User Selection and Assignment', () => {
 it('should call onAssign with selected user id', async () => {
 const user = userEvent.setup();
 mockOnAssign.mockResolvedValue(undefined);

 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 // Wait for users to load
 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });

 // Open select and choose a user
 const selectTrigger = screen.getByRole('combobox');
 await user.click(selectTrigger);

 const option = screen.getByRole('option', { name: /Jane Smith/i });
 await user.click(option);

 // Assign button should now be enabled
 const assignButton = screen.getByRole('button', {
 name: 'Assign Manager',
 });
 expect(assignButton).not.toBeDisabled();

 await user.click(assignButton);

 // Should call onAssign with selected user id
 expect(mockOnAssign).toHaveBeenCalledWith('2');
 });

 it('should close dialog after successful assignment', async () => {
 const user = userEvent.setup();
 mockOnAssign.mockResolvedValue(undefined);

 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 // Wait for users to load
 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });

 // Select a user
 const selectTrigger = screen.getByRole('combobox');
 await user.click(selectTrigger);

 const option = screen.getByRole('option', { name: /John Doe/i });
 await user.click(option);

 // Click assign
 const assignButton = screen.getByRole('button', {
 name: 'Assign Manager',
 });
 await user.click(assignButton);

 // Should close dialog after successful assignment
 await waitFor(() => {
 expect(mockOnOpenChange).toHaveBeenCalledWith(false);
 });
 });

 it('should pre-select current manager if provided', async () => {
 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 currentManagerId="2"
 onAssign={mockOnAssign}
 />,
 );

 // Wait for users to load
 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });

 // The select should show the current manager's name
 await waitFor(() => {
 expect(screen.getByRole('combobox')).toHaveTextContent(/Jane Smith/i);
 });
 });

 it('should enable assign button when user is selected', async () => {
 const user = userEvent.setup();

 render(
 <AssignManagerDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domainId={mockDomainId}
 onAssign={mockOnAssign}
 />,
 );

 // Wait for users to load
 await waitFor(() => {
 expect(apiHelpers.get).toHaveBeenCalled();
 });

 // Initially disabled
 const assignButton = screen.getByRole('button', {
 name: 'Assign Manager',
 });
 expect(assignButton).toBeDisabled();

 // Select a user
 const selectTrigger = screen.getByRole('combobox');
 await user.click(selectTrigger);

 const option = screen.getByRole('option', { name: /Bob Wilson/i });
 await user.click(option);

 // Now enabled
 expect(assignButton).not.toBeDisabled();
 });
 });
});
