import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserTable } from '@/components/manager/UserTable';
import { CreateUserDialog } from '@/components/manager/CreateUserDialog';
import { EditUserDialog } from '@/components/manager/EditUserDialog';
import { QuotaIndicator } from '@/components/manager/QuotaIndicator';
import {
  useManagerStore,
  DomainUser,
  CreateDomainUserDto,
  UpdateDomainUserDto,
} from '@/store/managerStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { useUndoToast } from '@/hooks/useUndoToast';
import { UndoToastContainer } from '@/components/ui/undo-toast';

/**
 * User Management page for Domain Managers.
 * Complete CRUD operations for users within their domain.
 *
 * Design: Apple Human Interface Guidelines
 * - Clean, minimal interface
 * - Generous spacing (space-y-6)
 * - Apple-style shadows
 * - Inter typography (inherited from globals)
 *
 * Features:
 * - List all domain users with pagination
 * - Create new users (email must match domain)
 * - Edit user name and role
 * - Toggle user active/inactive status
 * - Reset user password
 * - Delete users
 * - Search/filter users
 * - Quota indicator
 *
 * @security Only accessible to users with role: domain_manager
 */
export function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();
  const {
    users,
    quota,
    loading,
    error,
    fetchUsers,
    fetchQuota,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    clearError,
  } = useManagerStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<DomainUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Store hidden user IDs for optimistic UI updates
  const [hiddenUserIds, setHiddenUserIds] = useState<Set<string>>(new Set());
  // Undo toast hook
  const { showUndoToast, handleUndo, dismiss, activeToasts, isProcessing } =
    useUndoToast();

  // Extract domain from current user's email
  const domainSuffix = useMemo(() => {
    if (!currentUser?.email) return '';
    const parts = currentUser.email.split('@');
    return parts.length > 1 ? parts[1] : '';
  }, [currentUser?.email]);

  useEffect(() => {
    fetchUsers();
    fetchQuota();
  }, [fetchUsers, fetchQuota]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive',
      });
      clearError();
    }
  }, [error, toast, clearError]);

  // Filter users based on search query and hidden state
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return users.filter(
      (user) =>
        // Filter out hidden users (optimistic delete)
        !hiddenUserIds.has(user.id) &&
        // Apply search filter if query exists
        (!query ||
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.cargo && user.cargo.toLowerCase().includes(query))),
    );
  }, [users, searchQuery, hiddenUserIds]);

  const handleCreateUser = async (data: CreateDomainUserDto) => {
    try {
      await createUser(data);
      toast({
        title: 'Sucesso',
        description:
          'Usuário criado com sucesso. Ele receberá um e-mail com instruções de login.',
      });
    } catch {
      // Error already handled by store
    }
  };

  const handleEditUser = (user: DomainUser) => {
    setUserToEdit(user);
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async (id: string, data: UpdateDomainUserDto) => {
    try {
      await updateUser(id, data);
      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso.',
      });
    } catch {
      // Error already handled by store
    }
  };

  /**
   * Handle user deletion with undo capability.
   * Implements optimistic UI: hides user immediately, actual delete happens after timeout.
   */
  const handleDeleteUser = useCallback(
    (user: DomainUser) => {
      // Optimistic: hide user from list immediately
      setHiddenUserIds((prev) => new Set(prev).add(user.id));

      showUndoToast({
        message: `"${user.name}" excluído`,
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
            await deleteUser(user.id);
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
            // Error already handled by store
          }
        },
        duration: 5000,
      });
    },
    [showUndoToast, deleteUser],
  );

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateUser(id, { isActive });
      toast({
        title: 'Sucesso',
        description: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso.`,
      });
    } catch {
      // Error already handled by store
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      await resetUserPassword(id);
      toast({
        title: 'Sucesso',
        description:
          'Senha redefinida com sucesso. O usuário receberá um e-mail com instruções.',
      });
    } catch {
      // Error already handled by store
    }
  };

  const isQuotaExhausted = quota ? quota.available <= 0 : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: 'Gerenciamento', href: '/manager' },
            { label: 'Usuários' },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Gerenciamento de Usuários
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Gerencie os usuários do seu domínio
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            disabled={isQuotaExhausted}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Quota and Search Row */}
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          {/* Quota Card */}
          <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cota de Usuários</CardTitle>
              <CardDescription className="text-xs">
                Capacidade do domínio
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-4">
              <QuotaIndicator quota={quota} loading={loading} size="md" />
            </CardContent>
          </Card>

          {/* Search and Stats Card */}
          <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Usuários</CardTitle>
                  <CardDescription className="text-xs">
                    {filteredUsers.length} de {users.length} usuários
                    {searchQuery && ' (filtrado)'}
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, e-mail ou cargo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                    aria-label="Buscar usuários"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpar busca"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <UserTable
                users={filteredUsers}
                loading={loading}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onToggleActive={handleToggleActive}
                onResetPassword={handleResetPassword}
              />
            </CardContent>
          </Card>
        </div>

        {/* Dialogs */}
        <CreateUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateUser}
          domainSuffix={domainSuffix}
          quotaAvailable={quota?.available ?? 0}
        />

        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={userToEdit}
          onSubmit={handleUpdateUser}
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
