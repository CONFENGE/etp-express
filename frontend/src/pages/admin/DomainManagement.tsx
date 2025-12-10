import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DomainTable } from '@/components/admin/DomainTable';
import { CreateDomainDialog } from '@/components/admin/CreateDomainDialog';
import { useAdminStore } from '@/store/adminStore';
import { useToast } from '@/hooks/useToast';

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
  const { success, error: showError } = useToast();

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

  const handleDeleteDomain = async (id: string) => {
    try {
      await deleteDomain(id);
      success('Domain deleted successfully');
    } catch {
      showError('Failed to delete domain');
      throw new Error('Failed to delete domain');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin" aria-label="Back to admin dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Domains
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Manage authorized institutional domains
              </p>
            </div>
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
          domains={domains}
          loading={loading}
          onDelete={handleDeleteDomain}
        />

        {/* Create Domain Dialog */}
        <CreateDomainDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateDomain}
        />
      </div>
    </div>
  );
}
