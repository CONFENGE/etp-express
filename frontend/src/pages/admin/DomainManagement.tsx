import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { DomainTable } from '@/components/admin/DomainTable';
import { CreateDomainDialog } from '@/components/admin/CreateDomainDialog';
import { useAdminStore, AuthorizedDomain } from '@/store/adminStore';
import { useToast } from '@/hooks/useToast';
import { useUndoToast } from '@/hooks/useUndoToast';
import { UndoToastContainer } from '@/components/ui/undo-toast';

/**
 * Domain Management page for System Admin.
 * Provides CRUD operations for authorized domains.
 *
 * Design: Apple Human Interface Guidelines
 * - Generous spacing
 * - Apple-style shadows
 * - Minimal, focused UI
 *
 * @security Only accessible to users with role: system_admin
 */
export function DomainManagement() {
 const { domains, loading, error, fetchDomains, createDomain, deleteDomain } =
 useAdminStore();
 const [createDialogOpen, setCreateDialogOpen] = useState(false);
 // Store hidden domain IDs for optimistic UI updates
 const [hiddenDomainIds, setHiddenDomainIds] = useState<Set<string>>(
 new Set(),
 );
 const { success, error: showError } = useToast();
 const { showUndoToast, handleUndo, dismiss, activeToasts, isProcessing } =
 useUndoToast();

 useEffect(() => {
 fetchDomains();
 }, [fetchDomains]);

 useEffect(() => {
 if (error) {
 showError(error);
 }
 }, [error, showError]);

 const handleCreateDomain = async (data: {
 domain: string;
 maxUsers: number;
 }) => {
 try {
 await createDomain(data);
 success('Domain created successfully');
 } catch {
 showError('Failed to create domain');
 throw new Error('Failed to create domain');
 }
 };

 /**
 * Handle domain deletion with undo capability.
 * Implements optimistic UI: hides domain immediately, actual delete happens after timeout.
 */
 const handleDeleteDomain = useCallback(
 (domain: AuthorizedDomain) => {
 // Optimistic: hide domain from list immediately
 setHiddenDomainIds((prev) => new Set(prev).add(domain.id));

 showUndoToast({
 message: `"${domain.domain}" excluído`,
 undoAction: () => {
 // Restore domain in the list
 setHiddenDomainIds((prev) => {
 const next = new Set(prev);
 next.delete(domain.id);
 return next;
 });
 },
 onConfirm: async () => {
 try {
 // Actually delete the domain
 await deleteDomain(domain.id);
 // Clean up hidden state
 setHiddenDomainIds((prev) => {
 const next = new Set(prev);
 next.delete(domain.id);
 return next;
 });
 } catch {
 // On error, restore the domain
 setHiddenDomainIds((prev) => {
 const next = new Set(prev);
 next.delete(domain.id);
 return next;
 });
 showError('Failed to delete domain');
 }
 },
 duration: 5000,
 });
 },
 [showUndoToast, deleteDomain, showError],
 );

 // Filter out hidden domains for optimistic UI
 const visibleDomains = domains.filter((d) => !hiddenDomainIds.has(d.id));

 return (
 <div className="min-h-screen bg-background">
 <div className="container mx-auto py-8 space-y-6">
 {/* Breadcrumb Navigation */}
 <Breadcrumb
 items={[
 { label: 'Administração', href: '/admin' },
 { label: 'Domínios' },
 ]}
 />

 {/* Header */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
 Domains
 </h1>
 <p className="text-sm text-muted-foreground sm:text-base">
 Manage authorized institutional domains
 </p>
 </div>
 <Button
 onClick={() => setCreateDialogOpen(true)}
 className="w-full sm:w-auto"
 >
 <Plus className="mr-2 h-4 w-4" />
 Add Domain
 </Button>
 </div>

 {/* Domain Table */}
 <DomainTable
 domains={visibleDomains}
 loading={loading}
 onDelete={handleDeleteDomain}
 />

 {/* Create Domain Dialog */}
 <CreateDomainDialog
 open={createDialogOpen}
 onOpenChange={setCreateDialogOpen}
 onSubmit={handleCreateDomain}
 />

 {/* Undo Toast Container */}
 <UndoToastContainer
 toasts={activeToasts}
 onUndo={handleUndo}
 onDismiss={dismiss}
 isProcessing={isProcessing}
 />
 </div>
 </div>
 );
}
