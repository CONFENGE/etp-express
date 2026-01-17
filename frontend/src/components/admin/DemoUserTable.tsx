import { Trash2, RefreshCw, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { DemoUser } from '@/store/adminStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DemoUserTableProps {
  demoUsers: DemoUser[];
  loading: boolean;
  /** Handler for demo user deletion. Receives the full user object for undo capability. */
  onDelete: (user: DemoUser) => void;
  /** Handler for demo user reset (unblock by resetting ETP count). */
  onReset: (userId: string) => void;
}

/**
 * Demo user table component with actions for System Admin.
 * Displays demo users with ETP usage and status.
 *
 * Uses undo toast pattern for delete operations instead of confirmation dialog.
 * Reset operations show immediate confirmation dialog in the parent component.
 *
 * @security Only accessible to users with role: system_admin
 * Part of Demo User Management System (Issue #1445)
 */
export function DemoUserTable({
  demoUsers,
  loading,
  onDelete,
  onReset,
}: DemoUserTableProps) {
  /**
   * Handle delete click - directly triggers onDelete which shows undo toast.
   * No confirmation dialog needed since undo toast provides safety net.
   */
  const handleDeleteClick = (user: DemoUser) => {
    onDelete(user);
  };

  /**
   * Handle reset click - requires confirmation since it's immediate (no undo).
   */
  const handleResetClick = (user: DemoUser) => {
    if (
      window.confirm(
        `Resetar usuário "${user.email}"?\n\nIsso resetará o contador de ETPs para 0 e desbloqueará a conta.`,
      )
    ) {
      onReset(user.id);
    }
  };

  if (loading) {
    return <DemoUserTableSkeleton />;
  }

  if (demoUsers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-muted-foreground">
          Nenhum usuário demo cadastrado ainda.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie a primeira conta demo para começar.
        </p>
      </div>
    );
  }

  return (
    <Card variant="default">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                ETPs
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Último Login
              </th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {demoUsers.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-muted/50">
                <td className="px-6 py-4">
                  <span className="font-medium">{user.email}</span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{user.name}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  <span
                    className={
                      user.isBlocked ? 'font-semibold text-destructive' : ''
                    }
                  >
                    {user.etpCreatedCount} / {user.etpLimitCount}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={
                      user.isBlocked
                        ? 'destructive'
                        : user.isActive
                          ? 'success'
                          : 'secondary'
                    }
                  >
                    {user.isBlocked
                      ? 'Bloqueado'
                      : user.isActive
                        ? 'Ativo'
                        : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">
                  {user.lastLoginAt ? (
                    format(new Date(user.lastLoginAt), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })
                  ) : (
                    <span className="italic text-muted-foreground/60">
                      Nunca
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {user.isBlocked && (
                        <DropdownMenuItem
                          onClick={() => handleResetClick(user)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resetar Contador
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(user)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
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
  );
}

/**
 * Loading skeleton for demo user table.
 */
function DemoUserTableSkeleton() {
  return (
    <Card variant="default">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                ETPs
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Último Login
              </th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...Array(3)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-16" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-5 w-20" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-6 py-4 text-right">
                  <Skeleton className="h-8 w-8 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
