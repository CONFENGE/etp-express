import { create } from 'zustand';
import { apiHelpers } from '@/lib/api';
import { getContextualErrorMessage } from '@/lib/api-errors';

/**
 * Benchmark statistics for the market dashboard.
 * Aligned with backend BenchmarkStatsDto.
 */
export interface BenchmarkStats {
  totalBenchmarks: number;
  categoriesWithBenchmarks: number;
  regionsWithBenchmarks: number;
  lastCalculatedAt: string | null;
  averageMedianPrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
}

/**
 * Regional benchmark data for heat map visualization.
 */
export interface RegionalBenchmarkData {
  uf: string;
  ufName: string;
  medianPrice: number;
  priceCount: number;
  deviationFromNational: number;
}

/**
 * Category ranking item for top categories chart.
 */
export interface CategoryRanking {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  contractCount: number;
  totalValue: number;
  averagePrice: number;
}

/**
 * Alert summary for the dashboard.
 * Aligned with backend AlertSummaryDto.
 */
export interface AlertSummary {
  total: number;
  byLevel: {
    ok: number;
    attention: number;
    warning: number;
    critical: number;
  };
  acknowledged: number;
  pending: number;
}

/**
 * Price trend data point for time series chart.
 */
export interface PriceTrendPoint {
  date: string;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceCount: number;
}

/**
 * Price trend response from API.
 */
export interface PriceTrendData {
  categoryId: string;
  categoryName: string;
  points: PriceTrendPoint[];
  overallTrend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

/**
 * Market analytics dashboard filters.
 */
export interface MarketAnalyticsFilters {
  periodDays: number;
  categoryId?: string;
  uf?: string;
}

/**
 * Market Analytics Store
 *
 * Manages state for the Market Intelligence Dashboard (#1273).
 * Integrates with:
 * - Regional Benchmark API (#1271)
 * - Overprice Alert API (#1272)
 * - Contract Price Collector (#1269)
 *
 * Part of M13: Market Intelligence EPIC (#1268).
 */
interface MarketAnalyticsState {
  // Data
  stats: BenchmarkStats | null;
  regionalData: RegionalBenchmarkData[];
  topCategories: CategoryRanking[];
  alertSummary: AlertSummary | null;
  priceTrend: PriceTrendData | null;

  // Filters
  filters: MarketAnalyticsFilters;

  // Loading states
  isLoadingStats: boolean;
  isLoadingRegional: boolean;
  isLoadingCategories: boolean;
  isLoadingAlerts: boolean;
  isLoadingTrend: boolean;

  // Error state
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchRegionalData: (categoryId?: string) => Promise<void>;
  fetchTopCategories: (limit?: number) => Promise<void>;
  fetchAlertSummary: () => Promise<void>;
  fetchPriceTrend: (categoryId: string, periodDays?: number) => Promise<void>;
  fetchAllDashboardData: () => Promise<void>;
  setFilters: (filters: Partial<MarketAnalyticsFilters>) => void;
  clearError: () => void;
}

// Brazilian states mapping for regional display
export const UF_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapa',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceara',
  DF: 'Distrito Federal',
  ES: 'Espirito Santo',
  GO: 'Goias',
  MA: 'Maranhao',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Para',
  PB: 'Paraiba',
  PR: 'Parana',
  PE: 'Pernambuco',
  PI: 'Piaui',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondonia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'Sao Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
  BR: 'Brasil (Nacional)',
};

export const useMarketAnalyticsStore = create<MarketAnalyticsState>(
  (set, get) => ({
    // Initial state
    stats: null,
    regionalData: [],
    topCategories: [],
    alertSummary: null,
    priceTrend: null,

    filters: {
      periodDays: 30,
    },

    isLoadingStats: false,
    isLoadingRegional: false,
    isLoadingCategories: false,
    isLoadingAlerts: false,
    isLoadingTrend: false,

    error: null,

    /**
     * Fetch benchmark statistics for the dashboard header.
     */
    fetchStats: async () => {
      set({ isLoadingStats: true, error: null });
      try {
        const response = await apiHelpers.get<BenchmarkStats>(
          '/market-intelligence/benchmark/stats',
        );
        set({ stats: response, isLoadingStats: false });
      } catch (error) {
        set({
          error: getContextualErrorMessage(
            'carregar',
            'estatisticas de benchmark',
            error,
          ),
          isLoadingStats: false,
        });
      }
    },

    /**
     * Fetch regional breakdown for heat map visualization.
     */
    fetchRegionalData: async (categoryId?: string) => {
      set({ isLoadingRegional: true, error: null });
      try {
        // If categoryId is provided, get regional breakdown for that category
        // Otherwise, get aggregated regional data
        const endpoint = categoryId
          ? `/market-intelligence/benchmark/${categoryId}/regional`
          : '/market-intelligence/benchmark';

        const response = await apiHelpers.get<{
          data: RegionalBenchmarkData[];
          regions?: Array<{
            uf: string;
            medianPrice: number;
            priceCount: number;
            deviationFromNational: number;
          }>;
        }>(endpoint);

        // Transform response to regional data format
        const regions = response.regions || response.data;
        const regionalData = Array.isArray(regions)
          ? regions.map((r) => ({
              uf: r.uf,
              ufName: UF_NAMES[r.uf] || r.uf,
              medianPrice: r.medianPrice,
              priceCount: r.priceCount,
              deviationFromNational: r.deviationFromNational,
            }))
          : [];

        set({ regionalData, isLoadingRegional: false });
      } catch (error) {
        set({
          error: getContextualErrorMessage(
            'carregar',
            'dados regionais',
            error,
          ),
          isLoadingRegional: false,
        });
      }
    },

    /**
     * Fetch top contracted categories for ranking chart.
     */
    fetchTopCategories: async (limit = 10) => {
      set({ isLoadingCategories: true, error: null });
      try {
        const response = await apiHelpers.get<{
          data: CategoryRanking[];
          total: number;
        }>(`/market-intelligence/benchmark?limit=${limit}&sortBy=contractCount`);

        // Transform benchmarks to category rankings
        const topCategories = (response.data || []).slice(0, limit);
        set({ topCategories, isLoadingCategories: false });
      } catch (error) {
        set({
          error: getContextualErrorMessage(
            'carregar',
            'categorias mais contratadas',
            error,
          ),
          isLoadingCategories: false,
        });
      }
    },

    /**
     * Fetch alert summary for the alerts widget.
     */
    fetchAlertSummary: async () => {
      set({ isLoadingAlerts: true, error: null });
      try {
        const response =
          await apiHelpers.get<AlertSummary>('/analytics/alerts/summary');
        set({ alertSummary: response, isLoadingAlerts: false });
      } catch (error) {
        set({
          error: getContextualErrorMessage(
            'carregar',
            'resumo de alertas',
            error,
          ),
          isLoadingAlerts: false,
        });
      }
    },

    /**
     * Fetch price trend data for time series chart.
     */
    fetchPriceTrend: async (categoryId: string, _periodDays = 365) => {
      set({ isLoadingTrend: true, error: null });
      try {
        // Note: This endpoint may need to be implemented in backend
        // For now, we'll generate mock data based on benchmark stats
        const response = await apiHelpers.get<{
          data: BenchmarkStats;
        }>(`/market-intelligence/benchmark/${categoryId}`);

        // Transform to trend data (mock implementation)
        const now = new Date();
        const points: PriceTrendPoint[] = [];
        const basePrice = response.data?.averageMedianPrice || 1000;

        for (let i = 12; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          const variation = (Math.random() - 0.5) * 0.2; // +/- 10%
          const price = basePrice * (1 + variation);
          points.push({
            date: date.toISOString().slice(0, 7), // YYYY-MM format
            medianPrice: Math.round(price * 100) / 100,
            minPrice: Math.round(price * 0.7 * 100) / 100,
            maxPrice: Math.round(price * 1.3 * 100) / 100,
            priceCount: Math.floor(Math.random() * 100) + 10,
          });
        }

        const firstPrice = points[0]?.medianPrice || 0;
        const lastPrice = points[points.length - 1]?.medianPrice || 0;
        const trendPercentage =
          firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

        const priceTrend: PriceTrendData = {
          categoryId,
          categoryName: categoryId,
          points,
          overallTrend:
            trendPercentage > 2 ? 'up' : trendPercentage < -2 ? 'down' : 'stable',
          trendPercentage: Math.round(trendPercentage * 10) / 10,
        };

        set({ priceTrend, isLoadingTrend: false });
      } catch (error) {
        set({
          error: getContextualErrorMessage(
            'carregar',
            'tendencia de precos',
            error,
          ),
          isLoadingTrend: false,
        });
      }
    },

    /**
     * Fetch all dashboard data in parallel.
     */
    fetchAllDashboardData: async () => {
      const { fetchStats, fetchRegionalData, fetchTopCategories, fetchAlertSummary } =
        get();

      // Fetch all data in parallel
      await Promise.all([
        fetchStats(),
        fetchRegionalData(),
        fetchTopCategories(),
        fetchAlertSummary(),
      ]);
    },

    /**
     * Update filters and optionally refetch data.
     */
    setFilters: (newFilters: Partial<MarketAnalyticsFilters>) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      }));
    },

    /**
     * Clear error state.
     */
    clearError: () => set({ error: null }),
  }),
);
