import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusDistributionChart } from './StatusDistributionChart';
import { type StatusDistributionData } from '@/hooks/useStatusDistribution';

// Mock ResizeObserver for ResponsiveContainer
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

describe('StatusDistributionChart', () => {
  const mockData: StatusDistributionData = [
    {
      status: 'draft',
      label: 'Rascunho',
      count: 5,
      percentage: 25.0,
      color: '#6B7280',
    },
    {
      status: 'in_progress',
      label: 'Em Andamento',
      count: 10,
      percentage: 50.0,
      color: '#3B82F6',
    },
    {
      status: 'completed',
      label: 'Concluido',
      count: 5,
      percentage: 25.0,
      color: '#10B981',
    },
  ];

  it('should render chart title', () => {
    render(<StatusDistributionChart data={mockData} />);

    expect(screen.getByText('Distribuicao por Status')).toBeInTheDocument();
  });

  it('should render status list on mobile view', () => {
    render(<StatusDistributionChart data={mockData} />);

    // Mobile list view should show all status labels
    const rascunhoElements = screen.getAllByText('Rascunho');
    expect(rascunhoElements.length).toBeGreaterThan(0);

    const emAndamentoElements = screen.getAllByText('Em Andamento');
    expect(emAndamentoElements.length).toBeGreaterThan(0);

    const concluidoElements = screen.getAllByText('Concluido');
    expect(concluidoElements.length).toBeGreaterThan(0);
  });

  it('should render total count', () => {
    render(<StatusDistributionChart data={mockData} />);

    // Total should be 5 + 10 + 5 = 20
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('20 ETPs')).toBeInTheDocument();
  });

  it('should render percentages in mobile list', () => {
    render(<StatusDistributionChart data={mockData} />);

    // Multiple 25% values exist (draft and completed both have 25%)
    expect(screen.getAllByText('25%').length).toBe(2);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should render skeleton when loading', () => {
    render(<StatusDistributionChart data={null} isLoading={true} />);

    expect(screen.getByText('Distribuicao por Status')).toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('should render empty state when data is empty array', () => {
    render(<StatusDistributionChart data={[]} />);

    expect(screen.getByText('Nenhum ETP encontrado')).toBeInTheDocument();
    expect(
      screen.getByText('Crie seu primeiro ETP para ver as estatisticas'),
    ).toBeInTheDocument();
  });

  it('should render empty state when data is null', () => {
    render(<StatusDistributionChart data={null} />);

    expect(screen.getByText('Nenhum ETP encontrado')).toBeInTheDocument();
  });

  it('should apply className prop', () => {
    render(
      <StatusDistributionChart data={mockData} className="custom-class" />,
    );

    expect(screen.getByTestId('status-distribution-chart')).toHaveClass(
      'custom-class',
    );
  });

  it('should render single status correctly', () => {
    const singleStatusData: StatusDistributionData = [
      {
        status: 'draft',
        label: 'Rascunho',
        count: 3,
        percentage: 100.0,
        color: '#6B7280',
      },
    ];

    render(<StatusDistributionChart data={singleStatusData} />);

    // Count appears in both center label and list view
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should render status count values', () => {
    render(<StatusDistributionChart data={mockData} />);

    // Count values appear in list - multiple 5s due to draft and completed
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should render with different data sets', () => {
    const alternativeData: StatusDistributionData = [
      {
        status: 'review',
        label: 'Em Revisao',
        count: 7,
        percentage: 70.0,
        color: '#F59E0B',
      },
      {
        status: 'archived',
        label: 'Arquivado',
        count: 3,
        percentage: 30.0,
        color: '#9CA3AF',
      },
    ];

    render(<StatusDistributionChart data={alternativeData} />);

    const revisaoElements = screen.getAllByText('Em Revisao');
    expect(revisaoElements.length).toBeGreaterThan(0);

    const arquivadoElements = screen.getAllByText('Arquivado');
    expect(arquivadoElements.length).toBeGreaterThan(0);
  });
});
