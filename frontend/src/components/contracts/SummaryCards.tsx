import { FileText, DollarSign, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { ContractKPIs } from '@/hooks/contracts/useContractKPIs';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Props para o componente KPICard.
 */
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'red';
  badge?: string;
}

/**
 * Card individual de KPI.
 *
 * Design:
 * - Card com sombra Apple HIG
 * - Ícone colorido no topo
 * - Valor grande e título descritivo
 * - Badge condicional para alertas
 */
function KPICard({ title, value, icon: Icon, color, badge }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  const badgeClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    orange: 'bg-orange-500 text-white',
    red: 'bg-red-500 text-white',
  };

  return (
    <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.12)] transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={`rounded-full p-3 ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
        {badge && (
          <div className="mt-4">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClasses[color]}`}
            >
              {badge}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Props para SummaryCards.
 */
interface SummaryCardsProps {
  data: ContractKPIs;
}

/**
 * Grid de cards de resumo (KPIs) para dashboard de contratos.
 *
 * Exibe 4 métricas principais:
 * 1. Total de contratos vigentes
 * 2. Valor total comprometido
 * 3. Contratos vencendo em 30 dias
 * 4. Medições pendentes
 *
 * **Issue #1659** - Add KPI summary cards for contracts dashboard
 *
 * Design:
 * - Grid responsivo (1 col mobile, 2 col tablet, 4 col desktop)
 * - Apple HIG spacing tokens (gap-6)
 * - Formatação brasileira de moeda
 * - Badges condicionais para alertas
 *
 * @param {SummaryCardsProps} props - Dados de KPIs do backend
 * @returns {JSX.Element} Grid com 4 KPI cards
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useContractKPIs();
 *
 * if (isLoading) return <SummaryCardsSkeleton />;
 *
 * return <SummaryCards data={data} />;
 * ```
 */
export function SummaryCards({ data }: SummaryCardsProps) {
  /**
   * Formata número como moeda brasileira.
   * @param value - Valor numérico
   * @returns String formatada (ex: "R$ 1.234.567,89")
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      role="region"
      aria-label="Indicadores de Contratos"
    >
      {/* Card 1: Contratos Vigentes */}
      <KPICard
        title="Contratos Vigentes"
        value={data.totalContracts}
        icon={FileText}
        color="blue"
      />

      {/* Card 2: Valor Total */}
      <KPICard
        title="Valor Total"
        value={formatCurrency(data.totalValue)}
        icon={DollarSign}
        color="green"
      />

      {/* Card 3: Vencendo (30 dias) */}
      <KPICard
        title="Vencendo (30d)"
        value={data.expiringIn30Days}
        icon={AlertTriangle}
        color="orange"
        badge={data.expiringIn30Days > 5 ? 'Atenção' : undefined}
      />

      {/* Card 4: Medições Pendentes */}
      <KPICard
        title="Medições Pendentes"
        value={data.pendingMeasurements}
        icon={ClipboardCheck}
        color="red"
        badge={data.pendingMeasurements > 10 ? 'Urgente' : undefined}
      />
    </div>
  );
}
