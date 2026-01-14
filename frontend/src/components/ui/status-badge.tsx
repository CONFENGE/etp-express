import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  Ban,
} from 'lucide-react';
import { Badge, type BadgeProps } from './badge';
import { cn } from '@/lib/utils';

/**
 * Status types for ETP
 */
export type EtpStatus =
  | 'draft'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'archived'
  | 'pending';

/**
 * Map of status to visual properties (icon + variant)
 * Icons provide visual cues beyond color for WCAG 2.1 AA compliance (1.4.1 Use of Color)
 */
const statusConfig: Record<
  EtpStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    variant: BadgeProps['variant'];
    label: string;
  }
> = {
  draft: {
    icon: FileText,
    variant: 'secondary',
    label: 'Rascunho',
  },
  in_progress: {
    icon: Clock,
    variant: 'default',
    label: 'Em Progresso',
  },
  review: {
    icon: Eye,
    variant: 'warning',
    label: 'Em Revisão',
  },
  approved: {
    icon: CheckCircle,
    variant: 'success',
    label: 'Aprovado',
  },
  rejected: {
    icon: XCircle,
    variant: 'destructive',
    label: 'Rejeitado',
  },
  archived: {
    icon: Ban,
    variant: 'outline',
    label: 'Arquivado',
  },
  pending: {
    icon: AlertTriangle,
    variant: 'warning',
    label: 'Pendente',
  },
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  /**
   * ETP status to display
   */
  status: EtpStatus;
  /**
   * Show icon (default: true)
   * Icons should always be shown for accessibility
   */
  showIcon?: boolean;
}

/**
 * StatusBadge Component
 *
 * Displays ETP status with icon + color for WCAG 2.1 AA compliance.
 * Information does not depend exclusively on color (1.4.1 Use of Color).
 *
 * Features:
 * - Icon + text + color combination
 * - Semantic HTML with proper aria attributes
 * - Consistent with Apple HIG design tokens
 * - Accessible to screen readers
 * - Works for colorblind users (icon differentiation)
 *
 * @example
 * ```tsx
 * <StatusBadge status="approved" />
 * <StatusBadge status="rejected" />
 * <StatusBadge status="in_progress" />
 * ```
 */
export function StatusBadge({
  status,
  showIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      icon={showIcon ? <Icon className="h-3 w-3" /> : undefined}
      className={cn('whitespace-nowrap', className)}
      role="status"
      aria-label={`Status: ${config.label}`}
      {...props}
    >
      {config.label}
    </Badge>
  );
}
