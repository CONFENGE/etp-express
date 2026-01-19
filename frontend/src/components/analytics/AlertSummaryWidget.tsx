import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  Bell,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AlertSummary } from '@/store/marketAnalyticsStore';

/**
 * Props for AlertSummaryWidget component.
 */
export interface AlertSummaryWidgetProps {
  data: AlertSummary | null;
  isLoading?: boolean;
  onViewAlerts?: () => void;
  className?: string;
}

// Alert level colors - aligned with design system
const ALERT_COLORS = {
  ok: 'hsl(142 76% 36%)', // green-600
  attention: 'hsl(48 96% 53%)', // amber-400
  warning: 'hsl(25 95% 53%)', // orange-500
  critical: 'hsl(0 84% 60%)', // red-500
};

const ALERT_LABELS = {
  ok: 'OK',
  attention: 'Atencao',
  warning: 'Aviso',
  critical: 'Critico',
};

const ALERT_ICONS = {
  ok: CheckCircle,
  attention: Info,
  warning: AlertCircle,
  critical: AlertTriangle,
};

/**
 * Loading skeleton for the alert widget.
 */
function AlertWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </CardTitle>
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-32">
          <Skeleton className="h-24 w-24 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state when no alerts exist.
 */
function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Resumo de Alertas
        </CardTitle>
        <CardDescription>
          Status dos alertas de sobrepreco
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mb-2 text-emerald-500" />
          <p className="text-sm font-medium">Nenhum alerta ativo</p>
          <p className="text-xs">
            Todos os precos estao dentro dos limites
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Custom tooltip for the pie chart.
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
      name: string;
      value: number;
      color: string;
      level: keyof typeof ALERT_LABELS;
    };
  }>;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const Icon = ALERT_ICONS[data.level];

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: data.color }} />
        <span className="font-medium">{ALERT_LABELS[data.level]}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {data.value} {data.value === 1 ? 'alerta' : 'alertas'}
      </p>
    </div>
  );
}

/**
 * AlertSummaryWidget Component
 *
 * Displays a donut chart summarizing alert levels.
 * Part of the Market Intelligence Dashboard (#1273).
 *
 * Features:
 * - Donut chart showing alerts by level
 * - Color-coded segments (OK, Attention, Warning, Critical)
 * - Center label with total pending
 * - Legend with counts per level
 * - Link to full alerts list
 *
 * @example
 * ```tsx
 * <AlertSummaryWidget
 *   data={alertSummary}
 *   isLoading={isLoading}
 *   onViewAlerts={() => navigate('/analytics/alerts')}
 * />
 * ```
 */
export function AlertSummaryWidget({
  data,
  isLoading = false,
  onViewAlerts,
  className,
}: AlertSummaryWidgetProps) {
  if (isLoading) {
    return <AlertWidgetSkeleton />;
  }

  if (!data || data.total === 0) {
    return <EmptyState />;
  }

  // Prepare data for pie chart
  const chartData = [
    { level: 'ok' as const, name: 'OK', value: data.byLevel.ok, color: ALERT_COLORS.ok },
    { level: 'attention' as const, name: 'Atencao', value: data.byLevel.attention, color: ALERT_COLORS.attention },
    { level: 'warning' as const, name: 'Aviso', value: data.byLevel.warning, color: ALERT_COLORS.warning },
    { level: 'critical' as const, name: 'Critico', value: data.byLevel.critical, color: ALERT_COLORS.critical },
  ].filter((item) => item.value > 0);

  const hasCriticalOrWarning =
    data.byLevel.critical > 0 || data.byLevel.warning > 0;

  return (
    <Card
      className={cn(
        hasCriticalOrWarning && 'border-destructive/50',
        className,
      )}
      data-testid="alert-summary-widget"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell
            className={cn(
              'h-5 w-5',
              hasCriticalOrWarning && 'text-destructive',
            )}
            aria-hidden="true"
          />
          Resumo de Alertas
        </CardTitle>
        <CardDescription>
          {data.pending} {data.pending === 1 ? 'alerta pendente' : 'alertas pendentes'} de {data.total} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Pie Chart */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.level} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div
                  className={cn(
                    'text-xl font-bold',
                    hasCriticalOrWarning && 'text-destructive',
                  )}
                >
                  {data.pending}
                </div>
                <div className="text-xs text-muted-foreground">pendentes</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {chartData.map((item) => {
              const Icon = ALERT_ICONS[item.level];
              return (
                <div
                  key={item.level}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className="h-4 w-4"
                      style={{ color: item.color }}
                      aria-hidden="true"
                    />
                    <span>{ALERT_LABELS[item.level]}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Acknowledged vs Pending */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{data.acknowledged}</span>{' '}
            reconhecidos
          </div>
          {onViewAlerts && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={onViewAlerts}
            >
              Ver todos os alertas
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
