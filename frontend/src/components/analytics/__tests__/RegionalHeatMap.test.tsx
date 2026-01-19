import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RegionalHeatMap } from '../RegionalHeatMap';
import type { RegionalBenchmarkData } from '@/store/marketAnalyticsStore';

const mockRegionalData: RegionalBenchmarkData[] = [
  {
    uf: 'SP',
    ufName: 'Sao Paulo',
    medianPrice: 3000,
    priceCount: 500,
    deviationFromNational: 10,
  },
  {
    uf: 'RJ',
    ufName: 'Rio de Janeiro',
    medianPrice: 3200,
    priceCount: 300,
    deviationFromNational: 15,
  },
  {
    uf: 'MG',
    ufName: 'Minas Gerais',
    medianPrice: 2500,
    priceCount: 200,
    deviationFromNational: -8,
  },
  {
    uf: 'RS',
    ufName: 'Rio Grande do Sul',
    medianPrice: 2200,
    priceCount: 150,
    deviationFromNational: -20,
  },
];

describe('RegionalHeatMap', () => {
  it('renders all state cells when data is provided', () => {
    render(<RegionalHeatMap data={mockRegionalData} />);

    // Check for state abbreviations
    expect(screen.getByText('SP')).toBeInTheDocument();
    expect(screen.getByText('RJ')).toBeInTheDocument();
    expect(screen.getByText('MG')).toBeInTheDocument();
    expect(screen.getByText('RS')).toBeInTheDocument();
  });

  it('shows card title and description', () => {
    render(<RegionalHeatMap data={mockRegionalData} />);

    expect(screen.getByText('Mapa Regional de Precos')).toBeInTheDocument();
    expect(
      screen.getByText(/Comparativo de precos por estado vs mediana nacional/),
    ).toBeInTheDocument();
  });

  it('shows empty state when no data is provided', () => {
    render(<RegionalHeatMap data={[]} />);

    expect(screen.getByText('Nenhum dado regional disponivel')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<RegionalHeatMap data={[]} isLoading={true} />);

    // Should not show title when loading
    expect(
      screen.queryByText('Nenhum dado regional disponivel'),
    ).not.toBeInTheDocument();
  });

  it('displays legend with color explanations', () => {
    render(<RegionalHeatMap data={mockRegionalData} />);

    expect(screen.getByText('Legenda:')).toBeInTheDocument();
    expect(screen.getByText('<-15%')).toBeInTheDocument();
    expect(screen.getByText('>+30%')).toBeInTheDocument();
  });

  it('displays formatted prices in cells', () => {
    render(<RegionalHeatMap data={mockRegionalData} />);

    // Check for formatted currency values
    expect(screen.getByText('R$ 3.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 2.200,00')).toBeInTheDocument();
  });

  it('displays deviation percentages in cells', () => {
    render(<RegionalHeatMap data={mockRegionalData} />);

    // Check for deviation percentages
    expect(screen.getByText('+10%')).toBeInTheDocument();
    expect(screen.getByText('-20%')).toBeInTheDocument();
  });

  it('has correct test id for container', () => {
    render(<RegionalHeatMap data={mockRegionalData} />);

    expect(screen.getByTestId('regional-heat-map')).toBeInTheDocument();
  });

  it('renders buttons with accessible labels', () => {
    const { container } = render(<RegionalHeatMap data={mockRegionalData} />);

    // All state cells should be buttons with aria-labels
    const buttons = container.querySelectorAll('button[aria-label]');
    expect(buttons.length).toBe(4); // 4 states in mock data

    // Check that SP button has correct aria-label
    const spButton = Array.from(buttons).find((btn) => {
      const ariaLabel = btn.getAttribute('aria-label') || '';
      return ariaLabel.includes('Sao Paulo') && ariaLabel.includes('3.000');
    });
    expect(spButton).toBeTruthy();
    expect(spButton?.getAttribute('aria-label')).toContain('da mediana nacional');
  });
});
