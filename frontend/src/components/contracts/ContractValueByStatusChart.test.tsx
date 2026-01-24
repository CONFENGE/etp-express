import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContractValueByStatusChart } from './ContractValueByStatusChart';
import { ContratoStatus } from '@/types/contract';
import type { ValueByStatusResponse } from '@/hooks/contracts/useContractValueByStatus';

// Mock do hook useContractValueByStatus
vi.mock('@/hooks/contracts/useContractValueByStatus', () => ({
  useContractValueByStatus: vi.fn(),
}));

import { useContractValueByStatus } from '@/hooks/contracts/useContractValueByStatus';

describe('ContractValueByStatusChart', () => {
  const mockData: ValueByStatusResponse = {
    chartData: [
      {
        status: ContratoStatus.EM_EXECUCAO,
        value: 800000.0,
        count: 15,
      },
      {
        status: ContratoStatus.ASSINADO,
        value: 500000.0,
        count: 10,
      },
      {
        status: ContratoStatus.ADITIVADO,
        value: 200000.0,
        count: 5,
      },
      {
        status: ContratoStatus.SUSPENSO,
        value: 100000.0,
        count: 2,
      },
      {
        status: ContratoStatus.ENCERRADO,
        value: 1000000.0,
        count: 20,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render chart title', () => {
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ContractValueByStatusChart />);

    expect(screen.getByText('Valor por Status')).toBeInTheDocument();
  });

  it('should render loading skeleton when isLoading is true', () => {
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<ContractValueByStatusChart />);

    expect(screen.getByLabelText('Carregando gráfico')).toBeInTheDocument();
    expect(screen.getByLabelText('Carregando gráfico')).toHaveClass(
      'animate-pulse',
    );
  });

  it('should render error alert when error occurs', () => {
    const errorMessage = 'Erro ao carregar distribuição de valor por status';
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: null,
      isLoading: false,
      error: errorMessage,
      refetch: vi.fn(),
    });

    render(<ContractValueByStatusChart />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Valor por Status')).toBeInTheDocument(); // Title should still be rendered
  });

  it('should render empty state when no data', () => {
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: { chartData: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ContractValueByStatusChart />);

    expect(screen.getByText('Nenhum dado disponível')).toBeInTheDocument();
  });

  it('should render empty state when data is null', () => {
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ContractValueByStatusChart />);

    expect(screen.getByText('Nenhum dado disponível')).toBeInTheDocument();
  });

  it('should render PieChart when data is available', () => {
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<ContractValueByStatusChart />);

    // Recharts renders ResponsiveContainer div
    // SVG rendering may fail in JSDOM without actual dimensions
    const responsiveContainer = container.querySelector(
      '.recharts-responsive-container',
    );
    expect(responsiveContainer).toBeInTheDocument();
  });

  it('should handle single status data correctly', () => {
    const singleStatusData: ValueByStatusResponse = {
      chartData: [
        {
          status: ContratoStatus.EM_EXECUCAO,
          value: 1000000.0,
          count: 50,
        },
      ],
    };

    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: singleStatusData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<ContractValueByStatusChart />);

    const responsiveContainer = container.querySelector(
      '.recharts-responsive-container',
    );
    expect(responsiveContainer).toBeInTheDocument();
  });

  it('should render ResponsiveContainer with correct dimensions', () => {
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<ContractValueByStatusChart />);

    // ResponsiveContainer renders a div with specific class
    const responsiveContainer = container.querySelector(
      '.recharts-responsive-container',
    );
    expect(responsiveContainer).toBeInTheDocument();
  });

  it('should maintain accessibility during loading', () => {
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<ContractValueByStatusChart />);

    const skeleton = screen.getByLabelText('Carregando gráfico');
    expect(skeleton).toHaveAttribute('aria-label', 'Carregando gráfico');
  });

  it('should show error with alert destructive variant', () => {
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Network error',
      refetch: vi.fn(),
    });

    const { container } = render(<ContractValueByStatusChart />);

    // Alert component with destructive variant
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });

  it('should handle zero value data gracefully', () => {
    const zeroValueData: ValueByStatusResponse = {
      chartData: [
        {
          status: ContratoStatus.ASSINADO,
          value: 0,
          count: 0,
        },
      ],
    };

    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: zeroValueData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<ContractValueByStatusChart />);

    // Chart should still render (ResponsiveContainer)
    const responsiveContainer = container.querySelector(
      '.recharts-responsive-container',
    );
    expect(responsiveContainer).toBeInTheDocument();
  });

  it('should render card with correct styling', () => {
    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<ContractValueByStatusChart />);

    const card = container.querySelector('.rounded-lg.border.bg-card.p-6');
    expect(card).toBeInTheDocument();
  });

  it('should include all status types in data', () => {
    const fullStatusData: ValueByStatusResponse = {
      chartData: [
        {
          status: ContratoStatus.MINUTA,
          value: 50000.0,
          count: 3,
        },
        {
          status: ContratoStatus.ASSINADO,
          value: 100000.0,
          count: 5,
        },
        {
          status: ContratoStatus.EM_EXECUCAO,
          value: 200000.0,
          count: 10,
        },
        {
          status: ContratoStatus.ADITIVADO,
          value: 75000.0,
          count: 4,
        },
        {
          status: ContratoStatus.SUSPENSO,
          value: 25000.0,
          count: 1,
        },
        {
          status: ContratoStatus.RESCINDIDO,
          value: 30000.0,
          count: 2,
        },
        {
          status: ContratoStatus.ENCERRADO,
          value: 300000.0,
          count: 15,
        },
      ],
    };

    vi.mocked(useContractValueByStatus).mockReturnValue({
      data: fullStatusData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<ContractValueByStatusChart />);

    // Should render ResponsiveContainer for complete data
    const responsiveContainer = container.querySelector(
      '.recharts-responsive-container',
    );
    expect(responsiveContainer).toBeInTheDocument();
  });
});
