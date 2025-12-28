import { Link } from 'react-router';
import { Eye, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthorizedDomain } from '@/store/adminStore';

interface DomainTableProps {
  domains: AuthorizedDomain[];
  loading: boolean;
  /** Handler for domain deletion. Receives the full domain object for undo capability. */
  onDelete: (domain: AuthorizedDomain) => void;
}

/**
 * Domain table component with actions for System Admin.
 * Displays authorized domains with sorting by domain name.
 *
 * Uses undo toast pattern for delete operations instead of confirmation dialog.
 * This provides a better UX by allowing immediate action with undo capability.
 *
 * @security Only accessible to users with role: system_admin
 */
export function DomainTable({ domains, loading, onDelete }: DomainTableProps) {
  /**
   * Handle delete click - directly triggers onDelete which shows undo toast.
   * No confirmation dialog needed since undo toast provides safety net.
   */
  const handleDeleteClick = (domain: AuthorizedDomain) => {
    onDelete(domain);
  };

  if (loading) {
    return <DomainTableSkeleton />;
  }

  if (domains.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-muted-foreground">
          Nenhum domínio cadastrado ainda.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Adicione seu primeiro domínio para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Domínio
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Usuários
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Gestor
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {domains.map((domain) => (
              <tr
                key={domain.id}
                className="transition-colors hover:bg-muted/50"
              >
                <td className="px-6 py-4">
                  <span className="font-medium">{domain.domain}</span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {domain.currentUsers ?? 0} / {domain.maxUsers}
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {domain.managerName || (
                    <span className="italic text-muted-foreground/60">
                      Não atribuído
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={domain.isActive ? 'success' : 'secondary'}>
                    {domain.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${domain.domain}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          to={`/admin/domains/${domain.id}`}
                          className="flex items-center"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteClick(domain)}
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
    </div>
  );
}

function DomainTableSkeleton() {
  return (
    <div className="rounded-lg border bg-card shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Domínio
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Usuários
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Gestor
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-16" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-6 py-4 text-right">
                  <Skeleton className="ml-auto h-8 w-8" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
