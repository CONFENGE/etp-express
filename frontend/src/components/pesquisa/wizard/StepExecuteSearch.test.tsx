import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  pesquisaPrecosWizardSchema,
  defaultPesquisaPrecosValues,
  PesquisaPrecosFormData,
  PriceSourceType,
} from '@/schemas/pesquisaPrecosSchema';
import { StepExecuteSearch } from './StepExecuteSearch';

// Mock the pesquisa precos store
const mockCreatePesquisa = vi.fn();
const mockCollectPrices = vi.fn();

vi.mock('@/store/pesquisaPrecosStore', () => ({
  usePesquisaPrecosStore: () => ({
    createPesquisa: mockCreatePesquisa,
    collectPrices: mockCollectPrices,
    currentPesquisa: null,
    isCollecting: false,
    error: null,
  }),
}));

// Component that provides form context to StepExecuteSearch
function StepExecuteSearchWrapper({
  items = [
    { id: 'item-1', description: 'Item de Teste 1', quantity: 10, unit: 'un' },
  ],
  selectedSources = [PriceSourceType.PNCP, PriceSourceType.SINAPI],
}: {
  items?: { id: string; description: string; quantity: number; unit: string }[];
  selectedSources?: PriceSourceType[];
}) {
  const form = useForm<PesquisaPrecosFormData>({
    resolver: zodResolver(pesquisaPrecosWizardSchema),
    defaultValues: {
      ...defaultPesquisaPrecosValues,
      items,
      selectedSources,
      baseType: 'etp',
      baseId: 'etp-123',
    },
  });

  return <StepExecuteSearch form={form} />;
}

describe('StepExecuteSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockCreatePesquisa.mockResolvedValue({ id: 'pesquisa-123' });
    mockCollectPrices.mockResolvedValue({
      results: [
        {
          itemId: 'item-1',
          results: [
            {
              itemId: 'item-1',
              source: PriceSourceType.PNCP,
              price: 100,
              date: '2026-01-15',
              reference: 'PNCP-123',
              isManual: false,
            },
            {
              itemId: 'item-1',
              source: PriceSourceType.SINAPI,
              price: 95,
              date: '2026-01-15',
              reference: 'SINAPI-456',
              isManual: false,
            },
          ],
        },
      ],
    });
  });

  it('renders execution header and instructions', () => {
    render(<StepExecuteSearchWrapper />);

    expect(screen.getByText('Execucao da Pesquisa')).toBeInTheDocument();
    expect(
      screen.getByText(/Clique em iniciar para coletar precos/),
    ).toBeInTheDocument();
  });

  it('renders start button when collection not started', () => {
    render(<StepExecuteSearchWrapper />);

    expect(screen.getByText('Iniciar Pesquisa')).toBeInTheDocument();
  });

  it('shows source status list with pending state initially', () => {
    render(<StepExecuteSearchWrapper />);

    // Should show sources with pending status
    expect(screen.getByText('PNCP/Compras.gov')).toBeInTheDocument();
    expect(screen.getByText('SINAPI')).toBeInTheDocument();
    expect(screen.getAllByText('Aguardando...').length).toBe(2);
    expect(screen.getAllByText('Pendente').length).toBe(2);
  });

  it('starts collection when button is clicked', async () => {
    render(<StepExecuteSearchWrapper />);

    const startButton = screen.getByText('Iniciar Pesquisa');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Should call createPesquisa and collectPrices
    await waitFor(() => {
      expect(mockCreatePesquisa).toHaveBeenCalledWith({
        etpId: 'etp-123',
        trId: undefined,
        items: [
          { id: 'item-1', description: 'Item de Teste 1', quantity: 10, unit: 'un' },
        ],
        sources: [PriceSourceType.PNCP, PriceSourceType.SINAPI],
      });
    });

    await waitFor(() => {
      expect(mockCollectPrices).toHaveBeenCalledWith('pesquisa-123');
    });
  });

  it('shows progress bar during collection', async () => {
    render(<StepExecuteSearchWrapper />);

    // Start collection
    const startButton = screen.getByText('Iniciar Pesquisa');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Progress bar should be visible
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows success state after collection completes', async () => {
    render(<StepExecuteSearchWrapper />);

    const startButton = screen.getByText('Iniciar Pesquisa');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Wait for collection to complete
    await waitFor(
      () => {
        expect(screen.getByText('Coleta finalizada')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Should show success message with results count
    expect(screen.getByText(/Foram encontrados/)).toBeInTheDocument();
  });

  it('shows error state when collection fails', async () => {
    mockCollectPrices.mockRejectedValueOnce(new Error('API timeout'));

    render(<StepExecuteSearchWrapper />);

    const startButton = screen.getByText('Iniciar Pesquisa');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Wait for error alert to appear
    await waitFor(() => {
      expect(screen.getByText('Erro na coleta')).toBeInTheDocument();
      // Use getAllByText since error message appears multiple times
      const errorMessages = screen.getAllByText('API timeout');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('shows retry button after error', async () => {
    mockCollectPrices.mockRejectedValueOnce(new Error('Network error'));

    render(<StepExecuteSearchWrapper />);

    const startButton = screen.getByText('Iniciar Pesquisa');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Wait for error and retry button
    await waitFor(() => {
      expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
    });
  });

  it('allows retry after error', async () => {
    // First call fails, second succeeds
    mockCollectPrices
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce({
        results: [
          {
            itemId: 'item-1',
            results: [
              {
                itemId: 'item-1',
                source: PriceSourceType.PNCP,
                price: 100,
                date: '2026-01-15',
                reference: 'PNCP-123',
                isManual: false,
              },
            ],
          },
        ],
      });

    render(<StepExecuteSearchWrapper />);

    // First attempt
    const startButton = screen.getByText('Iniciar Pesquisa');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
    });

    // Retry
    const retryButton = screen.getByText('Tentar Novamente');
    await act(async () => {
      fireEvent.click(retryButton);
    });

    // Wait for start button to reappear
    await waitFor(() => {
      expect(screen.getByText('Iniciar Pesquisa')).toBeInTheDocument();
    });
  });

  it('disables start button when no items', () => {
    render(<StepExecuteSearchWrapper items={[]} />);

    const startButton = screen.getByText('Iniciar Pesquisa');
    expect(startButton).toBeDisabled();
  });

  it('disables start button when no sources selected', () => {
    render(<StepExecuteSearchWrapper selectedSources={[]} />);

    const startButton = screen.getByText('Iniciar Pesquisa');
    expect(startButton).toBeDisabled();
  });

  it('excludes manual source from automatic collection list', () => {
    render(
      <StepExecuteSearchWrapper
        selectedSources={[
          PriceSourceType.PNCP,
          PriceSourceType.MANUAL,
        ]}
      />,
    );

    // PNCP should be in the sources list
    expect(screen.getByText('PNCP/Compras.gov')).toBeInTheDocument();

    // Manual source should not be in the automatic sources list
    // (it's handled separately in the info alert)
    const pendingBadges = screen.getAllByText('Pendente');
    expect(pendingBadges.length).toBe(1); // Only PNCP, not manual
  });

  it('shows info about manual sources when selected', () => {
    render(
      <StepExecuteSearchWrapper
        selectedSources={[PriceSourceType.PNCP, PriceSourceType.MANUAL]}
      />,
    );

    expect(
      screen.getByText(/Voce selecionou a opcao de cotacao manual/),
    ).toBeInTheDocument();
  });

  it('shows status by source section header', () => {
    render(<StepExecuteSearchWrapper />);

    expect(screen.getByText('Status por Fonte')).toBeInTheDocument();
  });

  it('updates source states during collection', async () => {
    render(<StepExecuteSearchWrapper />);

    const startButton = screen.getByText('Iniciar Pesquisa');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // After completion, sources should show success state
    await waitFor(
      () => {
        // Check for success messages indicating prices found
        const successMessages = screen.getAllByText(/preco.*encontrado/i);
        expect(successMessages.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  });

  it('creates pesquisa with TR when baseType is tr', async () => {
    function TRWrapper() {
      const form = useForm<PesquisaPrecosFormData>({
        resolver: zodResolver(pesquisaPrecosWizardSchema),
        defaultValues: {
          ...defaultPesquisaPrecosValues,
          items: [
            {
              id: 'item-1',
              description: 'Item de Teste',
              quantity: 5,
              unit: 'un',
            },
          ],
          selectedSources: [PriceSourceType.SINAPI],
          baseType: 'tr',
          baseId: 'tr-456',
        },
      });

      return <StepExecuteSearch form={form} />;
    }

    render(<TRWrapper />);

    const startButton = screen.getByText('Iniciar Pesquisa');
    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(mockCreatePesquisa).toHaveBeenCalledWith(
        expect.objectContaining({
          etpId: undefined,
          trId: 'tr-456',
        }),
      );
    });
  });
});
