import {
  BarChart3,
  TrendingUp,
  MapPin,
  AlertTriangle,
  DollarSign,
  Layers,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import type { BenchmarkStats, AlertSummary } from '@/store/marketAnalyticsStore';

/**
 * Props for BenchmarkStatsCards component.
 */
export interface BenchmarkStatsCardsProps {
  stats: BenchmarkStats | null;
  alertSummary: AlertSummary | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Loading skeleton for stats cards.
 */
function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * BenchmarkStatsCards Component
 *
 * Displays key benchmark statistics in a grid of cards.
 * Part of the Market Intelligence Dashboard (#1273).
 *
 * Features:
 * - Total benchmarks count
 * - Categories covered
 * - Regions with data
 * - Alert summary
 * - Price range overview
 *
 * @example
 * ```tsx
 * <BenchmarkStatsCards
 *   stats={benchmarkStats}
 *   alertSummary={alertSummary}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function BenchmarkStatsCards({
  stats,
  alertSummary,
  isLoading = false,
  className,
}: BenchmarkStatsCardsProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
          className,
        )}
      >
        {[...Array(6)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const pendingAlerts = alertSummary?.pending || 0;
  const criticalAlerts =
    (alertSummary?.byLevel?.warning || 0) +
    (alertSummary?.byLevel?.critical || 0);

  return (
    <div
      className={cn(
        'grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
        className,
      )}
      data-testid="benchmark-stats-cards"
    >
      {/* Total Benchmarks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total de Benchmarks
          </CardTitle>
          <BarChart3
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.totalBenchmarks.toLocaleString('pt-BR') || '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            Referencias de preco indexadas
          </p>
        </CardContent>
      </Card>

      {/* Categories Covered */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Categorias Cobertas
          </CardTitle>
          <Layers
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.categoriesWithBenchmarks.toLocaleString('pt-BR') || '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            CATMAT/CATSER com dados
          </p>
        </CardContent>
      </Card>

      {/* Regions with Data */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Regioes Cobertas
          </CardTitle>
          <MapPin
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.regionsWithBenchmarks || '0'}/27
          </div>
          <p className="text-xs text-muted-foreground">
            Estados com benchmarks
          </p>
        </CardContent>
      </Card>

      {/* Average Median Price */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Preco Medio
          </CardTitle>
          <DollarSign
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.averageMedianPrice
              ? formatCurrency(stats.averageMedianPrice)
              : 'R$ 0,00'}
          </div>
          <p className="text-xs text-muted-foreground">
            Mediana geral dos benchmarks
          </p>
        </CardContent>
      </Card>

      {/* Price Trend Indicator */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Faixa de Precos
          </CardTitle>
          <TrendingUp
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">
            {stats?.priceRangeMin && stats?.priceRangeMax ? (
              <>
                {formatCurrency(stats.priceRangeMin)} -{' '}
                {formatCurrency(stats.priceRangeMax)}
              </>
            ) : (
              'N/A'
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Min - Max dos benchmarks
          </p>
        </CardContent>
      </Card>

      {/* Alert Summary */}
      <Card
        className={cn(
          criticalAlerts > 0 && 'border-destructive/50 bg-destructive/5',
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Alertas Pendentes
          </CardTitle>
          <AlertTriangle
            className={cn(
              'h-4 w-4',
              criticalAlerts > 0 ? 'text-destructive' : 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'text-2xl font-bold',
              criticalAlerts > 0 && 'text-destructive',
            )}
          >
            {pendingAlerts}
          </div>
          <p className="text-xs text-muted-foreground">
            {criticalAlerts > 0
              ? `${criticalAlerts} criticos/warning`
              : 'Nenhum alerta critico'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
