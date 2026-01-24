/**
 * ContractStatusBadge Component (#1660)
 *
 * Displays contract status with semantic colors.
 */

import { ContratoStatus, CONTRATO_STATUS_COLOR, CONTRATO_STATUS_LABEL } from '@/types/contract';

interface ContractStatusBadgeProps {
  status: ContratoStatus;
  className?: string;
}

export function ContractStatusBadge({ status, className = '' }: ContractStatusBadgeProps) {
  const colorClass = CONTRATO_STATUS_COLOR[status];
  const label = CONTRATO_STATUS_LABEL[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass} ${className}`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}
