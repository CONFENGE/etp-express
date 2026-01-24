/**
 * useContracts Hook (#1660)
 *
 * React Query hook for fetching paginated contracts with filters.
 * Supports server-side filtering by status, supplier, value range, and date range.
 */

import { useQuery } from '@tanstack/react-query';
import { ContractsResponse, ContractFilters } from '@/types/contract';

interface UseContractsParams {
  filters: ContractFilters;
  page: number;
  limit?: number;
}

/**
 * Fetch contracts with filters and pagination
 */
export function useContracts({ filters, page, limit = 10 }: UseContractsParams) {
  return useQuery({
    queryKey: ['contracts', filters, page, limit],
    queryFn: async (): Promise<ContractsResponse> => {
      const params = new URLSearchParams();

      // Add pagination params
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      // Add filter params
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach((s) => params.append('status', s));
      }
      if (filters.fornecedor) {
        params.append('fornecedor', filters.fornecedor);
      }
      if (filters.valorMin !== undefined) {
        params.append('valorMin', filters.valorMin.toString());
      }
      if (filters.valorMax !== undefined) {
        params.append('valorMax', filters.valorMax.toString());
      }
      if (filters.vigenciaInicio) {
        params.append('vigenciaInicio', filters.vigenciaInicio);
      }
      if (filters.vigenciaFim) {
        params.append('vigenciaFim', filters.vigenciaFim);
      }

      const response = await fetch(`/api/contracts?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }

      return response.json();
    },
    // Keep data fresh for 30 seconds
    staleTime: 30_000,
  });
}
