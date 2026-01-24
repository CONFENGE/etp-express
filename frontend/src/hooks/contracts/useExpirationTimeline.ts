/**
 * useExpirationTimeline Hook (#1662)
 *
 * React Query hook for fetching contracts expiration timeline.
 * Returns contracts expiring in the next N days, ordered by expiration date.
 */

import { useQuery } from '@tanstack/react-query';

/**
 * Entry de contrato expirando para timeline.
 */
export interface ExpiringContract {
  /** UUID do contrato */
  contratoId: string;

  /** Número do contrato (ex: "001/2024") */
  numero: string;

  /** Razão social do contratado */
  contratado: string;

  /** Data de fim da vigência (ISO 8601) */
  vigenciaFim: string;

  /** Dias restantes até vencimento */
  daysUntilExpiration: number;

  /** Valor global do contrato (DECIMAL as string) */
  valor: string;
}

/**
 * Resposta da API de timeline de expiração.
 */
export interface ExpirationTimelineResponse {
  /** Lista de contratos vencendo nos próximos N dias */
  timeline: ExpiringContract[];
}

/**
 * Fetch expiration timeline for contracts
 */
export function useExpirationTimeline(days: number = 90) {
  return useQuery({
    queryKey: ['contracts', 'analytics', 'expiration-timeline', days],
    queryFn: async (): Promise<ExpirationTimelineResponse> => {
      const params = new URLSearchParams();
      params.append('days', days.toString());

      const response = await fetch(
        `/api/contratos/analytics/expiration-timeline?${params.toString()}`,
        {
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch expiration timeline');
      }

      return response.json();
    },
    // Keep data fresh for 5 minutes (contracts expiration doesn't change frequently)
    staleTime: 5 * 60 * 1000,
  });
}
