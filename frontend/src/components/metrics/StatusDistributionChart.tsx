import { useMemo } from 'react';
import { PieChart, BarChart3, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Eye } from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type StatusDistributionData } from '@/hooks/useStatusDistribution';

/**
 * Map status to icons for WCAG 2.1 AA compliance (1.4.1 Use of Color)
 * Icons provide visual differentiation beyond color
 */
const statusIcons: Record<string, React.ElementType> = {
  draft: FileText,
  in_progress: Clock,
  review: Eye,
  approved: CheckCircle,
  rejected: XCircle,
  pending: AlertTriangle,
};

/**
 * Props for StatusDistributionChart component
 */
export interface StatusDistributionChartProps {
  /** Status distribution data from the API */
  data: StatusDistributionData | null;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Custom tooltip component for the chart.
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      label: string;
      count: number;
      percentage: number;
      color: string;
    };
  }>;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="font-medium" style={{ color: data.color }}>
        {data.label}
      </p>
      <p className="text-sm text-muted-foreground">
        {data.count} {data.count === 1 ? 'ETP' : 'ETPs'}
      </p>
      <p className="text-sm font-medium">{data.percentage}%</p>
    </div>
  );
}

/**
 * Skeleton loader for the card content.
 */
function StatusDistributionChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Distribuicao por Status
        </CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="animate-pulse flex flex-col items-center justify-center h-[200px]">
          <div className="h-32 w-32 bg-muted rounded-full" />
          <div className="h-4 w-24 bg-muted rounded mt-4" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state when no data is available.
 */
function EmptyState() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Distribuicao por Status
        </CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-2" />
          <p className="text-sm">Nenhum ETP encontrado</p>
          <p className="text-xs">
            Crie seu primeiro ETP para ver as estatisticas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Mobile-friendly list view of status distribution.
 * WCAG 2.1 AA: Uses icons + color + text for status identification
 */
function StatusList({ data }: { data: StatusDistributionData }) {
  return (
    <div className="space-y-2">
      {data.map((item) => {
        const IconComponent = statusIcons[item.status] || FileText;
        return (
          <div
            key={item.status}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {/* Icon for non-color identification */}
              <IconComponent
                className="w-4 h-4 flex-shrink-0"
                style={{ color: item.color }}
                aria-hidden="true"
              />
              {/* Color indicator (supplementary) */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{item.count}</span>
              <span className="font-medium w-12 text-right">
                {item.percentage}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * StatusDistributionChart Component
 *
 * Displays the distribution of ETPs by status as a donut chart.
 * Part of the advanced metrics feature (Issue #1365).
 *
 * Features:
 * - Donut chart visualization with distinct colors per status
 * - Tooltip with count and percentage on hover
 * - Legend showing all statuses
 * - Responsive layout (switches to list on mobile)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useStatusDistribution();
 *
 * <StatusDistributionChart data={data} isLoading={isLoading} />
 * ```
 */
export function StatusDistributionChart({
  data,
  isLoading = false,
  className,
}: StatusDistributionChartProps) {
  // Calculate total count for center label
  const totalCount = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  if (isLoading) {
    return <StatusDistributionChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card className={cn(className)} data-testid="status-distribution-chart">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Distribuicao por Status
        </CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {/* Desktop: Donut chart */}
        <div className="hidden sm:block relative">
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={entry.color}
                    className="outline-none focus:outline-none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-x-0 top-0 h-[160px] flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-xl font-bold">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>

        {/* Mobile: List view */}
        <div className="sm:hidden">
          <StatusList data={data} />
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total</span>
              <span className="font-bold">{totalCount} ETPs</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
