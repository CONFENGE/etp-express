import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import { MarketDashboard } from '../MarketDashboard';
import { useMarketAnalyticsStore } from '@/store/marketAnalyticsStore';

// Mock the store
vi.mock('@/store/marketAnalyticsStore', () => ({
  useMarketAnalyticsStore: vi.fn(),
}));

// Mock the components to simplify testing
vi.mock('@/components/analytics', () => ({
  BenchmarkStatsCards: ({ stats, isLoading }: { stats: unknown; isLoading: boolean }) => (
    <div data-testid="benchmark-stats-cards">
      {isLoading ? 'Loading stats...' : 'Stats loaded'}
    </div>
  ),
  RegionalHeatMap: ({ data, isLoading }: { data: unknown[]; isLoading: boolean }) => (
    <div data-testid="regional-heat-map">
      {isLoading ? 'Loading map...' : `Map with ${(data as unknown[])?.length || 0} regions`}
    </div>
  ),
  CategoryRanking: ({ data, isLoading }: { data: unknown[]; isLoading: boolean }) => (
    <div data-testid="category-ranking">
      {isLoading ? 'Loading categories...' : `${(data as unknown[])?.length || 0} categories`}
    </div>
  ),
  PriceTrendChart: ({ data, isLoading }: { data: unknown; isLoading: boolean }) => (
    <div data-testid="price-trend-chart">
      {isLoading ? 'Loading trend...' : data ? 'Trend loaded' : 'No trend'}
    </div>
  ),
  AlertSummaryWidget: ({ data, isLoading }: { data: unknown; isLoading: boolean }) => (
    <div data-testid="alert-summary-widget">
      {isLoading ? 'Loading alerts...' : data ? 'Alerts loaded' : 'No alerts'}
    </div>
  ),
}));

const mockStore = {
  stats: { totalBenchmarks: 100 },
  regionalData: [{ uf: 'SP' }],
  topCategories: [{ categoryId: '1', categoryName: 'Test' }],
  alertSummary: { total: 10 },
  priceTrend: null,
  filters: { periodDays: 30 },
  isLoadingStats: false,
  isLoadingRegional: false,
  isLoadingCategories: false,
  isLoadingAlerts: false,
  isLoadingTrend: false,
  error: null,
  fetchAllDashboardData: vi.fn(),
  fetchPriceTrend: vi.fn(),
  setFilters: vi.fn(),
  clearError: vi.fn(),
};

function renderWithRouter(component: React.ReactNode) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('MarketDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMarketAnalyticsStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
  });

  it('renders the dashboard title', () => {
    renderWithRouter(<MarketDashboard />);

    expect(screen.getByText('Inteligencia de Mercado')).toBeInTheDocument();
  });

  it('renders the dashboard description', () => {
    renderWithRouter(<MarketDashboard />);

    expect(
      screen.getByText(
        'Analise de precos, benchmarks e tendencias de contratacoes publicas',
      ),
    ).toBeInTheDocument();
  });

  it('renders all dashboard components', () => {
    renderWithRouter(<MarketDashboard />);

    expect(screen.getByTestId('benchmark-stats-cards')).toBeInTheDocument();
    expect(screen.getByTestId('regional-heat-map')).toBeInTheDocument();
    expect(screen.getByTestId('category-ranking')).toBeInTheDocument();
    expect(screen.getByTestId('price-trend-chart')).toBeInTheDocument();
    expect(screen.getByTestId('alert-summary-widget')).toBeInTheDocument();
  });

  it('fetches all dashboard data on mount', async () => {
    renderWithRouter(<MarketDashboard />);

    await waitFor(() => {
      expect(mockStore.fetchAllDashboardData).toHaveBeenCalled();
    });
  });

  it('renders period filter', () => {
    renderWithRouter(<MarketDashboard />);

    expect(screen.getByRole('combobox', { name: /Filtrar por periodo/i })).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    renderWithRouter(<MarketDashboard />);

    expect(screen.getByRole('button', { name: /Atualizar dados/i })).toBeInTheDocument();
  });

  it('renders export button', () => {
    renderWithRouter(<MarketDashboard />);

    expect(screen.getByRole('button', { name: /Exportar dados/i })).toBeInTheDocument();
  });

  it('shows error alert when error exists', () => {
    const storeWithError = {
      ...mockStore,
      error: 'Failed to load data',
    };
    (useMarketAnalyticsStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithError);

    renderWithRouter(<MarketDashboard />);

    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('shows loading states when data is loading', () => {
    const loadingStore = {
      ...mockStore,
      isLoadingStats: true,
      isLoadingRegional: true,
      isLoadingCategories: true,
      isLoadingAlerts: true,
      isLoadingTrend: true,
    };
    (useMarketAnalyticsStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(loadingStore);

    renderWithRouter(<MarketDashboard />);

    expect(screen.getByText('Loading stats...')).toBeInTheDocument();
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
    expect(screen.getByText('Loading alerts...')).toBeInTheDocument();
    expect(screen.getByText('Loading trend...')).toBeInTheDocument();
  });

  it('renders footer with data source information', () => {
    renderWithRouter(<MarketDashboard />);

    expect(
      screen.getByText(
        /Dados atualizados com base em contratacoes do PNCP, Compras.gov.br/,
      ),
    ).toBeInTheDocument();
  });
});
