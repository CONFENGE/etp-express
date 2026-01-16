import { memo } from 'react';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { ComplianceAlert } from './ComplianceAlert';
import { ComplianceSuggestion } from '@/types/compliance';
import { getAlertId } from '@/hooks/useComplianceAlerts';
import { cn } from '@/lib/utils';

/**
 * Props for the ComplianceAlertPanel component.
 */
interface ComplianceAlertPanelProps {
  /** List of compliance alerts to display */
  alerts: ComplianceSuggestion[];
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Set of dismissed alert IDs */
  dismissedAlerts: Set<string>;
  /** Callback when an alert is dismissed */
  onDismiss: (alertId: string) => void;
  /** Maximum number of alerts to show (default: 3) */
  maxAlerts?: number;
  /** Custom class name */
  className?: string;
}

/**
 * Panel displaying compliance alerts for the current ETP section.
 *
 * Features:
 * - Shows up to maxAlerts alerts (default 3)
 * - Loading indicator during validation
 * - Success message when all alerts are resolved
 * - Color-coded by priority
 * - Collapsible with "show more" option
 *
 * Issue #1266 - [Compliance-e] Alertas de nao-conformidade em tempo real
 *
 * @example
 * ```tsx
 * <ComplianceAlertPanel
 *   alerts={complianceAlerts}
 *   isValidating={isValidating}
 *   dismissedAlerts={dismissedAlerts}
 *   onDismiss={handleDismiss}
 *   maxAlerts={3}
 * />
 * ```
 */
export const ComplianceAlertPanel = memo(function ComplianceAlertPanel({
  alerts,
  isValidating,
  dismissedAlerts,
  onDismiss,
  maxAlerts = 3,
  className,
}: ComplianceAlertPanelProps) {
  // Filter out dismissed alerts
  const activeAlerts = alerts.filter(
    (alert) => !dismissedAlerts.has(getAlertId(alert)),
  );

  // Show nothing if no alerts and not validating
  if (activeAlerts.length === 0 && !isValidating) {
    return null;
  }

  const displayedAlerts = activeAlerts.slice(0, maxAlerts);
  const remainingCount = activeAlerts.length - maxAlerts;

  // Count by priority
  const highCount = activeAlerts.filter((a) => a.priority === 'high').length;
  const mediumCount = activeAlerts.filter(
    (a) => a.priority === 'medium',
  ).length;
  const lowCount = activeAlerts.filter((a) => a.priority === 'low').length;

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3',
        highCount > 0 && 'border-red-200',
        highCount === 0 && mediumCount > 0 && 'border-yellow-200',
        highCount === 0 && mediumCount === 0 && lowCount > 0 && 'border-blue-200',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : activeAlerts.length === 0 ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-orange-500" />
          )}
          <span className="text-sm font-medium">
            {isValidating
              ? 'Verificando conformidade...'
              : activeAlerts.length === 0
                ? 'Todos os requisitos atendidos'
                : `${activeAlerts.length} ${activeAlerts.length === 1 ? 'pendencia' : 'pendencias'} de conformidade`}
          </span>
        </div>

        {/* Priority badges */}
        {activeAlerts.length > 0 && (
          <div className="flex items-center gap-1">
            {highCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                {highCount} obrig.
              </span>
            )}
            {mediumCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                {mediumCount} recom.
              </span>
            )}
            {lowCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                {lowCount} opc.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Alerts list */}
      {displayedAlerts.length > 0 && (
        <div className="space-y-2">
          {displayedAlerts.map((alert) => {
            const alertId = getAlertId(alert);
            return (
              <ComplianceAlert
                key={alertId}
                title={alert.title}
                description={alert.description}
                priority={alert.priority}
                legalReference={alert.legalReference}
                onDismiss={() => onDismiss(alertId)}
              />
            );
          })}

          {/* Show more indicator */}
          {remainingCount > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{remainingCount}{' '}
              {remainingCount === 1
                ? 'outra pendencia'
                : 'outras pendencias'}{' '}
              (ver na sidebar)
            </p>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isValidating && activeAlerts.length === 0 && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      )}
    </div>
  );
});
