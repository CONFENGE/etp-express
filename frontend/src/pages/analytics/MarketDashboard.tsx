import { useEffect, useCallback, useState } from 'react';
import {
  BarChart3,
  RefreshCw,
  Filter,
  Download,
  TrendingUp,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  BenchmarkStatsCards,
  RegionalHeatMap,
  CategoryRanking,
  PriceTrendChart,
  AlertSummaryWidget,
} from '@/components/analytics';
import { useMarketAnalyticsStore } from '@/store/marketAnalyticsStore';
import { cn } from '@/lib/utils';

/**
 * Period options for filtering data.
 */
const PERIOD_OPTIONS = [
  { value: '7', label: 'Ultimos 7 dias' },
  { value: '30', label: 'Ultimos 30 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
  { value: '365', label: 'Ultimo ano' },
  { value: '0', label: 'Todo o periodo' },
];

/**
 * MarketDashboard Page
 *
 * Main dashboard for Market Intelligence module (#1273).
 * Part of M13: Market Intelligence EPIC (#1268).
 *
 * Features:
 * - Benchmark statistics summary cards
 * - Regional price heat map
 * - Top categories ranking chart
 * - Price trend visualization
 * - Alert summary widget
 * - Period filter
 * - Data refresh functionality
 *
 * Integrates with:
 * - Regional Benchmark API (#1271)
 * - Overprice Alert API (#1272)
 * - Contract Price Collector (#1269)
 */
export function MarketDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    stats,
    regionalData,
    topCategories,
    alertSummary,
    priceTrend,
    filters,
    isLoadingStats,
    isLoadingRegional,
    isLoadingCategories,
    isLoadingAlerts,
    isLoadingTrend,
    error,
    fetchAllDashboardData,
    fetchPriceTrend,
    setFilters,
    clearError,
  } = useMarketAnalyticsStore();

  // Fetch all data on mount
  useEffect(() => {
    fetchAllDashboardData();
  }, [fetchAllDashboardData]);

  // Fetch price trend when first category is available
  useEffect(() => {
    if (topCategories.length > 0 && !priceTrend) {
      fetchPriceTrend(topCategories[0].categoryId);
    }
  }, [topCategories, priceTrend, fetchPriceTrend]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAllDashboardData();
    setIsRefreshing(false);
  }, [fetchAllDashboardData]);

  // Handle period change
  const handlePeriodChange = useCallback(
    (value: string) => {
      setFilters({ periodDays: parseInt(value, 10) });
      handleRefresh();
    },
    [setFilters, handleRefresh],
  );

  // Handle view alerts navigation
  const handleViewAlerts = useCallback(() => {
    // TODO: Navigate to alerts list page when implemented
    console.log('Navigate to alerts list');
  }, []);

  // Handle category selection for trend chart
  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      fetchPriceTrend(categoryId, filters.periodDays);
    },
    [fetchPriceTrend, filters.periodDays],
  );

  // Calculate overall loading state
  const isLoading =
    isLoadingStats ||
    isLoadingRegional ||
    isLoadingCategories ||
    isLoadingAlerts;

  return (
    <MainLayout>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-16)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
          className="sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8" aria-hidden="true" />
              Inteligencia de Mercado
            </h1>
            <p className="text-muted-foreground">
              Analise de precos, benchmarks e tendencias de contratacoes publicas
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Filter */}
            <Select
              value={filters.periodDays.toString()}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger className="w-[180px]" aria-label="Filtrar por periodo">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Atualizar dados"
            >
              <RefreshCw
                className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
              />
            </Button>

            {/* Export Button (placeholder) */}
            <Button variant="outline" disabled aria-label="Exportar dados">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar dados</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={clearError}>
                Fechar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <BenchmarkStatsCards
          stats={stats}
          alertSummary={alertSummary}
          isLoading={isLoading}
        />

        {/* Main Content Grid */}
        <div
          style={{ display: 'grid', gap: 'var(--space-4)' }}
          className="lg:grid-cols-2"
        >
          {/* Regional Heat Map */}
          <RegionalHeatMap data={regionalData} isLoading={isLoadingRegional} />

          {/* Alert Summary Widget */}
          <AlertSummaryWidget
            data={alertSummary}
            isLoading={isLoadingAlerts}
            onViewAlerts={handleViewAlerts}
          />
        </div>

        {/* Second Row */}
        <div
          style={{ display: 'grid', gap: 'var(--space-4)' }}
          className="lg:grid-cols-2"
        >
          {/* Category Ranking */}
          <CategoryRanking data={topCategories} isLoading={isLoadingCategories} />

          {/* Price Trend Chart */}
          <div className="space-y-2">
            {/* Category selector for trend */}
            {topCategories.length > 1 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Ver tendencia para:
                </span>
                <Select
                  value={priceTrend?.categoryId || topCategories[0]?.categoryId}
                  onValueChange={handleCategorySelect}
                >
                  <SelectTrigger className="w-[200px]" aria-label="Selecionar categoria">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {topCategories.slice(0, 5).map((cat) => (
                      <SelectItem key={cat.categoryId} value={cat.categoryId}>
                        {cat.categoryName.length > 30
                          ? cat.categoryName.slice(0, 30) + '...'
                          : cat.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <PriceTrendChart data={priceTrend} isLoading={isLoadingTrend} />
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            Dados atualizados com base em contratacoes do PNCP, Compras.gov.br e
            outras fontes governamentais.
          </p>
          <p>
            Ultima atualizacao:{' '}
            {stats?.lastCalculatedAt
              ? new Date(stats.lastCalculatedAt).toLocaleString('pt-BR')
              : 'Nao disponivel'}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
