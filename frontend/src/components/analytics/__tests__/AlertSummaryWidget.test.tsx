import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AlertSummaryWidget } from '../AlertSummaryWidget';
import type { AlertSummary } from '@/store/marketAnalyticsStore';

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

describe('AlertSummaryWidget', () => {
  it('renders alert summary when data is provided', () => {
    render(<AlertSummaryWidget data={mockAlertSummary} />);

    expect(screen.getByText('Resumo de Alertas')).toBeInTheDocument();
  });

  it('shows pending count in center of chart', () => {
    render(<AlertSummaryWidget data={mockAlertSummary} />);

    // Multiple '15' can exist (pending count and OK count), check for the label
    expect(screen.getByText('pendentes')).toBeInTheDocument();
    // The pending count should be in the center of the chart
    const pendingLabel = screen.getByText('pendentes');
    const centerContainer = pendingLabel.parentElement;
    expect(centerContainer?.querySelector('.text-xl')).toHaveTextContent('15');
  });

  it('displays legend with all alert levels', () => {
    render(<AlertSummaryWidget data={mockAlertSummary} />);

    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Atencao')).toBeInTheDocument();
    expect(screen.getByText('Aviso')).toBeInTheDocument();
    expect(screen.getByText('Critico')).toBeInTheDocument();
  });

  it('shows empty state when no alerts exist', () => {
    const emptyData: AlertSummary = {
      total: 0,
      byLevel: { ok: 0, attention: 0, warning: 0, critical: 0 },
      acknowledged: 0,
      pending: 0,
    };

    render(<AlertSummaryWidget data={emptyData} />);

    expect(screen.getByText('Nenhum alerta ativo')).toBeInTheDocument();
    expect(
      screen.getByText('Todos os precos estao dentro dos limites'),
    ).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<AlertSummaryWidget data={null} isLoading={true} />);

    // Should not show empty state when loading
    expect(screen.queryByText('Nenhum alerta ativo')).not.toBeInTheDocument();
  });

  it('calls onViewAlerts when button is clicked', () => {
    const handleViewAlerts = vi.fn();

    render(
      <AlertSummaryWidget
        data={mockAlertSummary}
        onViewAlerts={handleViewAlerts}
      />,
    );

    const button = screen.getByRole('button', { name: /Ver todos os alertas/i });
    fireEvent.click(button);

    expect(handleViewAlerts).toHaveBeenCalledTimes(1);
  });

  it('does not show view alerts button when callback is not provided', () => {
    render(<AlertSummaryWidget data={mockAlertSummary} />);

    expect(
      screen.queryByRole('button', { name: /Ver todos os alertas/i }),
    ).not.toBeInTheDocument();
  });

  it('shows acknowledged count in footer', () => {
    render(<AlertSummaryWidget data={mockAlertSummary} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('reconhecidos')).toBeInTheDocument();
  });

  it('has correct test id for container', () => {
    render(<AlertSummaryWidget data={mockAlertSummary} />);

    expect(screen.getByTestId('alert-summary-widget')).toBeInTheDocument();
  });

  it('shows description with pending and total counts', () => {
    render(<AlertSummaryWidget data={mockAlertSummary} />);

    expect(screen.getByText(/15 alertas pendentes de 25 total/)).toBeInTheDocument();
  });
});
