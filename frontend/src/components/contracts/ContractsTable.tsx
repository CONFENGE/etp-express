/**
 * ContractsTable Component (#1660)
 *
 * Full-featured contracts table with:
 * - Server-side pagination
 * - Multi-column filtering
 * - Responsive design (cards on mobile)
 * - Skeleton loading states
 * - Actions (View/Edit)
 *
 * @see Technical Approach in #1660
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Eye, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useContracts } from '@/hooks/contracts/useContracts';
import { ContractFilters, Contrato } from '@/types/contract';
import { ContractsFilterBar } from './ContractsFilterBar';
import { ContractStatusBadge } from './ContractStatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ContractsTable() {
  const [filters, setFilters] = useState<ContractFilters>({});
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useContracts({ filters, page, limit });

  /**
   * Format currency values
   */
  const formatCurrency = (value: string): string => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  /**
   * Truncate long text
   */
  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-destructive">Erro ao carregar contratos. Tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <ContractsFilterBar filters={filters} onChange={setFilters} />

      {/* Table Container */}
      <div className="rounded-lg border bg-card">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: '120px' }}>Número</TableHead>
                <TableHead style={{ width: '300px' }}>Objeto</TableHead>
                <TableHead style={{ width: '200px' }}>Contratado</TableHead>
                <TableHead style={{ width: '120px' }}>Valor</TableHead>
                <TableHead style={{ width: '100px' }}>Vigência</TableHead>
                <TableHead style={{ width: '100px' }}>Status</TableHead>
                <TableHead style={{ width: '80px' }} className="text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton Loading Rows
                Array.from({ length: limit }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-8 w-16 bg-muted rounded animate-pulse ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data && data.data.length > 0 ? (
                data.data.map((contrato) => (
                  <TableRow key={contrato.id}>
                    <TableCell className="font-medium">{contrato.numero}</TableCell>
                    <TableCell>
                      <div className="max-w-[300px]" title={contrato.objeto}>
                        {truncate(contrato.objeto, 60)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]" title={contrato.contratadoRazaoSocial}>
                        {truncate(contrato.contratadoRazaoSocial, 30)}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(contrato.valorGlobal)}</TableCell>
                    <TableCell>
                      <time dateTime={contrato.vigenciaFim}>
                        {format(new Date(contrato.vigenciaFim), 'dd/MM/yyyy')}
                      </time>
                    </TableCell>
                    <TableCell>
                      <ContractStatusBadge status={contrato.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/contracts/${contrato.id}`}
                          aria-label={`Ver contrato ${contrato.numero}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/contracts/${contrato.id}/edit`}
                          aria-label={`Editar contrato ${contrato.numero}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum contrato encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-4 border rounded-lg space-y-3 animate-pulse"
              >
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-6 w-20 bg-muted rounded" />
              </div>
            ))
          ) : data && data.data.length > 0 ? (
            data.data.map((contrato) => (
              <ContractCard key={contrato.id} contrato={contrato} formatCurrency={formatCurrency} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum contrato encontrado com os filtros aplicados.
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Página {data.page} de {data.totalPages} ({data.total} contratos)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page === data.totalPages}
                aria-label="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Mobile Card Component
 * Responsive card for mobile view
 */
interface ContractCardProps {
  contrato: Contrato;
  formatCurrency: (value: string) => string;
}

function ContractCard({ contrato, formatCurrency }: ContractCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{contrato.numero}</p>
          <p className="text-sm text-muted-foreground">{contrato.objeto}</p>
        </div>
        <ContractStatusBadge status={contrato.status} />
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">Contratado:</span> {contrato.contratadoRazaoSocial}
        </p>
        <p>
          <span className="font-medium">Valor:</span> {formatCurrency(contrato.valorGlobal)}
        </p>
        <p>
          <span className="font-medium">Vigência:</span>{' '}
          <time dateTime={contrato.vigenciaFim}>
            {format(new Date(contrato.vigenciaFim), 'dd/MM/yyyy')}
          </time>
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = `/contracts/${contrato.id}`}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-2" />
          Ver
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = `/contracts/${contrato.id}/edit`}
          className="flex-1"
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>
    </div>
  );
}
