import { ShieldCheck, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useComplianceValidation } from '@/hooks/useComplianceValidation';
import { ComplianceItem } from './ComplianceItem';
import { cn } from '@/lib/utils';
import { ComplianceStatus } from '@/types/compliance';

/**
 * Props for the ComplianceScorecard component.
 */
interface ComplianceScorecardProps {
  /** ID of the ETP to validate */
  etpId: string;
  /** Callback when user wants to navigate to fix an issue */
  onNavigateToSection?: (sectionId: string) => void;
  /** Custom class name for the card */
  className?: string;
}

/**
 * Circular progress indicator for the compliance score.
 */
function CircularScore({
  value,
  size = 'lg',
}: {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-base',
    lg: 'w-20 h-20 text-lg',
  };

  const getScoreColor = (score: number) => {
    if (score < 50) return 'text-red-500 stroke-red-500';
    if (score < 70) return 'text-yellow-500 stroke-yellow-500';
    return 'text-green-500 stroke-green-500';
  };

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className={cn('relative', sizeClasses[size])}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn('transition-all duration-500', getScoreColor(value))}
        />
      </svg>
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center font-bold',
          getScoreColor(value),
        )}
      >
        {value}%
      </div>
    </div>
  );
}

/**
 * Gets the status badge variant based on compliance status.
 */
function getStatusBadge(status: ComplianceStatus): {
  variant: 'success' | 'warning' | 'destructive';
  label: string;
} {
  switch (status) {
    case 'APPROVED':
      return { variant: 'success', label: 'Aprovado' };
    case 'NEEDS_REVIEW':
      return { variant: 'warning', label: 'Revisao Necessaria' };
    case 'REJECTED':
      return { variant: 'destructive', label: 'Pendencias' };
    default:
      return { variant: 'warning', label: 'Verificando' };
  }
}

/**
 * Displays the compliance validation score and issues for an ETP.
 *
 * Shows:
 * - Circular score indicator (0-100) with color coding
 * - Status badge (Approved, Needs Review, Rejected)
 * - Collapsible list of pending items with fix suggestions
 * - Auto-refresh every 30 seconds
 *
 * Issue #1386 - [TCU-1163e] Componente indicador de conformidade no ETP Editor
 *
 * @example
 * ```tsx
 * <ComplianceScorecard
 *   etpId={etp.id}
 *   onNavigateToSection={(sectionId) => setActiveSection(sectionId)}
 * />
 * ```
 */
export function ComplianceScorecard({
  etpId,
  onNavigateToSection,
  className,
}: ComplianceScorecardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, error, refetch } = useComplianceValidation(etpId, {
    refetchInterval: 30000,
    enablePolling: true,
  });

  // Loading state
  if (isLoading && !data) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Conformidade TCU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Conformidade TCU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No data state (ETP might not exist yet)
  if (!data) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Conformidade TCU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Salve o ETP para verificar conformidade
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusBadge = getStatusBadge(data.status);
  const hasIssues = data.topIssues && data.topIssues.length > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Conformidade TCU
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-6 w-6"
            aria-label="Atualizar conformidade"
          >
            <RefreshCw
              className={cn('h-3 w-3', isLoading && 'animate-spin')}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score and status */}
        <div className="flex items-center gap-4">
          <CircularScore value={data.score} size="lg" />
          <div className="space-y-1">
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            <p className="text-xs text-muted-foreground">
              {data.passedItems}/{data.totalItems} itens conformes
            </p>
          </div>
        </div>

        {/* Collapsible issues list */}
        {hasIssues && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between px-2 h-8"
              >
                <span className="text-sm">
                  {data.failedItems} itens pendentes
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              <div role="list" className="space-y-2">
                {data.topIssues.map((issue, index) => (
                  <ComplianceItem
                    key={`${issue.requirement}-${index}`}
                    requirement={issue.requirement}
                    fixSuggestion={issue.fixSuggestion}
                    priority={issue.priority}
                    onFix={
                      onNavigateToSection
                        ? () => onNavigateToSection('1')
                        : undefined
                    }
                  />
                ))}
              </div>
              {data.failedItems > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{data.failedItems - 3} outros itens pendentes
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* All items passed message */}
        {!hasIssues && data.passed && (
          <p className="text-sm text-green-600 text-center">
            Todos os requisitos atendidos!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
