import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AlertLevel } from '@/types/analytics';

/**
 * Format currency in Brazilian Real format.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format percentage with sign.
 */
function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

interface PriceAlertBadgeProps {
  /** Alert level classification */
  alertLevel: AlertLevel | null;
  /** Median benchmark price */
  medianPrice: number | null;
  /** Suggested price range */
  suggestedRange: { low: number; high: number } | null;
  /** Percentage deviation from median */
  percentageAbove: number | null;
  /** Number of samples in benchmark */
  sampleCount?: number;
  /** UF used for benchmark */
  benchmarkUf?: string;
  /** Whether price check is in progress */
  isLoading?: boolean;
  /** Whether to show as compact badge only */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Configuration for each alert level.
 */
const ALERT_CONFIG: Record<
  AlertLevel,
  {
    icon: React.ElementType;
    label: string;
    badgeVariant:
      | 'default'
      | 'success'
      | 'warning'
      | 'destructive'
      | 'secondary';
    bgColor: string;
    textColor: string;
    borderColor: string;
    description: string;
  }
> = {
  [AlertLevel.OK]: {
    icon: CheckCircle2,
    label: 'OK',
    badgeVariant: 'success',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    textColor: 'text-green-700 dark:text-green-300',
    borderColor: 'border-green-200 dark:border-green-800',
    description: 'Dentro da faixa aceitável de mercado',
  },
  [AlertLevel.ATTENTION]: {
    icon: Info,
    label: 'Atentar',
    badgeVariant: 'secondary',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Levemente acima da mediana regional',
  },
  [AlertLevel.WARNING]: {
    icon: AlertTriangle,
    label: 'Alerta',
    badgeVariant: 'warning',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Significativamente acima da mediana - TCE pode questionar',
  },
  [AlertLevel.CRITICAL]: {
    icon: AlertCircle,
    label: 'Risco',
    badgeVariant: 'destructive',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-800',
    description: 'Alto risco de questionamento em auditoria',
  },
};

/**
 * Price Alert Badge component for ETP wizard.
 *
 * Displays visual feedback about price deviation from regional benchmarks.
 * Non-blocking - only informative, doesn't prevent form submission.
 *
 * Features:
 * - Color-coded badge by alert level
 * - Tooltip with detailed information
 * - Expandable details section
 * - Loading state while checking
 *
 * @see Issue #1274 - Integrate price alerts in ETP wizard
 * @see Issue #1272 - Overprice alert system
 *
 * @example
 * ```tsx
 * <PriceAlertBadge
 *   alertLevel={AlertLevel.WARNING}
 *   medianPrice={3450}
 *   suggestedRange={{ low: 3200, high: 3700 }}
 *   percentageAbove={44.93}
 * />
 * ```
 */
export function PriceAlertBadge({
  alertLevel,
  medianPrice,
  suggestedRange,
  percentageAbove,
  sampleCount,
  benchmarkUf,
  isLoading = false,
  compact = false,
  className,
}: PriceAlertBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-muted-foreground',
          className,
        )}
        role="status"
        aria-label="Verificando preço"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Verificando preço...</span>
      </div>
    );
  }

  // No alert to show
  if (!alertLevel) {
    return null;
  }

  const config = ALERT_CONFIG[alertLevel];
  const Icon = config.icon;

  // Compact mode - just the badge
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.badgeVariant}
            icon={<Icon className="h-3 w-3" />}
            className={cn('cursor-help', className)}
            role="status"
            aria-label={`Alerta de preço: ${config.label}`}
          >
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{config.description}</p>
          {medianPrice !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              Mediana: {formatCurrency(medianPrice)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full mode with expandable details
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        config.bgColor,
        config.borderColor,
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Header with badge and toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant={config.badgeVariant}
            icon={<Icon className="h-3.5 w-3.5" />}
          >
            {config.label}
            {percentageAbove !== null && (
              <span className="ml-1 font-mono text-xs">
                ({formatPercentage(percentageAbove)})
              </span>
            )}
          </Badge>
          <span className={cn('text-sm', config.textColor)}>
            {config.description}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5',
            'transition-colors focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-apple-accent',
          )}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Expandable details */}
      {isExpanded && (
        <div
          className={cn(
            'mt-3 pt-3 border-t text-sm space-y-2',
            config.borderColor,
            config.textColor,
          )}
        >
          {medianPrice !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mediana regional:</span>
              <span className="font-medium">{formatCurrency(medianPrice)}</span>
            </div>
          )}
          {suggestedRange && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Faixa sugerida:</span>
              <span className="font-medium">
                {formatCurrency(suggestedRange.low)} -{' '}
                {formatCurrency(suggestedRange.high)}
              </span>
            </div>
          )}
          {sampleCount !== undefined && sampleCount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amostras:</span>
              <span className="font-medium">
                {sampleCount.toLocaleString('pt-BR')} contratos
              </span>
            </div>
          )}
          {benchmarkUf && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referência:</span>
              <span className="font-medium">{benchmarkUf}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-current/10">
            Este alerta é apenas informativo e{' '}
            <strong>não impede o envio do formulário</strong>. Considere
            justificar preços acima da mediana na documentação do processo.
          </p>
        </div>
      )}
    </div>
  );
}
