/**
 * ContractsTable Tests (#1660)
 *
 * Coverage targets:
 * - Rendering table with data
 * - Pagination controls
 * - Filter interactions
 * - Loading states (skeleton)
 * - Empty states
 * - Mobile responsive cards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContractsTable } from './ContractsTable';
import { ContratoStatus, Contrato, ContractsResponse } from '@/types/contract';

// Mock useContracts hook
vi.mock('@/hooks/contracts/useContracts', () => ({
  useContracts: vi.fn(),
}));

import { useContracts } from '@/hooks/contracts/useContracts';

const mockContracts: Contrato[] = [
  {
    id: '1',
    numero: '001/2024',
    numeroProcesso: '12345/2024',
    objeto: 'Contratação de serviços de TI',
    contratadoCnpj: '12.345.678/0001-90',
    contratadoRazaoSocial: 'Empresa XYZ Ltda',
    contratadoNomeFantasia: 'XYZ',
    valorGlobal: '100000.00',
    vigenciaInicio: '2024-01-01',
    vigenciaFim: '2024-12-31',
    status: ContratoStatus.EM_EXECUCAO,
    gestorResponsavel: { id: 'u1', name: 'João Silva' },
    fiscalResponsavel: { id: 'u2', name: 'Maria Santos' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    numero: '002/2024',
    numeroProcesso: null,
    objeto: 'Aquisição de materiais de escritório',
    contratadoCnpj: '98.765.432/0001-01',
    contratadoRazaoSocial: 'Papelaria ABC S/A',
    contratadoNomeFantasia: null,
    valorGlobal: '50000.00',
    vigenciaInicio: '2024-02-01',
    vigenciaFim: '2025-01-31',
    status: ContratoStatus.ASSINADO,
    gestorResponsavel: { id: 'u3', name: 'Carlos Lima' },
    fiscalResponsavel: { id: 'u4', name: 'Ana Costa' },
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
];

const mockResponse: ContractsResponse = {
  data: mockContracts,
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('ContractsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table with contract data', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockResponse,
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    // Check table headers
    expect(screen.getByText('Número')).toBeInTheDocument();
    expect(screen.getByText('Objeto')).toBeInTheDocument();
    expect(screen.getByText('Contratado')).toBeInTheDocument();
    expect(screen.getByText('Valor')).toBeInTheDocument();
    expect(screen.getByText('Vigência')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Check contract data
    await waitFor(() => {
      expect(screen.getByText('001/2024')).toBeInTheDocument();
      expect(screen.getByText(/Contratação de serviços de TI/)).toBeInTheDocument();
      expect(screen.getByText('Empresa XYZ Ltda')).toBeInTheDocument();
      expect(screen.getByText(/R\$\s*100\.000,00/)).toBeInTheDocument();
    });
  });

  it('displays skeleton loading state', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    // Check for skeleton elements (animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays empty state when no contracts found', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: { ...mockResponse, data: [], total: 0 },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum contrato encontrado com os filtros aplicados.')
      ).toBeInTheDocument();
    });
  });

  it('displays error message on fetch error', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as any);

    renderWithProviders(<ContractsTable />);

    expect(screen.getByText(/Erro ao carregar contratos/)).toBeInTheDocument();
  });

  it('renders status badges correctly', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockResponse,
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    await waitFor(() => {
      expect(screen.getByText('Em Execução')).toBeInTheDocument();
      expect(screen.getByText('Assinado')).toBeInTheDocument();
    });
  });

  it('formats currency values correctly', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockResponse,
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    await waitFor(() => {
      // R$ 100.000,00 formatted
      expect(screen.getByText(/100\.000,00/)).toBeInTheDocument();
      // R$ 50.000,00 formatted
      expect(screen.getByText(/50\.000,00/)).toBeInTheDocument();
    });
  });

  it('formats dates correctly (dd/MM/yyyy)', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockResponse,
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    await waitFor(() => {
      expect(screen.getByText('31/12/2024')).toBeInTheDocument();
      expect(screen.getByText('31/01/2025')).toBeInTheDocument();
    });
  });

  it('renders action buttons (Ver, Editar)', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockResponse,
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    await waitFor(() => {
      // Eye icons for "Ver"
      const viewButtons = screen.getAllByLabelText(/Ver contrato/i);
      expect(viewButtons.length).toBe(2);

      // Edit icons for "Editar"
      const editButtons = screen.getAllByLabelText(/Editar contrato/i);
      expect(editButtons.length).toBe(2);
    });
  });

  it('renders pagination controls when multiple pages', async () => {
    const multiPageResponse: ContractsResponse = {
      ...mockResponse,
      total: 25,
      totalPages: 3,
    };

    vi.mocked(useContracts).mockReturnValue({
      data: multiPageResponse,
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 3 (25 contratos)')).toBeInTheDocument();
      expect(screen.getByLabelText('Página anterior')).toBeInTheDocument();
      expect(screen.getByLabelText('Próxima página')).toBeInTheDocument();
    });
  });

  it('disables pagination buttons correctly', async () => {
    const firstPageResponse: ContractsResponse = {
      ...mockResponse,
      page: 1,
      totalPages: 3,
    };

    vi.mocked(useContracts).mockReturnValue({
      data: firstPageResponse,
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    await waitFor(() => {
      const prevButton = screen.getByLabelText('Página anterior');
      const nextButton = screen.getByLabelText('Próxima página');

      expect(prevButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });
  });

  it('truncates long text correctly', async () => {
    const longTextContract: Contrato = {
      ...mockContracts[0],
      objeto:
        'Este é um objeto extremamente longo que deve ser truncado após 60 caracteres para evitar quebra de layout na tabela',
    };

    vi.mocked(useContracts).mockReturnValue({
      data: { ...mockResponse, data: [longTextContract] },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ContractsTable />);

    await waitFor(() => {
      const objetoCell = screen.getByText(/Este é um objeto extremamente/);
      expect(objetoCell.textContent).toContain('...');
    });
  });
});
