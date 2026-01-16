import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Props for the ComplianceAlertBadge component.
 */
interface ComplianceAlertBadgeProps {
  /** Total count of active alerts */
  count: number;
  /** Count by priority level */
  countByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  /** Whether validation is currently running */
  isValidating?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Badge showing compliance alert count in ETP Editor header.
 *
 * Features:
 * - Color-coded based on highest priority alert
 * - Tooltip with breakdown by priority
 * - Animated pulse when there are high-priority alerts
 * - Hidden when count is 0
 *
 * Issue #1266 - [Compliance-e] Alertas de nao-conformidade em tempo real
 *
 * @example
 * ```tsx
 * <ComplianceAlertBadge
 *   count={5}
 *   countByPriority={{ high: 2, medium: 2, low: 1 }}
 *   isValidating={false}
 * />
 * ```
 */
export function ComplianceAlertBadge({
  count,
  countByPriority,
  isValidating = false,
  className,
}: ComplianceAlertBadgeProps) {
  // Don't render if no alerts
  if (count === 0 && !isValidating) {
    return null;
  }

  // Determine badge variant based on highest priority
  const hasHigh = countByPriority.high > 0;
  const hasMedium = countByPriority.medium > 0;

  const variant = hasHigh ? 'destructive' : hasMedium ? 'warning' : 'secondary';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            className={cn(
              'flex items-center gap-1 cursor-default',
              hasHigh && 'animate-pulse',
              isValidating && 'opacity-60',
              className,
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>{isValidating ? '...' : count}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-sm">
            {isValidating ? (
              <p>Verificando conformidade...</p>
            ) : (
              <>
                <p className="font-medium mb-1">
                  {count} {count === 1 ? 'pendencia' : 'pendencias'} TCU
                </p>
                <ul className="space-y-0.5 text-xs">
                  {countByPriority.high > 0 && (
                    <li className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {countByPriority.high} obrigatorias
                    </li>
                  )}
                  {countByPriority.medium > 0 && (
                    <li className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      {countByPriority.medium} recomendadas
                    </li>
                  )}
                  {countByPriority.low > 0 && (
                    <li className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {countByPriority.low} opcionais
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
