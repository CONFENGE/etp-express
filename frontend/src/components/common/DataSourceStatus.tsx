/**
 * DataSourceStatus Component
 *
 * Visual indicator for government data source availability status.
 * Differentiates between "no results" and "service unavailable" scenarios.
 *
 * Features:
 * - Three visual states: SUCCESS (green), PARTIAL (yellow), SERVICE_UNAVAILABLE (red)
 * - Tooltip showing detailed status of each source
 * - Alert banner for non-success states
 * - Retry button for failed sources
 * - Responsive and accessible (ARIA)
 *
 * @see https://github.com/CONFENGE/etp-express/issues/756
 */

import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  SearchStatus,
  SourceStatus,
  getSourceDisplayConfig,
  getStatusMessage,
} from '@/types/search';

export interface DataSourceStatusProps {
  /** Overall search status */
  status: SearchStatus;
  /** Detailed status for each data source */
  sources: SourceStatus[];
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Whether a retry is in progress */
  isRetrying?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the compact badge only (no alert banner) */
  compact?: boolean;
}

/**
 * Status label configuration
 */
const statusLabels: Record<SearchStatus, string> = {
  [SearchStatus.SUCCESS]: 'Dados carregados',
  [SearchStatus.PARTIAL]: 'Dados parciais',
  [SearchStatus.SERVICE_UNAVAILABLE]: 'Serviço indisponível',
  [SearchStatus.RATE_LIMITED]: 'Limite atingido',
  [SearchStatus.TIMEOUT]: 'Tempo esgotado',
};

/**
 * Status variant configuration for Badge component
 */
const statusVariants: Record<
  SearchStatus,
  'success' | 'warning' | 'destructive'
> = {
  [SearchStatus.SUCCESS]: 'success',
  [SearchStatus.PARTIAL]: 'warning',
  [SearchStatus.SERVICE_UNAVAILABLE]: 'destructive',
  [SearchStatus.RATE_LIMITED]: 'warning',
  [SearchStatus.TIMEOUT]: 'warning',
};

/**
 * Status icon configuration
 */
const statusIcons: Record<SearchStatus, typeof CheckCircle> = {
  [SearchStatus.SUCCESS]: CheckCircle,
  [SearchStatus.PARTIAL]: AlertTriangle,
  [SearchStatus.SERVICE_UNAVAILABLE]: XCircle,
  [SearchStatus.RATE_LIMITED]: AlertTriangle,
  [SearchStatus.TIMEOUT]: AlertTriangle,
};

/**
 * Individual source status indicator
 */
function SourceStatusItem({ source }: { source: SourceStatus }) {
  const config = getSourceDisplayConfig(source.name);
  const isSuccess = source.status === SearchStatus.SUCCESS;
  const Icon = statusIcons[source.status];

  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-b-0">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            'h-4 w-4',
            isSuccess ? 'text-green-600' : 'text-yellow-600',
            source.status === SearchStatus.SERVICE_UNAVAILABLE &&
              'text-red-600',
          )}
          aria-hidden="true"
        />
        <div>
          <span className="font-medium text-sm">{config.label}</span>
          <span className="text-xs text-muted-foreground block">
            {config.fullName}
          </span>
        </div>
      </div>
      <div className="text-right">
        {source.resultCount !== undefined && isSuccess && (
          <span className="text-sm text-muted-foreground">
            {source.resultCount} resultado{source.resultCount !== 1 ? 's' : ''}
          </span>
        )}
        {source.latencyMs !== undefined && isSuccess && (
          <span className="text-xs text-muted-foreground block">
            {source.latencyMs}ms
          </span>
        )}
        {!isSuccess && source.error && (
          <span className="text-xs text-red-600">{source.error}</span>
        )}
        {!isSuccess && !source.error && (
          <span className="text-xs text-yellow-600">Indisponível</span>
        )}
      </div>
    </div>
  );
}

/**
 * Detailed sources tooltip content
 */
function SourcesDetail({ sources }: { sources: SourceStatus[] }) {
  return (
    <div className="min-w-[250px] max-w-[320px]">
      <p className="font-semibold text-sm mb-2 pb-2 border-b">
        Status das Fontes de Dados
      </p>
      <div className="space-y-0">
        {sources.map((source) => (
          <SourceStatusItem key={source.name} source={source} />
        ))}
      </div>
    </div>
  );
}

/**
 * Status badge with tooltip
 */
function StatusBadge({
  status,
  sources,
}: {
  status: SearchStatus;
  sources: SourceStatus[];
}) {
  const Icon = statusIcons[status];
  const variant = statusVariants[status];
  const label = statusLabels[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            className="cursor-help flex items-center gap-1.5 px-2.5 py-1"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="p-3">
          <SourcesDetail sources={sources} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * DataSourceStatus Component
 *
 * Displays the status of government data sources with visual indicators
 * and detailed breakdown in a tooltip.
 *
 * @example
 * ```tsx
 * <DataSourceStatus
 *   status={SearchStatus.PARTIAL}
 *   sources={[
 *     { name: 'pncp', status: SearchStatus.SUCCESS, resultCount: 10 },
 *     { name: 'comprasgov', status: SearchStatus.SERVICE_UNAVAILABLE, error: 'Timeout' },
 *   ]}
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function DataSourceStatus({
  status,
  sources,
  onRetry,
  isRetrying = false,
  className,
  compact = false,
}: DataSourceStatusProps) {
  // Don't render anything if status is SUCCESS and compact mode
  if (status === SearchStatus.SUCCESS && compact) {
    return <StatusBadge status={status} sources={sources} />;
  }

  // Get failed sources for message
  const failedSources = sources
    .filter((s) => s.status !== SearchStatus.SUCCESS)
    .map((s) => s.name);

  // For compact mode, just show the badge
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <StatusBadge status={status} sources={sources} />
        {onRetry && status !== SearchStatus.SUCCESS && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-7 px-2"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')}
              aria-hidden="true"
            />
            <span className="sr-only">Tentar novamente</span>
          </Button>
        )}
      </div>
    );
  }

  // Full alert banner for non-compact mode
  const alertVariant =
    status === SearchStatus.SUCCESS
      ? 'default'
      : status === SearchStatus.SERVICE_UNAVAILABLE
        ? 'destructive'
        : 'warning';

  const Icon = statusIcons[status];

  return (
    <Alert variant={alertVariant} className={cn('relative', className)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <AlertTitle className="flex items-center justify-between">
        <span>{statusLabels[status]}</span>
        <StatusBadge status={status} sources={sources} />
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm">{getStatusMessage(status, failedSources)}</p>
        {onRetry && status !== SearchStatus.SUCCESS && (
          <Button
            variant={
              status === SearchStatus.SERVICE_UNAVAILABLE
                ? 'secondary'
                : 'outline'
            }
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-3"
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', isRetrying && 'animate-spin')}
              aria-hidden="true"
            />
            {isRetrying ? 'Tentando...' : 'Tentar novamente'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
