import { useMemo } from 'react';
import { MapPin, Info } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, formatCurrency } from '@/lib/utils';
import type { RegionalBenchmarkData } from '@/store/marketAnalyticsStore';

/**
 * Props for RegionalHeatMap component.
 */
export interface RegionalHeatMapProps {
  data: RegionalBenchmarkData[];
  isLoading?: boolean;
  className?: string;
}

/**
 * Get color based on deviation from national median.
 * Negative = below median (green/good)
 * Positive = above median (red/expensive)
 */
function getDeviationColor(deviation: number): string {
  if (deviation <= -15) return 'bg-emerald-500';
  if (deviation <= -5) return 'bg-emerald-400';
  if (deviation <= 5) return 'bg-amber-400';
  if (deviation <= 15) return 'bg-orange-400';
  if (deviation <= 30) return 'bg-red-400';
  return 'bg-red-600';
}

/**
 * Get text color based on deviation for contrast.
 */
function getDeviationTextColor(deviation: number): string {
  if (deviation <= -15 || deviation > 30) return 'text-white';
  return 'text-foreground';
}

/**
 * Loading skeleton for the heat map.
 */
function HeatMapSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </CardTitle>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">
          {[...Array(27)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state when no regional data is available.
 */
function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa Regional de Precos
        </CardTitle>
        <CardDescription>
          Comparativo de precos por estado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <MapPin className="h-12 w-12 mb-2" />
          <p className="text-sm">Nenhum dado regional disponivel</p>
          <p className="text-xs">
            Execute uma pesquisa de precos para visualizar o mapa
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Single state cell in the heat map.
 */
function StateCell({
  data,
}: {
  data: RegionalBenchmarkData;
}) {
  const bgColor = getDeviationColor(data.deviationFromNational);
  const textColor = getDeviationTextColor(data.deviationFromNational);
  const deviationSign = data.deviationFromNational >= 0 ? '+' : '';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              'w-full p-2 rounded-lg transition-all',
              'hover:scale-105 hover:shadow-md',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              bgColor,
              textColor,
            )}
            aria-label={`${data.ufName}: ${formatCurrency(data.medianPrice)}, ${deviationSign}${data.deviationFromNational.toFixed(1)}% da mediana nacional`}
          >
            <div className="text-xs font-bold">{data.uf}</div>
            <div className="text-xs mt-1 truncate">
              {formatCurrency(data.medianPrice)}
            </div>
            <div className="text-xs opacity-80">
              {deviationSign}
              {data.deviationFromNational.toFixed(0)}%
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{data.ufName}</p>
            <p>
              <span className="text-muted-foreground">Mediana:</span>{' '}
              {formatCurrency(data.medianPrice)}
            </p>
            <p>
              <span className="text-muted-foreground">Amostras:</span>{' '}
              {data.priceCount.toLocaleString('pt-BR')}
            </p>
            <p>
              <span className="text-muted-foreground">Desvio:</span>{' '}
              <span
                className={cn(
                  data.deviationFromNational > 0
                    ? 'text-destructive'
                    : 'text-emerald-600',
                )}
              >
                {deviationSign}
                {data.deviationFromNational.toFixed(1)}%
              </span>{' '}
              da mediana nacional
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * RegionalHeatMap Component
 *
 * Displays a heat map of prices by Brazilian state.
 * Part of the Market Intelligence Dashboard (#1273).
 *
 * Features:
 * - Color-coded tiles showing deviation from national median
 * - Tooltips with detailed price information
 * - Responsive grid layout
 * - WCAG 2.1 AA compliant colors and contrast
 *
 * Color Legend:
 * - Green tones: Below national median (cheaper)
 * - Yellow/Orange: Near national median
 * - Red tones: Above national median (more expensive)
 *
 * @example
 * ```tsx
 * <RegionalHeatMap
 *   data={regionalData}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function RegionalHeatMap({
  data,
  isLoading = false,
  className,
}: RegionalHeatMapProps) {
  // Sort states alphabetically for consistent display
  const sortedData = useMemo(
    () => [...data].sort((a, b) => a.uf.localeCompare(b.uf)),
    [data],
  );

  if (isLoading) {
    return <HeatMapSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card className={cn(className)} data-testid="regional-heat-map">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" aria-hidden="true" />
          Mapa Regional de Precos
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          Comparativo de precos por estado vs mediana nacional
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Verde = abaixo da mediana (mais barato)</p>
                <p>Vermelho = acima da mediana (mais caro)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Heat map grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">
          {sortedData.map((region) => (
            <StateCell key={region.uf} data={region} />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground">Legenda:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>&lt;-15%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-400" />
              <span>-15% a -5%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-400" />
              <span>-5% a +5%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-400" />
              <span>+5% a +15%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span>+15% a +30%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-600" />
              <span>&gt;+30%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
