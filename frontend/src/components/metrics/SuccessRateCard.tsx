import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type SuccessRateData } from '@/hooks/useSuccessRate';

/**
 * Props for SuccessRateCard component
 */
export interface SuccessRateCardProps {
  /** Success rate data from the API */
  data: SuccessRateData | null;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Get trend icon and color based on trend direction.
 */
function getTrendDisplay(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return {
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        label: 'Tendencia de alta',
      };
    case 'down':
      return {
        icon: TrendingDown,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        label: 'Tendencia de queda',
      };
    case 'stable':
    default:
      return {
        icon: Minus,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        label: 'Estavel',
      };
  }
}

/**
 * Get rate color based on success rate value.
 */
function getRateColor(rate: number): string {
  if (rate >= 70) return 'text-green-600';
  if (rate >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Skeleton loader for the card content.
 */
function SuccessRateCardSkeleton() {
  return (
    <GlassSurface intensity="medium" className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-20 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </CardContent>
    </GlassSurface>
  );
}

/**
 * SuccessRateCard Component
 *
 * Displays the ETP success rate metric with trend indicator.
 * Part of the advanced metrics feature (Issue #1363).
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSuccessRate();
 *
 * <SuccessRateCard data={data} isLoading={isLoading} />
 * ```
 */
export function SuccessRateCard({
  data,
  isLoading = false,
  className,
}: SuccessRateCardProps) {
  if (isLoading || !data) {
    return <SuccessRateCardSkeleton />;
  }

  const trendDisplay = getTrendDisplay(data.trend);
  const TrendIcon = trendDisplay.icon;
  const rateDiff = data.rate - data.previousRate;
  const formattedDiff =
    rateDiff > 0 ? `+${rateDiff.toFixed(1)}%` : `${rateDiff.toFixed(1)}%`;

  return (
    <GlassSurface intensity="medium" className={cn('shadow-lg', className)} data-testid="success-rate-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div
            className={cn('text-2xl font-bold', getRateColor(data.rate))}
            data-testid="success-rate-value"
          >
            {data.rate.toFixed(1)}%
          </div>
          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
              trendDisplay.bgColor,
              trendDisplay.color,
            )}
            title={trendDisplay.label}
            data-testid="success-rate-trend"
          >
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            <span>{formattedDiff}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {data.completedCount} de {data.totalCount} ETPs concluidos
        </p>
        <p className="text-xs text-muted-foreground">nos ultimos 30 dias</p>
      </CardContent>
    </GlassSurface>
  );
}
