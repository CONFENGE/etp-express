import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ShieldX,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useComplianceValidation } from '@/hooks/useComplianceValidation';
import { cn } from '@/lib/utils';
import { ComplianceStatus, CompliancePriority } from '@/types/compliance';

/**
 * Props for the ComplianceBadge component.
 */
interface ComplianceBadgeProps {
  /** ID of the ETP to show compliance for */
  etpId: string;
  /** Whether to show the score number */
  showScore?: boolean;
  /** Whether to show a tooltip with details */
  showTooltip?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Custom class name */
  className?: string;
}

/**
 * Configuration for badge display based on compliance score.
 */
interface BadgeConfig {
  variant: 'success' | 'warning' | 'destructive' | 'secondary';
  icon: React.ReactNode;
  label: string;
  description: string;
}

/**
 * Gets badge configuration based on score and status.
 */
function getBadgeConfig(score: number, _status: ComplianceStatus): BadgeConfig {
  if (score >= 90) {
    return {
      variant: 'success',
      icon: <ShieldCheck className="h-3 w-3" />,
      label: 'Aprovado',
      description: 'ETP atende todos os requisitos TCU',
    };
  }
  if (score >= 70) {
    return {
      variant: 'warning',
      icon: <ShieldQuestion className="h-3 w-3" />,
      label: 'Ressalvas',
      description: 'ETP aprovado com ressalvas',
    };
  }
  if (score >= 50) {
    return {
      variant: 'warning',
      icon: <ShieldAlert className="h-3 w-3" />,
      label: 'Atencao',
      description: 'ETP requer melhorias',
    };
  }
  return {
    variant: 'destructive',
    icon: <ShieldX className="h-3 w-3" />,
    label: 'Pendente',
    description: 'ETP nao conforme',
  };
}

/**
 * Gets priority label in Portuguese.
 */
function getPriorityLabel(priority: CompliancePriority): string {
  switch (priority) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Media';
    case 'low':
      return 'Baixa';
    default:
      return priority;
  }
}

/**
 * Compact badge showing compliance status for an ETP.
 *
 * Displays:
 * - Color-coded badge (green/yellow/orange/red)
 * - Status icon (shield variants)
 * - Optional score percentage
 * - Tooltip with violation summary
 *
 * Issue #1265 - [Compliance-d] Selo de Conformidade visual
 *
 * Compliance levels:
 * - 🟢 APPROVED (90-100): All requirements met
 * - 🟡 NEEDS_REVIEW (70-89): Minor issues
 * - 🟠 ATTENTION (50-69): Requires improvements
 * - 🔴 REJECTED (0-49): Not compliant
 *
 * @example
 * ```tsx
 * // In ETP list
 * <ComplianceBadge etpId={etp.id} showScore showTooltip />
 *
 * // Compact version
 * <ComplianceBadge etpId={etp.id} size="sm" />
 * ```
 */
export function ComplianceBadge({
  etpId,
  showScore = true,
  showTooltip = true,
  size = 'md',
  className,
}: ComplianceBadgeProps) {
  const { data, isLoading, error } = useComplianceValidation(etpId, {
    enablePolling: false, // No polling for badge (performance)
    refetchInterval: 0,
  });

  // Loading state
  if (isLoading && !data) {
    return (
      <Skeleton
        className={cn('rounded-full', size === 'sm' ? 'h-5 w-16' : 'h-6 w-20')}
      />
    );
  }

  // Error or no data - show neutral state
  if (error || !data) {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)}>
        <ShieldQuestion className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        <span className={size === 'sm' ? 'text-xs' : ''}>--</span>
      </Badge>
    );
  }

  const config = getBadgeConfig(data.score, data.status);
  const hasIssues = data.topIssues && data.topIssues.length > 0;

  const badgeContent = (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1 cursor-default',
        size === 'sm' && 'text-xs px-2 py-0',
        className,
      )}
      aria-label={`Conformidade TCU: ${data.score}% - ${config.label}`}
    >
      {config.icon}
      {showScore ? <span>{data.score}%</span> : <span>{config.label}</span>}
    </Badge>
  );

  // Without tooltip
  if (!showTooltip) {
    return badgeContent;
  }

  // With tooltip
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs"
          aria-label="Detalhes de conformidade"
        >
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2">
              {config.icon}
              <span className="font-medium">{config.label}</span>
              <span className="text-muted-foreground">({data.score}%)</span>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>

            {/* Stats */}
            <div className="text-xs">
              <span className="text-green-600">{data.passedItems} ok</span>
              {' / '}
              <span className="text-red-600">{data.failedItems} pendentes</span>
              {' de '}
              <span>{data.totalItems} itens</span>
            </div>

            {/* Top issues */}
            {hasIssues && (
              <div className="pt-2 border-t space-y-1">
                <p className="text-xs font-medium">Principais pendencias:</p>
                <ul className="text-xs space-y-1">
                  {data.topIssues.slice(0, 3).map((issue, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span
                        className={cn(
                          'shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full',
                          issue.priority === 'high' && 'bg-red-500',
                          issue.priority === 'medium' && 'bg-yellow-500',
                          issue.priority === 'low' && 'bg-blue-500',
                        )}
                        aria-label={`Prioridade ${getPriorityLabel(issue.priority)}`}
                      />
                      <span className="text-muted-foreground line-clamp-1">
                        {issue.requirement}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* All passed */}
            {!hasIssues && data.passed && (
              <p className="text-xs text-green-600">
                Todos os requisitos atendidos!
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
