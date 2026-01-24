import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryCards } from './SummaryCards';
import { ContractKPIs } from '@/hooks/contracts/useContractKPIs';

describe('SummaryCards', () => {
  const mockData: ContractKPIs = {
    totalContracts: 42,
    totalValue: 1234567.89,
    expiringIn30Days: 7,
    pendingMeasurements: 12,
  };

  it('should render all 4 KPI cards', () => {
    render(<SummaryCards data={mockData} />);

    expect(screen.getByText('Contratos Vigentes')).toBeInTheDocument();
    expect(screen.getByText('Valor Total')).toBeInTheDocument();
    expect(screen.getByText('Vencendo (30d)')).toBeInTheDocument();
    expect(screen.getByText('Medições Pendentes')).toBeInTheDocument();
  });

  it('should display correct values', () => {
    render(<SummaryCards data={mockData} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.234.567,89')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should format currency correctly in Brazilian Portuguese', () => {
    const dataWithDecimal: ContractKPIs = {
      ...mockData,
      totalValue: 999.99,
    };

    render(<SummaryCards data={dataWithDecimal} />);

    expect(screen.getByText('R$ 999,99')).toBeInTheDocument();
  });

  it('should show "Atenção" badge when expiring contracts > 5', () => {
    const dataWithAlert: ContractKPIs = {
      ...mockData,
      expiringIn30Days: 6,
    };

    render(<SummaryCards data={dataWithAlert} />);

    expect(screen.getByText('Atenção')).toBeInTheDocument();
  });

  it('should not show "Atenção" badge when expiring contracts <= 5', () => {
    const dataWithoutAlert: ContractKPIs = {
      ...mockData,
      expiringIn30Days: 5,
    };

    render(<SummaryCards data={dataWithoutAlert} />);

    expect(screen.queryByText('Atenção')).not.toBeInTheDocument();
  });

  it('should show "Urgente" badge when pending measurements > 10', () => {
    const dataWithUrgent: ContractKPIs = {
      ...mockData,
      pendingMeasurements: 15,
    };

    render(<SummaryCards data={dataWithUrgent} />);

    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  it('should not show "Urgente" badge when pending measurements <= 10', () => {
    const dataWithoutUrgent: ContractKPIs = {
      ...mockData,
      pendingMeasurements: 10,
    };

    render(<SummaryCards data={dataWithoutUrgent} />);

    expect(screen.queryByText('Urgente')).not.toBeInTheDocument();
  });

  it('should handle zero values gracefully', () => {
    const zeroData: ContractKPIs = {
      totalContracts: 0,
      totalValue: 0,
      expiringIn30Days: 0,
      pendingMeasurements: 0,
    };

    render(<SummaryCards data={zeroData} />);

    // Check that all zero values are rendered (multiple 0s expected)
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThanOrEqual(3); // At least 3 cards with 0
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument(); // totalValue
    expect(screen.queryByText('Atenção')).not.toBeInTheDocument();
    expect(screen.queryByText('Urgente')).not.toBeInTheDocument();
  });

  it('should have correct accessibility attributes', () => {
    const { container } = render(<SummaryCards data={mockData} />);

    const region = container.querySelector('[role="region"]');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-label', 'Indicadores de Contratos');
  });

  it('should render icons for all cards', () => {
    const { container } = render(<SummaryCards data={mockData} />);

    // Each card has an icon (aria-hidden="true")
    const icons = container.querySelectorAll('[aria-hidden="true"]');
    expect(icons).toHaveLength(4);
  });
});
