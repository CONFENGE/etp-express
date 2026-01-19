import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import type { PriceTrendData, PriceTrendPoint } from '@/store/marketAnalyticsStore';

/**
 * Props for PriceTrendChart component.
 */
export interface PriceTrendChartProps {
  data: PriceTrendData | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Get trend icon based on trend direction.
 */
function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-destructive" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-emerald-600" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * Get trend badge variant based on trend direction.
 */
function getTrendBadge(trend: 'up' | 'down' | 'stable', percentage: number) {
  const sign = percentage >= 0 ? '+' : '';
  switch (trend) {
    case 'up':
      return (
        <Badge variant="destructive" className="text-xs">
          {getTrendIcon(trend)}
          <span className="ml-1">{sign}{percentage.toFixed(1)}%</span>
        </Badge>
      );
    case 'down':
      return (
        <Badge variant="default" className="bg-emerald-600 text-xs">
          {getTrendIcon(trend)}
          <span className="ml-1">{sign}{percentage.toFixed(1)}%</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          {getTrendIcon(trend)}
          <span className="ml-1">Estavel</span>
        </Badge>
      );
  }
}

/**
 * Loading skeleton for the trend chart.
 */
function TrendChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </CardTitle>
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Empty state when no trend data is available.
 */
function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Tendencia de Precos
        </CardTitle>
        <CardDescription>
          Evolucao temporal dos precos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mb-2" />
          <p className="text-sm">Nenhum dado de tendencia disponivel</p>
          <p className="text-xs">
            Selecione uma categoria para ver a evolucao de precos
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Custom tooltip for the trend chart.
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: PriceTrendPoint;
  }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  // Format date label (YYYY-MM to Month/Year)
  const formatDate = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];
    return `${months[parseInt(month, 10) - 1]}/${year}`;
  };

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm">{formatDate(label || '')}</p>
      <div className="mt-2 space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Mediana:</span>{' '}
          <span className="font-medium">{formatCurrency(data.medianPrice)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Min:</span>{' '}
          {formatCurrency(data.minPrice)}
        </p>
        <p>
          <span className="text-muted-foreground">Max:</span>{' '}
          {formatCurrency(data.maxPrice)}
        </p>
        <p>
          <span className="text-muted-foreground">Amostras:</span>{' '}
          {data.priceCount}
        </p>
      </div>
    </div>
  );
}

/**
 * PriceTrendChart Component
 *
 * Displays a line chart showing price evolution over time.
 * Part of the Market Intelligence Dashboard (#1273).
 *
 * Features:
 * - Line chart with median price over time
 * - Area chart showing min/max range
 * - Trend indicator badge (up/down/stable)
 * - Tooltips with detailed monthly data
 * - Responsive layout
 *
 * @example
 * ```tsx
 * <PriceTrendChart
 *   data={priceTrendData}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function PriceTrendChart({
  data,
  isLoading = false,
  className,
}: PriceTrendChartProps) {
  if (isLoading) {
    return <TrendChartSkeleton />;
  }

  if (!data || !data.points || data.points.length === 0) {
    return <EmptyState />;
  }

  // Format X axis labels
  const formatXAxis = (dateStr: string) => {
    const [, month] = dateStr.split('-');
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    return months[parseInt(month, 10) - 1];
  };

  return (
    <Card className={cn(className)} data-testid="price-trend-chart">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" aria-hidden="true" />
              Tendencia de Precos
            </CardTitle>
            <CardDescription>
              {data.categoryName} - Ultimos 12 meses
            </CardDescription>
          </div>
          {getTrendBadge(data.overallTrend, data.trendPercentage)}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart
            data={data.points}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="priceRange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Min-Max range area */}
            <Area
              type="monotone"
              dataKey="maxPrice"
              stroke="transparent"
              fill="url(#priceRange)"
              fillOpacity={1}
            />
            {/* Median price line */}
            <Line
              type="monotone"
              dataKey="medianPrice"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Summary footer */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-muted-foreground">Menor Preco</p>
            <p className="font-semibold">
              {formatCurrency(Math.min(...data.points.map((p) => p.minPrice)))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Mediana Atual</p>
            <p className="font-semibold">
              {formatCurrency(data.points[data.points.length - 1]?.medianPrice || 0)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Maior Preco</p>
            <p className="font-semibold">
              {formatCurrency(Math.max(...data.points.map((p) => p.maxPrice)))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
