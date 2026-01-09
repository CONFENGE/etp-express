import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type AvgCompletionTimeData } from '@/hooks/useAvgCompletionTime';

/**
 * Props for AvgCompletionTimeCard component
 */
export interface AvgCompletionTimeCardProps {
  /** Average completion time data from the API */
  data: AvgCompletionTimeData | null;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Get time color based on average completion time in minutes.
 * Faster completion times are better (green).
 */
function getTimeColor(minutes: number): string {
  // Less than 1 day (1440 min) = excellent
  if (minutes < 1440) return 'text-green-600';
  // Less than 3 days (4320 min) = good
  if (minutes < 4320) return 'text-blue-600';
  // Less than 7 days (10080 min) = moderate
  if (minutes < 10080) return 'text-yellow-600';
  // More than 7 days = needs attention
  return 'text-orange-600';
}

/**
 * Skeleton loader for the card content.
 */
function AvgCompletionTimeCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Tempo Medio</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * AvgCompletionTimeCard Component
 *
 * Displays the average ETP completion time metric.
 * Part of the advanced metrics feature (Issue #1364).
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useAvgCompletionTime();
 *
 * <AvgCompletionTimeCard data={data} isLoading={isLoading} />
 * ```
 */
export function AvgCompletionTimeCard({
  data,
  isLoading = false,
  className,
}: AvgCompletionTimeCardProps) {
  if (isLoading || !data) {
    return <AvgCompletionTimeCardSkeleton />;
  }

  const hasData = data.completedCount > 0;

  return (
    <Card className={cn(className)} data-testid="avg-completion-time-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Tempo Medio</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'text-2xl font-bold',
            hasData
              ? getTimeColor(data.avgTimeMinutes)
              : 'text-muted-foreground',
          )}
          data-testid="avg-completion-time-value"
        >
          {data.formatted}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {hasData
            ? `Baseado em ${data.completedCount} ${data.completedCount === 1 ? 'ETP concluido' : 'ETPs concluidos'}`
            : 'Nenhum ETP concluido ainda'}
        </p>
        <p className="text-xs text-muted-foreground">para conclusao</p>
      </CardContent>
    </Card>
  );
}
