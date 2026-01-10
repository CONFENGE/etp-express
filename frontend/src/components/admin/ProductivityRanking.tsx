import { useEffect, useState, useCallback } from 'react';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodFilter } from '@/components/metrics';
import {
  useAdminStore,
  ProductivityRankingResponse,
} from '@/store/adminStore';

interface ProductivityRankingProps {
  className?: string;
}

/**
 * Productivity ranking table for System Admin dashboard.
 * Displays user productivity metrics with pagination.
 *
 * Part of advanced metrics feature (Issue #1367).
 *
 * @security Only renders data passed from admin store.
 * Parent component is responsible for auth checks.
 */
export function ProductivityRanking({ className }: ProductivityRankingProps) {
  const { productivityRanking, rankingLoading, fetchProductivityRanking } =
    useAdminStore();

  const [periodDays, setPeriodDays] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch ranking when period or page changes
  useEffect(() => {
    fetchProductivityRanking(periodDays, page, limit);
  }, [fetchProductivityRanking, periodDays, page, limit]);

  const handlePeriodChange = useCallback((days: number) => {
    setPeriodDays(days);
    setPage(1); // Reset to first page when period changes
  }, []);

  const handlePreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (productivityRanking && page < productivityRanking.totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <Card className={`shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${className ?? ''}`}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking de Produtividade
          </CardTitle>
          <CardDescription>
            Usuarios ordenados por ETPs concluidos
          </CardDescription>
        </div>
        <PeriodFilter
          onPeriodChange={handlePeriodChange}
          defaultPeriod={0}
        />
      </CardHeader>
      <CardContent>
        {rankingLoading ? (
          <RankingSkeleton />
        ) : !productivityRanking || productivityRanking.ranking.length === 0 ? (
          <EmptyRankingState />
        ) : (
          <>
            <RankingTable ranking={productivityRanking} />
            <PaginationControls
              page={page}
              totalPages={productivityRanking.totalPages}
              totalUsers={productivityRanking.totalUsers}
              onPrevious={handlePreviousPage}
              onNext={handleNextPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for ranking table.
 */
function RankingSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando ranking">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no users have ETPs.
 */
function EmptyRankingState() {
  return (
    <div className="py-8 text-center">
      <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50" />
      <p className="mt-4 text-muted-foreground">
        Nenhum usuario com ETPs no periodo selecionado
      </p>
    </div>
  );
}

interface RankingTableProps {
  ranking: ProductivityRankingResponse;
}

/**
 * Table displaying user productivity metrics.
 */
function RankingTable({ ranking }: RankingTableProps) {
  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">#</th>
            <th className="pb-3 font-medium">Usuario</th>
            <th className="pb-3 font-medium text-center">Criados</th>
            <th className="pb-3 font-medium text-center">Concluidos</th>
            <th className="pb-3 font-medium text-right">Taxa</th>
          </tr>
        </thead>
        <tbody>
          {ranking.ranking.map((user) => (
            <tr
              key={user.userId}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors"
            >
              <td className="py-3">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${getPositionStyle(user.position)}`}
                >
                  {user.position}
                </span>
              </td>
              <td className="py-3">
                <div>
                  <p className="font-medium">{user.userName}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.userEmail}
                  </p>
                </div>
              </td>
              <td className="py-3 text-center font-medium">
                {user.etpsCreated}
              </td>
              <td className="py-3 text-center font-medium">
                {user.etpsCompleted}
              </td>
              <td
                className={`py-3 text-right font-bold ${getCompletionRateColor(user.completionRate)}`}
              >
                {user.completionRate}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalUsers: number;
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * Pagination controls for the ranking table.
 */
function PaginationControls({
  page,
  totalPages,
  totalUsers,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between border-t pt-4">
      <span className="text-sm text-muted-foreground">
        {totalUsers} usuario{totalUsers !== 1 ? 's' : ''} no total
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={page <= 1}
          aria-label="Pagina anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          Pagina {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Proxima pagina"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
