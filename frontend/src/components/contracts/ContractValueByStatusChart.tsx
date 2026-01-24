import { useContractValueByStatus } from '@/hooks/contracts/useContractValueByStatus';
import { PieChart, Pie, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import { ContratoStatus } from '@/types/contract';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Gráfico de pizza de valor por status de contratos.
 *
 * Exibe distribuição de valor total e quantidade de contratos
 * agrupados por status.
 *
 * Issue #1661 - Add contract value by status chart
 *
 * **Features:**
 * - Recharts PieChart responsivo
 * - Color coding semântico por status
 * - Tooltip com valor formatado + count
 * - Legendas com status e percentual
 * - Skeleton durante loading
 *
 * **API Endpoint:** GET /api/contratos/analytics/value-by-status
 *
 * @returns {JSX.Element} Gráfico de pizza em Card
 */
export function ContractValueByStatusChart() {
  const { data, isLoading, error } = useContractValueByStatus();

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Valor por Status</h3>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!data || data.chartData.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Valor por Status</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Nenhum dado disponível
        </div>
      </div>
    );
  }

  // Calcular total para percentuais
  const total = data.chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Valor por Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data.chartData}
            dataKey="value"
            nameKey="status"
            cx="50%"
            cy="50%"
            label={(entry) => renderLabel(entry, total)}
            labelLine={false}
          >
            {data.chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getStatusColor(entry.status)}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => getStatusLabel(value as ContratoStatus)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Skeleton para gráfico durante loading.
 *
 * Placeholder genérico com animação pulse.
 */
function ChartSkeleton() {
  return (
    <div
      className="rounded-lg border bg-card p-6 animate-pulse"
      aria-label="Carregando gráfico"
    >
      <div className="h-6 w-32 bg-muted rounded mb-4" />
      <div className="h-64 bg-muted rounded" />
    </div>
  );
}

/**
 * Renderiza label do gráfico com percentual.
 *
 * @param entry - Entry do Recharts (PieLabelRenderProps)
 * @param total - Valor total de todos os status
 * @returns Label formatado com percentual
 */
function renderLabel(
  entry: { value: number; [key: string]: unknown },
  total: number,
): string {
  const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
  return `${percent}%`;
}

/**
 * Tooltip customizado para gráfico de pizza.
 *
 * Exibe:
 * - Status do contrato (traduzido)
 * - Valor total (formatado em R$)
 * - Quantidade de contratos
 *
 * @param props - Dados do Recharts TooltipProps
 * @returns {JSX.Element | null} Tooltip formatado
 */
function CustomTooltip(props: {
  payload?: Array<{
    payload: { status: ContratoStatus; value: number; count: number };
  }>;
}): JSX.Element | null {
  const { payload } = props;
  if (!payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-md">
      <p className="font-semibold text-sm mb-1">
        {getStatusLabel(data.status)}
      </p>
      <p className="text-xs text-muted-foreground">
        Valor: {formatCurrency(data.value)}
      </p>
      <p className="text-xs text-muted-foreground">
        Contratos: {data.count}
      </p>
    </div>
  );
}

/**
 * Mapeia status de contrato para cor semântica.
 *
 * Color palette baseada em Apple HIG Design System:
 * - Vigente (ASSINADO): Green (#10B981)
 * - Em Execução: Blue (#3B82F6)
 * - Aditivado: Amber (#F59E0B)
 * - Suspenso: Red (#EF4444)
 * - Encerrado: Gray (#6B7280)
 * - Cancelado: Gray (#6B7280)
 *
 * @param status - Status do contrato
 * @returns {string} Código de cor HEX
 */
function getStatusColor(status: ContratoStatus): string {
  const colors: Record<ContratoStatus, string> = {
    [ContratoStatus.MINUTA]: '#9CA3AF', // light gray
    [ContratoStatus.ASSINADO]: '#10B981', // green
    [ContratoStatus.EM_EXECUCAO]: '#3B82F6', // blue
    [ContratoStatus.ADITIVADO]: '#F59E0B', // amber
    [ContratoStatus.SUSPENSO]: '#EF4444', // red
    [ContratoStatus.RESCINDIDO]: '#DC2626', // dark red
    [ContratoStatus.ENCERRADO]: '#6B7280', // gray
  };

  return colors[status] || '#6B7280'; // fallback gray
}

/**
 * Traduz status de contrato para português.
 *
 * @param status - Status do contrato
 * @returns {string} Label traduzido
 */
function getStatusLabel(status: ContratoStatus): string {
  const labels: Record<ContratoStatus, string> = {
    [ContratoStatus.MINUTA]: 'Minuta',
    [ContratoStatus.ASSINADO]: 'Vigente',
    [ContratoStatus.EM_EXECUCAO]: 'Em Execução',
    [ContratoStatus.ADITIVADO]: 'Aditivado',
    [ContratoStatus.SUSPENSO]: 'Suspenso',
    [ContratoStatus.RESCINDIDO]: 'Rescindido',
    [ContratoStatus.ENCERRADO]: 'Encerrado',
  };

  return labels[status] || status;
}

/**
 * Formata número para moeda brasileira (R$).
 *
 * @param value - Valor numérico
 * @returns {string} Valor formatado (ex: "R$ 1.234.567,89")
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
