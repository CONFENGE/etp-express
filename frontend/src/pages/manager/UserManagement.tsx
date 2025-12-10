import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      clearError();
    }
  }, [error, toast, clearError]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.cargo && user.cargo.toLowerCase().includes(query)),
    );
  }, [users, searchQuery]);

  const handleCreateUser = async (data: CreateDomainUserDto) => {
    try {
      await createUser(data);
      toast({
        title: 'Success',
        description:
          'User created successfully. They will receive an email with login instructions.',
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
        title: 'Success',
        description: 'User updated successfully.',
      });
    } catch {
      // Error already handled by store
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      toast({
        title: 'Success',
        description: 'User deleted successfully.',
      });
    } catch {
      // Error already handled by store
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateUser(id, { isActive });
      toast({
        title: 'Success',
        description: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch {
      // Error already handled by store
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      await resetUserPassword(id);
      toast({
        title: 'Success',
        description:
          'Password reset successfully. The user will receive an email with instructions.',
      });
    } catch {
      // Error already handled by store
    }
  };

  const isQuotaExhausted = quota ? quota.available <= 0 : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header with Back Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/manager" aria-label="Back to Dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                User Management
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Manage users in your domain
              </p>
            </div>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            disabled={isQuotaExhausted}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            New User
          </Button>
        </div>

        {/* Quota and Search Row */}
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          {/* Quota Card */}
          <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">User Quota</CardTitle>
              <CardDescription className="text-xs">
                Domain capacity
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
                  <CardTitle className="text-base">Users</CardTitle>
                  <CardDescription className="text-xs">
                    {filteredUsers.length} of {users.length} users
                    {searchQuery && ' (filtered)'}
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                    aria-label="Search users"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
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
      </div>
    </div>
  );
}
