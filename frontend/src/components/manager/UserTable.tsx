import { useState } from 'react';
import {
  Edit,
  Trash2,
  MoreHorizontal,
  KeyRound,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { DomainUser } from '@/store/managerStore';
import { ResetPasswordDialog } from './ResetPasswordDialog';

interface UserTableProps {
  users: DomainUser[];
  loading: boolean;
  onEdit: (user: DomainUser) => void;
  /** Handler for user deletion. Receives the full user object for undo capability. */
  onDelete: (user: DomainUser) => void;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onResetPassword: (id: string) => Promise<void>;
}

/**
 * User table component with actions for Domain Manager.
 * Displays domain users with sorting by name.
 *
 * Uses undo toast pattern for delete operations instead of confirmation dialog.
 * This provides a better UX by allowing immediate action with undo capability.
 *
 * Design: Apple Human Interface Guidelines
 * - Clean table layout with generous spacing
 * - Action menu with clear icons
 * - Status badges with semantic colors
 *
 * @security Only accessible to users with role: domain_manager
 */
export function UserTable({
  users,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
  onResetPassword,
}: UserTableProps) {
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DomainUser | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  /**
   * Handle delete click - directly triggers onDelete which shows undo toast.
   * No confirmation dialog needed since undo toast provides safety net.
   */
  const handleDeleteClick = (user: DomainUser) => {
    onDelete(user);
  };

  const handleResetPasswordClick = (user: DomainUser) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPasswordConfirm = async () => {
    if (!selectedUser) return;

    setIsResettingPassword(true);
    try {
      await onResetPassword(selectedUser.id);
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleToggleActive = async (user: DomainUser) => {
    await onToggleActive(user.id, !user.isActive);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return <UserTableSkeleton />;
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-muted-foreground">No users in your domain yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your first user to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <Card variant="default">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Email
                </th>
                <th className="hidden px-6 py-3 text-left text-sm font-medium text-muted-foreground sm:table-cell">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="hidden px-6 py-3 text-left text-sm font-medium text-muted-foreground lg:table-cell">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                          user.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {getInitials(user.name)}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground sm:table-cell">
                    {user.cargo || (
                      <span className="italic text-muted-foreground/60">
                        Not set
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant={user.isActive ? 'success' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {user.mustChangePassword && (
                        <Badge variant="warning" className="text-xs">
                          Pending setup
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground lg:table-cell">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${user.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleResetPasswordClick(user)}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(user)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        user={selectedUser}
        onConfirm={handleResetPasswordConfirm}
        isResetting={isResettingPassword}
      />
    </>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function UserTableSkeleton() {
  return (
    <Card variant="default">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Email
              </th>
              <th className="hidden px-6 py-3 text-left text-sm font-medium text-muted-foreground sm:table-cell">
                Role
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="hidden px-6 py-3 text-left text-sm font-medium text-muted-foreground lg:table-cell">
                Created
              </th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="hidden px-6 py-4 sm:table-cell">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="hidden px-6 py-4 lg:table-cell">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-6 py-4 text-right">
                  <Skeleton className="ml-auto h-8 w-8" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
