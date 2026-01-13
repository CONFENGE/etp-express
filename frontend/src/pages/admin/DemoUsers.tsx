import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { DemoUserTable } from '@/components/admin/DemoUserTable';
import { CreateDemoUserDialog } from '@/components/admin/CreateDemoUserDialog';
import { useAdminStore, DemoUser, DemoUserWithPassword } from '@/store/adminStore';
import { useToast } from '@/hooks/useToast';
import { useUndoToast } from '@/hooks/useUndoToast';
import { UndoToastContainer } from '@/components/ui/undo-toast';

/**
 * Demo Users Management page for System Admin.
 * Provides CRUD operations for demo user accounts.
 *
 * Demo users are testing accounts with ETP creation limits:
 * - Default limit: 3 ETPs per account
 * - No time expiration
 * - Blocked state when limit reached (read-only access)
 *
 * Design: Apple Human Interface Guidelines
 * - Generous spacing
 * - Apple-style shadows
 * - Minimal, focused UI
 *
 * @security Only accessible to users with role: system_admin
 * Part of Demo User Management System (Issue #1445)
 */
export function DemoUsers() {
  const {
    demoUsers,
    demoUsersLoading,
    error,
    fetchDemoUsers,
    createDemoUser,
    deleteDemoUser,
    resetDemoUser,
  } = useAdminStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<DemoUserWithPassword | null>(
    null,
  );
  // Store hidden user IDs for optimistic UI updates
  const [hiddenUserIds, setHiddenUserIds] = useState<Set<string>>(new Set());
  const { success, error: showError } = useToast();
  const { showUndoToast, handleUndo, dismiss, activeToasts, isProcessing } =
    useUndoToast();

  // Track last shown error to prevent infinite re-render loops
  const lastShownErrorRef = useRef<string | null>(null);

  useEffect(() => {
    fetchDemoUsers();
  }, [fetchDemoUsers]);

  useEffect(() => {
    // Only show error if it's a new error (prevents infinite loop)
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      showError(error);
    } else if (!error) {
      // Reset ref when error is cleared
      lastShownErrorRef.current = null;
    }
  }, [error, showError]);

  const handleCreateDemoUser = async (data: {
    email: string;
    name: string;
    etpLimitCount?: number;
  }) => {
    try {
      const result = await createDemoUser(data);
      setCreatedUser(result);
      success('Usuário demo criado com sucesso');
    } catch {
      showError('Falha ao criar usuário demo');
      throw new Error('Falha ao criar usuário demo');
    }
  };

  /**
   * Handle demo user deletion with undo capability.
   * Implements optimistic UI: hides user immediately, actual delete happens after timeout.
   */
  const handleDeleteDemoUser = useCallback(
    (user: DemoUser) => {
      // Optimistic: hide user from list immediately
      setHiddenUserIds((prev) => new Set(prev).add(user.id));

      showUndoToast({
        message: `"${user.email}" excluído`,
        undoAction: () => {
          // Restore user in the list
          setHiddenUserIds((prev) => {
            const next = new Set(prev);
            next.delete(user.id);
            return next;
          });
        },
        onConfirm: async () => {
          try {
            // Actually delete the user
            await deleteDemoUser(user.id);
            // Clean up hidden state
            setHiddenUserIds((prev) => {
              const next = new Set(prev);
              next.delete(user.id);
              return next;
            });
          } catch {
            // On error, restore the user
            setHiddenUserIds((prev) => {
              const next = new Set(prev);
              next.delete(user.id);
              return next;
            });
            showError('Falha ao excluir usuário demo');
          }
        },
        duration: 5000,
      });
    },
    [showUndoToast, deleteDemoUser, showError],
  );

  /**
   * Handle demo user reset (unblock by resetting ETP count to 0).
   * No undo capability - immediate action with confirmation in table component.
   */
  const handleResetDemoUser = useCallback(
    async (userId: string) => {
      try {
        await resetDemoUser(userId);
        success('Usuário demo resetado com sucesso');
      } catch {
        showError('Falha ao resetar usuário demo');
      }
    },
    [resetDemoUser, success, showError],
  );

  // Filter out hidden users for optimistic UI
  const visibleDemoUsers = demoUsers.filter((u) => !hiddenUserIds.has(u.id));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: 'Administração', href: '/admin' },
            { label: 'Usuários Demo' },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Usuários Demo
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Gerenciar contas de teste com limite de ETPs
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Conta Demo
          </Button>
        </div>

        {/* Demo User Table */}
        <DemoUserTable
          demoUsers={visibleDemoUsers}
          loading={demoUsersLoading}
          onDelete={handleDeleteDemoUser}
          onReset={handleResetDemoUser}
        />

        {/* Create Demo User Dialog */}
        <CreateDemoUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateDemoUser}
          createdUser={createdUser}
          onCreatedUserClose={() => setCreatedUser(null)}
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
