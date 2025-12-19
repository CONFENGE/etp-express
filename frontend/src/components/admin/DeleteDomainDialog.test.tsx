import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteDomainDialog } from './DeleteDomainDialog';
import { AuthorizedDomain } from '@/store/adminStore';

const mockDomain: AuthorizedDomain = {
 id: '1',
 domain: 'example.com',
 createdAt: '2024-01-01T00:00:00Z',
 maxUsers: 50,
 isActive: true,
 managerId: 'user-1',
 managerName: 'John Doe',
 currentUsers: 25,
};

describe('DeleteDomainDialog', () => {
 const mockOnConfirm = vi.fn();
 const mockOnOpenChange = vi.fn();

 beforeEach(() => {
 vi.clearAllMocks();
 });

 describe('Rendering', () => {
 it('should render alertdialog when open with domain', () => {
 render(
 <DeleteDomainDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domain={mockDomain}
 onConfirm={mockOnConfirm}
 isDeleting={false}
 />,
 );

 expect(screen.getByRole('alertdialog')).toBeInTheDocument();
 expect(screen.getByText(/example\.com/)).toBeInTheDocument();
 });

 it('should not render when domain is null', () => {
 render(
 <DeleteDomainDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domain={null}
 onConfirm={mockOnConfirm}
 isDeleting={false}
 />,
 );

 expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
 });

 it('should not render when closed', () => {
 render(
 <DeleteDomainDialog
 open={false}
 onOpenChange={mockOnOpenChange}
 domain={mockDomain}
 onConfirm={mockOnConfirm}
 isDeleting={false}
 />,
 );

 expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
 });

 it('should show warning message', () => {
 render(
 <DeleteDomainDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domain={mockDomain}
 onConfirm={mockOnConfirm}
 isDeleting={false}
 />,
 );

 expect(
 screen.getByText(/this action cannot be undone/i),
 ).toBeInTheDocument();
 });
 });

 describe('Actions', () => {
 it('should call onConfirm when delete button clicked', () => {
 render(
 <DeleteDomainDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domain={mockDomain}
 onConfirm={mockOnConfirm}
 isDeleting={false}
 />,
 );

 const deleteButton = screen.getByRole('button', {
 name: 'Delete Domain',
 });
 fireEvent.click(deleteButton);

 expect(mockOnConfirm).toHaveBeenCalled();
 });

 it('should call onOpenChange when cancel clicked', () => {
 render(
 <DeleteDomainDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domain={mockDomain}
 onConfirm={mockOnConfirm}
 isDeleting={false}
 />,
 );

 const cancelButton = screen.getByRole('button', { name: 'Cancel' });
 fireEvent.click(cancelButton);

 expect(mockOnOpenChange).toHaveBeenCalledWith(false);
 });
 });

 describe('Loading state', () => {
 it('should show loading text when deleting', () => {
 render(
 <DeleteDomainDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domain={mockDomain}
 onConfirm={mockOnConfirm}
 isDeleting={true}
 />,
 );

 expect(screen.getByText('Deleting...')).toBeInTheDocument();
 });

 it('should disable buttons when deleting', () => {
 render(
 <DeleteDomainDialog
 open={true}
 onOpenChange={mockOnOpenChange}
 domain={mockDomain}
 onConfirm={mockOnConfirm}
 isDeleting={true}
 />,
 );

 const deleteButton = screen.getByRole('button', { name: 'Deleting...' });
 const cancelButton = screen.getByRole('button', { name: 'Cancel' });

 expect(deleteButton).toBeDisabled();
 expect(cancelButton).toBeDisabled();
 });
 });
});
