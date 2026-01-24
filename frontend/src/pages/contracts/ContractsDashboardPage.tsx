import { MainLayout } from '@/components/layout/MainLayout';
import { SummaryCards } from '@/components/contracts/SummaryCards';
import { useContractKPIs } from '@/hooks/contracts/useContractKPIs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Contracts Dashboard Page (#1658)
 *
 * Provides centralized view of all contracts for the organization.
 * KPIs, charts, contract list, and expiration timeline.
 *
 * Architecture:
 * - Component-based structure for scalability
 * - Skeleton states for loading UX
 * - Responsive grid layout (Apple HIG spacing tokens)
 */
export function ContractsDashboardPage() {
  const { data, isLoading, error } = useContractKPIs();
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard de Contratos
            </h1>
            <p className="text-muted-foreground mt-2">
              Visão geral e gestão de contratos do órgão
            </p>
          </div>
        </div>

        {/* KPI Cards Section - #1659 */}
        <section aria-label="Indicadores de Contratos">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <SummaryCardsSkeleton />
            </div>
          ) : data ? (
            <SummaryCards data={data} />
          ) : null}
        </section>

        {/* Charts Section - Will be populated in #1661 */}
        <section
          aria-label="Gráficos e Análises"
          className="grid gap-6 lg:grid-cols-2"
        >
          <ChartSkeleton />
          <ChartSkeleton />
        </section>

        {/* Table and Timeline Section - Will be populated in #1660 and #1662 */}
        <section
          aria-label="Lista de Contratos"
          className="grid gap-6 lg:grid-cols-3"
        >
          <div className="lg:col-span-2">
            <TableSkeleton />
          </div>
          <div>
            <ChartSkeleton />
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

/**
 * Skeleton for Summary KPI Cards
 * Shows 4 placeholder cards while data loads
 */
function SummaryCardsSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-lg border bg-card p-6 animate-pulse"
          aria-label="Carregando indicador"
        >
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-8 w-16 bg-muted rounded" />
        </div>
      ))}
    </>
  );
}

/**
 * Skeleton for Chart Components
 * Generic placeholder for pie charts, bar charts, timelines
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
 * Skeleton for Contracts Table
 * Shows 10 placeholder rows
 */
function TableSkeleton() {
  return (
    <div
      className="rounded-lg border bg-card p-6 animate-pulse"
      aria-label="Carregando tabela de contratos"
    >
      <div className="h-6 w-48 bg-muted rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}
