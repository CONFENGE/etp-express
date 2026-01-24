import { useState, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';
import { getContextualErrorMessage } from '@/lib/api-errors';
import { ContratoStatus } from '@/types/contract';

/**
 * Entry de valor por status para gráfico de pizza.
 *
 * @see backend/src/modules/contratos/services/contratos-kpi.service.ts
 */
export interface ValueByStatusEntry {
  /** Status do contrato */
  status: ContratoStatus;

  /** Valor total de contratos neste status (R$) */
  value: number;

  /** Quantidade de contratos neste status */
  count: number;

  /** Index signature para compatibilidade com Recharts */
  [key: string]: unknown;
}

/**
 * Resposta do endpoint analytics/value-by-status.
 *
 * Issue #1661 - Add contract value by status chart
 */
export interface ValueByStatusResponse {
  /** Dados do gráfico de pizza agrupados por status */
  chartData: ValueByStatusEntry[];
}

/**
 * Hook para buscar distribuição de valor por status.
 *
 * Faz chamada à API GET /api/contratos/analytics/value-by-status
 * e gerencia estados de loading/error.
 *
 * Usado para renderizar gráfico de pizza no dashboard (#1661).
 *
 * **Exemplo de uso:**
 * ```tsx
 * function ContractValueChart() {
 *   const { data, isLoading, error } = useContractValueByStatus();
 *
 *   if (isLoading) return <ChartSkeleton />;
 *   if (error) return <ErrorMessage>{error}</ErrorMessage>;
 *
 *   return <PieChart data={data.chartData} />;
 * }
 * ```
 *
 * @returns {object} Estado com data, isLoading, error e refetch
 */
export function useContractValueByStatus() {
  const [data, setData] = useState<ValueByStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchValueByStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiHelpers.get<ValueByStatusResponse>(
        '/contratos/analytics/value-by-status',
      );
      setData(response);
    } catch (err) {
      setError(
        getContextualErrorMessage(
          'carregar',
          'distribuição de valor por status',
          err,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchValueByStatus();
  }, []);

  return {
    data,
    isLoading,
    error,
    /** Recarrega os dados manualmente */
    refetch: fetchValueByStatus,
  };
}
