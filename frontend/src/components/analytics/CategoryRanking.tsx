import { BarChart3, TrendingUp, Award } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import type { CategoryRanking as CategoryRankingType } from '@/store/marketAnalyticsStore';

/**
 * Props for CategoryRanking component.
 */
export interface CategoryRankingProps {
  data: CategoryRankingType[];
  isLoading?: boolean;
  className?: string;
}

// Colors for the bars - following brand palette
const BAR_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

/**
 * Get color for bar based on index.
 */
function getBarColor(index: number): string {
  return BAR_COLORS[index % BAR_COLORS.length];
}

/**
 * Loading skeleton for the ranking chart.
 */
function RankingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </CardTitle>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state when no category data is available.
 */
function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Top Categorias Contratadas
        </CardTitle>
        <CardDescription>
          Categorias com maior volume de contratacoes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-2" />
          <p className="text-sm">Nenhuma categoria disponivel</p>
          <p className="text-xs">
            Dados serao exibidos conforme pesquisas forem realizadas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Custom tooltip for the bar chart.
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: CategoryRankingType;
  }>;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 max-w-xs">
      <p className="font-semibold text-sm truncate">{data.categoryName}</p>
      <p className="text-xs text-muted-foreground">{data.categoryCode}</p>
      <div className="mt-2 space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Contratos:</span>{' '}
          {data.contractCount.toLocaleString('pt-BR')}
        </p>
        <p>
          <span className="text-muted-foreground">Valor total:</span>{' '}
          {formatCurrency(data.totalValue)}
        </p>
        <p>
          <span className="text-muted-foreground">Preco medio:</span>{' '}
          {formatCurrency(data.averagePrice)}
        </p>
      </div>
    </div>
  );
}

/**
 * Mobile-friendly list view of category rankings.
 */
function CategoryList({ data }: { data: CategoryRankingType[] }) {
  return (
    <div className="space-y-3">
      {data.map((category, index) => (
        <div
          key={category.categoryId}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          {/* Position */}
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              index === 0 && 'bg-amber-500 text-white',
              index === 1 && 'bg-slate-400 text-white',
              index === 2 && 'bg-orange-600 text-white',
              index > 2 && 'bg-muted text-muted-foreground',
            )}
          >
            {index + 1}
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{category.categoryName}</p>
            <p className="text-xs text-muted-foreground">{category.categoryCode}</p>
          </div>

          {/* Stats */}
          <div className="text-right">
            <p className="font-semibold text-sm">
              {category.contractCount.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-muted-foreground">contratos</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * CategoryRanking Component
 *
 * Displays a horizontal bar chart of top contracted categories.
 * Part of the Market Intelligence Dashboard (#1273).
 *
 * Features:
 * - Horizontal bar chart showing contract counts
 * - Tooltips with detailed category information
 * - Mobile-friendly list view
 * - Responsive layout
 *
 * @example
 * ```tsx
 * <CategoryRanking
 *   data={topCategories}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function CategoryRanking({
  data,
  isLoading = false,
  className,
}: CategoryRankingProps) {
  if (isLoading) {
    return <RankingSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  // Prepare data for chart - truncate long names
  const chartData = data.map((item) => ({
    ...item,
    displayName:
      item.categoryName.length > 25
        ? item.categoryName.slice(0, 25) + '...'
        : item.categoryName,
  }));

  return (
    <Card className={cn(className)} data-testid="category-ranking">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" aria-hidden="true" />
          Top Categorias Contratadas
        </CardTitle>
        <CardDescription>
          Categorias com maior volume de contratacoes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Desktop: Bar chart */}
        <div className="hidden md:block">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                tickFormatter={(value) => value.toLocaleString('pt-BR')}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                width={150}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="contractCount"
                name="Contratos"
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mobile: List view */}
        <div className="md:hidden">
          <CategoryList data={data.slice(0, 5)} />
        </div>

        {/* Summary footer */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Total: {data.length} categorias</span>
          </div>
          <span className="font-medium">
            {data
              .reduce((sum, c) => sum + c.contractCount, 0)
              .toLocaleString('pt-BR')}{' '}
            contratos
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
