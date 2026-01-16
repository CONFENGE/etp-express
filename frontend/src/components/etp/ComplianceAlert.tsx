import { AlertTriangle, Info, X, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CompliancePriority } from '@/types/compliance';

/**
 * Props for the ComplianceAlert component.
 */
interface ComplianceAlertProps {
  /** Alert title/requirement name */
  title: string;
  /** Detailed description or fix suggestion */
  description: string;
  /** Priority level: high (mandatory), medium (recommended), low (optional) */
  priority: CompliancePriority;
  /** Legal reference for the requirement (optional) */
  legalReference?: string;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Get styling based on alert priority.
 */
function getPriorityStyles(priority: CompliancePriority) {
  switch (priority) {
    case 'high':
      return {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        iconClass: 'text-red-500',
        badgeClass: 'bg-red-100 text-red-700 border-red-200',
        label: 'Obrigatorio',
      };
    case 'medium':
      return {
        variant: 'warning' as const,
        icon: AlertTriangle,
        iconClass: 'text-yellow-500',
        badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        label: 'Recomendado',
      };
    case 'low':
      return {
        variant: 'default' as const,
        icon: Info,
        iconClass: 'text-blue-500',
        badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
        label: 'Opcional',
      };
  }
}

/**
 * Individual compliance alert component.
 *
 * Displays a single compliance issue with:
 * - Color-coded priority indicator
 * - Requirement title
 * - Fix suggestion in tooltip
 * - Optional legal reference link
 * - Dismiss button
 *
 * Issue #1266 - [Compliance-e] Alertas de nao-conformidade em tempo real
 *
 * @example
 * ```tsx
 * <ComplianceAlert
 *   title="Justificativa incompleta"
 *   description="Adicione detalhes sobre os beneficios esperados"
 *   priority="high"
 *   legalReference="Art. 18, Lei 14.133/2021"
 *   onDismiss={() => handleDismiss(alertId)}
 * />
 * ```
 */
export function ComplianceAlert({
  title,
  description,
  priority,
  legalReference,
  onDismiss,
  className,
}: ComplianceAlertProps) {
  const styles = getPriorityStyles(priority);
  const Icon = styles.icon;

  return (
    <Alert
      className={cn(
        'relative pr-10 py-3',
        priority === 'high' && 'border-red-200 bg-red-50/50',
        priority === 'medium' && 'border-yellow-200 bg-yellow-50/50',
        priority === 'low' && 'border-blue-200 bg-blue-50/50',
        className,
      )}
    >
      <Icon className={cn('h-4 w-4', styles.iconClass)} />

      <div className="flex-1 ml-2">
        <div className="flex items-center gap-2">
          <AlertTitle className="text-sm font-medium mb-0">{title}</AlertTitle>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded border',
              styles.badgeClass,
            )}
          >
            {styles.label}
          </span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDescription className="text-xs text-muted-foreground mt-1 cursor-help line-clamp-1">
                {description}
              </AlertDescription>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
              <p className="text-sm">{description}</p>
              {legalReference && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  {legalReference}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100"
          onClick={onDismiss}
          aria-label="Dispensar alerta"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Alert>
  );
}
