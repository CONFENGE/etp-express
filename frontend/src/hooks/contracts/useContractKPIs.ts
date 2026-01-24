import { useState, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';
import { getContextualErrorMessage } from '@/lib/api-errors';

/**
 * Response de KPIs de contratos do backend.
 * @see backend/src/modules/contratos/services/contratos-kpi.service.ts
 */
export interface ContractKPIs {
  /** Total de contratos vigentes (status ASSINADO ou EM_EXECUCAO) */
  totalContracts: number;

  /** Valor total comprometido (soma de valorGlobal dos contratos vigentes) */
  totalValue: number;

  /** Quantidade de contratos vencendo nos próximos 30 dias */
  expiringIn30Days: number;

  /** Quantidade de medições com status PENDENTE */
  pendingMeasurements: number;
}

/**
 * Hook para buscar KPIs de contratos do dashboard.
 *
 * Faz chamada à API GET /api/contratos/kpis e gerencia estados de loading/error.
 *
 * **Exemplo de uso:**
 * ```tsx
 * function Dashboard() {
 *   const { data, isLoading, error } = useContractKPIs();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage>{error}</ErrorMessage>;
 *
 *   return <SummaryCards data={data} />;
 * }
 * ```
 *
 * @returns {object} Estado com data, isLoading, error e refetch
 */
export function useContractKPIs() {
  const [data, setData] = useState<ContractKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiHelpers.get<ContractKPIs>('/contratos/kpis');
      setData(response);
    } catch (err) {
      setError(getContextualErrorMessage('carregar', 'KPIs de contratos', err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, []);

  return {
    data,
    isLoading,
    error,
    /** Recarrega os KPIs manualmente */
    refetch: fetchKPIs,
  };
}
