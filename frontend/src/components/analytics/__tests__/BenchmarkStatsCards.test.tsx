import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BenchmarkStatsCards } from '../BenchmarkStatsCards';
import type { BenchmarkStats, AlertSummary } from '@/store/marketAnalyticsStore';

const mockStats: BenchmarkStats = {
  totalBenchmarks: 15000,
  categoriesWithBenchmarks: 450,
  regionsWithBenchmarks: 27,
  lastCalculatedAt: '2026-01-19T10:00:00Z',
  averageMedianPrice: 2500.5,
  priceRangeMin: 100,
  priceRangeMax: 50000,
};

const mockAlertSummary: AlertSummary = {
  total: 25,
  byLevel: {
    ok: 15,
    attention: 5,
    warning: 3,
    critical: 2,
  },
  acknowledged: 10,
  pending: 15,
};

describe('BenchmarkStatsCards', () => {
  it('renders all stat cards when data is provided', () => {
    render(
      <BenchmarkStatsCards
        stats={mockStats}
        alertSummary={mockAlertSummary}
      />,
    );

    // Check for card titles
    expect(screen.getByText('Total de Benchmarks')).toBeInTheDocument();
    expect(screen.getByText('Categorias Cobertas')).toBeInTheDocument();
    expect(screen.getByText('Regioes Cobertas')).toBeInTheDocument();
    expect(screen.getByText('Preco Medio')).toBeInTheDocument();
    expect(screen.getByText('Faixa de Precos')).toBeInTheDocument();
    expect(screen.getByText('Alertas Pendentes')).toBeInTheDocument();
  });

  it('displays correct values from stats', () => {
    render(
      <BenchmarkStatsCards
        stats={mockStats}
        alertSummary={mockAlertSummary}
      />,
    );

    // Check for formatted values
    expect(screen.getByText('15.000')).toBeInTheDocument(); // totalBenchmarks
    expect(screen.getByText('450')).toBeInTheDocument(); // categoriesWithBenchmarks
    expect(screen.getByText('27/27')).toBeInTheDocument(); // regionsWithBenchmarks
    expect(screen.getByText('15')).toBeInTheDocument(); // pending alerts
  });

  it('shows loading skeletons when isLoading is true', () => {
    render(
      <BenchmarkStatsCards
        stats={null}
        alertSummary={null}
        isLoading={true}
      />,
    );

    // Should not show card titles when loading
    expect(screen.queryByText('Total de Benchmarks')).not.toBeInTheDocument();
  });

  it('handles null stats gracefully', () => {
    render(
      <BenchmarkStatsCards
        stats={null}
        alertSummary={null}
      />,
    );

    // Should show zeros for null values
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('highlights alert card when critical alerts exist', () => {
    render(
      <BenchmarkStatsCards
        stats={mockStats}
        alertSummary={mockAlertSummary}
      />,
    );

    // The alert card should mention critical alerts
    expect(screen.getByText(/criticos\/warning/)).toBeInTheDocument();
  });

  it('shows no critical alerts message when all OK', () => {
    const noAlertsSummary: AlertSummary = {
      total: 10,
      byLevel: { ok: 10, attention: 0, warning: 0, critical: 0 },
      acknowledged: 10,
      pending: 0,
    };

    render(
      <BenchmarkStatsCards
        stats={mockStats}
        alertSummary={noAlertsSummary}
      />,
    );

    expect(screen.getByText('Nenhum alerta critico')).toBeInTheDocument();
  });

  it('has correct test id for container', () => {
    render(
      <BenchmarkStatsCards
        stats={mockStats}
        alertSummary={mockAlertSummary}
      />,
    );

    expect(screen.getByTestId('benchmark-stats-cards')).toBeInTheDocument();
  });
});
