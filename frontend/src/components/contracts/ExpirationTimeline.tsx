/**
 * ExpirationTimeline Component (#1662)
 *
 * Visual timeline of contract expirations for the next 90 days.
 *
 * Features:
 * - 3 urgency groups (30d/60d/90d)
 * - Color-coded by urgency (red/orange/blue)
 * - Ordered by expiration date (ascending)
 * - Empty state for no expirations
 * - Skeleton loading state
 * - Responsive (stacks on mobile)
 *
 * @see Technical Approach in #1662
 */

import { format } from 'date-fns';
import { useExpirationTimeline, ExpiringContract } from '@/hooks/contracts/useExpirationTimeline';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * Determine dot color based on days until expiration
 */
function getDotColor(days: number): string {
  if (days <= 30) return 'bg-red-500'; // Critical: 0-30 days
  if (days <= 60) return 'bg-orange-500'; // Warning: 31-60 days
  return 'bg-blue-500'; // Info: 61-90 days
}

/**
 * Format currency values in pt-BR
 */
function formatCurrency(value: string): string {
  const num = parseFloat(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

/**
 * Skeleton loading state for timeline
 */
function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="h-3 w-3 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Timeline item for a single contract
 */
interface TimelineItemProps {
  contract: ExpiringContract;
}

function TimelineItem({ contract }: TimelineItemProps) {
  const dotColor = getDotColor(contract.daysUntilExpiration);

  return (
    <div className="flex items-start gap-3 py-2 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors">
      {/* Dot Indicator */}
      <div className="flex flex-col items-center gap-1 pt-1.5">
        <div className={`h-3 w-3 rounded-full ${dotColor} shrink-0`} />
      </div>

      {/* Contract Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">
          <strong>{contract.numero}</strong> - {contract.contratado}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Vence em <strong className="font-semibold">{contract.daysUntilExpiration} dias</strong>
          {' '}
          ({format(new Date(contract.vigenciaFim), 'dd/MM/yyyy')})
        </div>
      </div>

      {/* Value */}
      <div className="text-sm font-medium text-right shrink-0">
        {formatCurrency(contract.valor)}
      </div>
    </div>
  );
}

/**
 * Timeline section for a specific urgency group
 */
interface TimelineSectionProps {
  title: string;
  color: 'red' | 'orange' | 'blue';
  count: number;
  children: React.ReactNode;
}

function TimelineSection({ title, color, count, children }: TimelineSectionProps) {
  if (count === 0) return null;

  const borderColor = {
    red: 'border-red-200',
    orange: 'border-orange-200',
    blue: 'border-blue-200',
  }[color];

  const bgColor = {
    red: 'bg-red-50',
    orange: 'bg-orange-50',
    blue: 'bg-blue-50',
  }[color];

  const textColor = {
    red: 'text-red-700',
    orange: 'text-orange-700',
    blue: 'text-blue-700',
  }[color];

  return (
    <div className={`border ${borderColor} rounded-lg p-3 ${bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-semibold ${textColor}`}>{title}</h4>
        <span className={`text-xs font-medium ${textColor}`}>
          {count} {count === 1 ? 'contrato' : 'contratos'}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

/**
 * ExpirationTimeline - Main component
 */
export function ExpirationTimeline() {
  const { data, isLoading, error } = useExpirationTimeline(90);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vencimentos (90 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">
            Erro ao carregar timeline de vencimentos. Tente novamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vencimentos (90 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vencimentos (90 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Nenhum contrato vencendo nos próximos 90 dias.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group contracts by urgency
  const groups = {
    critical: data.timeline.filter((c) => c.daysUntilExpiration <= 30),
    warning: data.timeline.filter(
      (c) => c.daysUntilExpiration > 30 && c.daysUntilExpiration <= 60,
    ),
    info: data.timeline.filter((c) => c.daysUntilExpiration > 60),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vencimentos (90 dias)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical: 0-30 days */}
        <TimelineSection title="Próximos 30 dias" color="red" count={groups.critical.length}>
          {groups.critical.map((contract) => (
            <TimelineItem key={contract.contratoId} contract={contract} />
          ))}
        </TimelineSection>

        {/* Warning: 31-60 days */}
        <TimelineSection title="30-60 dias" color="orange" count={groups.warning.length}>
          {groups.warning.map((contract) => (
            <TimelineItem key={contract.contratoId} contract={contract} />
          ))}
        </TimelineSection>

        {/* Info: 61-90 days */}
        <TimelineSection title="60-90 dias" color="blue" count={groups.info.length}>
          {groups.info.map((contract) => (
            <TimelineItem key={contract.contratoId} contract={contract} />
          ))}
        </TimelineSection>
      </CardContent>
    </Card>
  );
}
