/**
 * ExpirationTimeline Component Tests (#1662)
 *
 * Test coverage for ExpirationTimeline component:
 * - Loading state (skeleton)
 * - Error state
 * - Empty state (no expirations)
 * - Timeline with 3 urgency groups
 * - Color coding by urgency
 * - Data formatting (dates, currency)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpirationTimeline } from './ExpirationTimeline';
import * as useExpirationTimelineHook from '@/hooks/contracts/useExpirationTimeline';

// Mock the hook
vi.mock('@/hooks/contracts/useExpirationTimeline');

const mockUseExpirationTimeline =
  useExpirationTimelineHook.useExpirationTimeline as ReturnType<typeof vi.fn>;

// Helper to wrap component with QueryClient
function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
}

describe('ExpirationTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading skeleton when data is loading', () => {
    mockUseExpirationTimeline.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = renderWithQueryClient(<ExpirationTimeline />);

    expect(screen.getByText('Vencimentos (90 dias)')).toBeInTheDocument();
    // Check for skeleton elements with animate-pulse class
    expect(container.innerHTML).toContain('animate-pulse');
  });

  it('should render error state when fetch fails', () => {
    mockUseExpirationTimeline.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    });

    renderWithQueryClient(<ExpirationTimeline />);

    expect(
      screen.getByText(/Erro ao carregar timeline de vencimentos/i),
    ).toBeInTheDocument();
  });

  it('should render empty state when no contracts are expiring', () => {
    mockUseExpirationTimeline.mockReturnValue({
      data: { timeline: [] },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ExpirationTimeline />);

    expect(
      screen.getByText(/Nenhum contrato vencendo nos próximos 90 dias/i),
    ).toBeInTheDocument();
  });

  it('should render timeline with critical contracts (0-30 days)', () => {
    const mockData = {
      timeline: [
        {
          contratoId: '1',
          numero: '001/2024',
          contratado: 'Empresa A LTDA',
          vigenciaFim: '2024-02-15',
          daysUntilExpiration: 15,
          valor: '50000.00',
        },
        {
          contratoId: '2',
          numero: '002/2024',
          contratado: 'Empresa B LTDA',
          vigenciaFim: '2024-02-28',
          daysUntilExpiration: 28,
          valor: '120000.00',
        },
      ],
    };

    mockUseExpirationTimeline.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    const { container } = renderWithQueryClient(<ExpirationTimeline />);

    expect(screen.getByText('Próximos 30 dias')).toBeInTheDocument();
    expect(screen.getByText(/001\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/Empresa A LTDA/)).toBeInTheDocument();
    // Check the full container text for "Vence em" and "dias"
    expect(container.textContent).toContain('Vence em');
    expect(container.textContent).toContain('15 dias');
  });

  it('should render timeline with warning contracts (31-60 days)', () => {
    const mockData = {
      timeline: [
        {
          contratoId: '3',
          numero: '003/2024',
          contratado: 'Empresa C LTDA',
          vigenciaFim: '2024-03-15',
          daysUntilExpiration: 45,
          valor: '75000.00',
        },
      ],
    };

    mockUseExpirationTimeline.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ExpirationTimeline />);

    expect(screen.getByText('30-60 dias')).toBeInTheDocument();
    expect(screen.getByText(/003\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/45 dias/)).toBeInTheDocument();
  });

  it('should render timeline with info contracts (61-90 days)', () => {
    const mockData = {
      timeline: [
        {
          contratoId: '4',
          numero: '004/2024',
          contratado: 'Empresa D LTDA',
          vigenciaFim: '2024-04-15',
          daysUntilExpiration: 75,
          valor: '200000.00',
        },
      ],
    };

    mockUseExpirationTimeline.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ExpirationTimeline />);

    expect(screen.getByText('60-90 dias')).toBeInTheDocument();
    expect(screen.getByText(/004\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/75 dias/)).toBeInTheDocument();
  });

  it('should format currency values correctly', () => {
    const mockData = {
      timeline: [
        {
          contratoId: '1',
          numero: '001/2024',
          contratado: 'Empresa A LTDA',
          vigenciaFim: '2024-02-15',
          daysUntilExpiration: 15,
          valor: '123456.78',
        },
      ],
    };

    mockUseExpirationTimeline.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ExpirationTimeline />);

    // Currency format: R$ 123.456,78
    expect(screen.getByText(/R\$\s*123\.456,78/)).toBeInTheDocument();
  });

  it('should group contracts correctly by urgency', () => {
    const mockData = {
      timeline: [
        // Critical: 15 days
        {
          contratoId: '1',
          numero: '001/2024',
          contratado: 'Empresa A',
          vigenciaFim: '2024-02-15',
          daysUntilExpiration: 15,
          valor: '10000.00',
        },
        // Warning: 45 days
        {
          contratoId: '2',
          numero: '002/2024',
          contratado: 'Empresa B',
          vigenciaFim: '2024-03-15',
          daysUntilExpiration: 45,
          valor: '20000.00',
        },
        // Info: 75 days
        {
          contratoId: '3',
          numero: '003/2024',
          contratado: 'Empresa C',
          vigenciaFim: '2024-04-15',
          daysUntilExpiration: 75,
          valor: '30000.00',
        },
      ],
    };

    mockUseExpirationTimeline.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ExpirationTimeline />);

    // All 3 sections should be visible
    expect(screen.getByText('Próximos 30 dias')).toBeInTheDocument();
    expect(screen.getByText('30-60 dias')).toBeInTheDocument();
    expect(screen.getByText('60-90 dias')).toBeInTheDocument();

    // Each contract in its respective section
    expect(screen.getByText(/001\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/002\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/003\/2024/)).toBeInTheDocument();
  });

  it('should not render sections with 0 contracts', () => {
    const mockData = {
      timeline: [
        // Only critical: 15 days
        {
          contratoId: '1',
          numero: '001/2024',
          contratado: 'Empresa A',
          vigenciaFim: '2024-02-15',
          daysUntilExpiration: 15,
          valor: '10000.00',
        },
      ],
    };

    mockUseExpirationTimeline.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ExpirationTimeline />);

    // Only critical section should be visible
    expect(screen.getByText('Próximos 30 dias')).toBeInTheDocument();
    expect(screen.queryByText('30-60 dias')).not.toBeInTheDocument();
    expect(screen.queryByText('60-90 dias')).not.toBeInTheDocument();
  });
});
