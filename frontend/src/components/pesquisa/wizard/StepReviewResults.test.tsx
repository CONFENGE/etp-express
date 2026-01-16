import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  pesquisaPrecosWizardSchema,
  defaultPesquisaPrecosValues,
  PesquisaPrecosFormData,
  PriceSourceType,
  PesquisaItem,
  PriceResult,
} from '@/schemas/pesquisaPrecosSchema';
import { StepReviewResults } from './StepReviewResults';

// Mock the store
vi.mock('@/store/pesquisaPrecosStore', () => ({
  usePesquisaPrecosStore: vi.fn(() => ({
    currentPesquisa: null,
    updatePesquisa: vi.fn(),
  })),
}));

// Sample test data
const mockItems: PesquisaItem[] = [
  { id: 'item-1', description: 'Computador Dell Optiplex', quantity: 10, unit: 'un' },
  { id: 'item-2', description: 'Monitor LED 24"', quantity: 10, unit: 'un' },
  { id: 'item-3', description: 'Teclado USB', quantity: 20, unit: 'un' },
];

const mockResults: PriceResult[] = [
  { itemId: 'item-1', source: PriceSourceType.PNCP, price: 4500.00, date: '2026-01-15', reference: 'Pregao 123/2026', isManual: false },
  { itemId: 'item-1', source: PriceSourceType.SINAPI, price: 4200.00, date: '2026-01-01', reference: 'SINAPI Jan/2026', isManual: false },
  { itemId: 'item-1', source: PriceSourceType.ATAS, price: 4350.00, date: '2026-01-10', reference: 'Ata RP 456', isManual: false },
  { itemId: 'item-2', source: PriceSourceType.PNCP, price: 800.00, date: '2026-01-15', reference: 'Pregao 124/2026', isManual: false },
  { itemId: 'item-2', source: PriceSourceType.SINAPI, price: 750.00, date: '2026-01-01', reference: 'SINAPI Jan/2026', isManual: false },
  { itemId: 'item-3', source: PriceSourceType.PNCP, price: 50.00, date: '2026-01-15', reference: 'Pregao 125/2026', isManual: false },
];

// Component that provides form context to StepReviewResults
function StepReviewResultsWrapper({
  initialItems = [],
  initialResults = [],
  initialSelectedPrices = {},
  initialJustifications = {},
}: {
  initialItems?: PesquisaItem[];
  initialResults?: PriceResult[];
  initialSelectedPrices?: Record<string, number>;
  initialJustifications?: Record<string, string>;
}) {
  const form = useForm<PesquisaPrecosFormData>({
    resolver: zodResolver(pesquisaPrecosWizardSchema),
    defaultValues: {
      ...defaultPesquisaPrecosValues,
      items: initialItems,
      results: initialResults,
      selectedPrices: initialSelectedPrices,
      justifications: initialJustifications,
    },
  });

  return <StepReviewResults form={form} />;
}

describe('StepReviewResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the review header', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    expect(screen.getByText('Revisao de Resultados')).toBeInTheDocument();
    expect(screen.getByText(/Revise os precos encontrados/)).toBeInTheDocument();
  });

  it('shows completion status with percentage', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    // Should show 0 of 3 selected initially
    expect(screen.getByText(/0 de 3 itens com preco selecionado/)).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows 100% when all items have selected prices', () => {
    const selectedPrices = {
      'item-1': 4200.00,
      'item-2': 750.00,
      'item-3': 50.00,
    };

    render(
      <StepReviewResultsWrapper
        initialItems={mockItems}
        initialResults={mockResults}
        initialSelectedPrices={selectedPrices}
      />,
    );

    expect(screen.getByText('Todos os itens com preco selecionado!')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('displays price comparison table with items', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    // Check that item descriptions are displayed
    expect(screen.getByText('Computador Dell Optiplex')).toBeInTheDocument();
    expect(screen.getByText('Monitor LED 24"')).toBeInTheDocument();
    expect(screen.getByText('Teclado USB')).toBeInTheDocument();
  });

  it('shows prices from different sources', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    // Check that prices are displayed (formatted as currency) - use getAllByText since median values duplicate
    expect(screen.getAllByText(/R\$\s*4\.500,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*4\.200,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*4\.350,00/).length).toBeGreaterThan(0);
  });

  it('shows alert when no results found', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={[]} />);

    expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument();
    expect(screen.getByText(/A pesquisa nao retornou precos/)).toBeInTheDocument();
  });

  it('shows error when no items defined', () => {
    render(<StepReviewResultsWrapper initialItems={[]} initialResults={[]} />);

    expect(screen.getByText('Sem itens para pesquisar')).toBeInTheDocument();
    expect(screen.getByText(/Volte ao passo anterior/)).toBeInTheDocument();
  });

  it('shows global justification textarea', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    expect(screen.getByText('Justificativa Global (opcional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Justificativa que sera aplicada/)).toBeInTheDocument();
  });

  it('allows entering global justification', async () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    const textarea = screen.getByPlaceholderText(/Justificativa que sera aplicada/);
    fireEvent.change(textarea, { target: { value: 'Teste de justificativa global' } });

    await waitFor(() => {
      expect(textarea).toHaveValue('Teste de justificativa global');
    });
  });

  it('shows info alert with instructions', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    expect(screen.getByText(/Clique em um preco para seleciona-lo/)).toBeInTheDocument();
  });

  it('shows quantity and unit for each item', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    // Multiple items may have the same quantity/unit
    expect(screen.getAllByText('10 un').length).toBeGreaterThan(0);
    expect(screen.getAllByText('20 un').length).toBeGreaterThan(0);
  });

  it('shows source icons in table header', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    // Source names should be visible
    expect(screen.getByText('PNCP/Compras.gov')).toBeInTheDocument();
    expect(screen.getByText('SINAPI')).toBeInTheDocument();
  });

  it('displays median column header', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    expect(screen.getByText('Mediana')).toBeInTheDocument();
  });

  it('displays chosen column header', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    expect(screen.getByText('Escolhido')).toBeInTheDocument();
  });

  it('shows "Selecione" for items without selected price', () => {
    render(<StepReviewResultsWrapper initialItems={mockItems} initialResults={mockResults} />);

    // Should show "Selecione" for each item without selection
    const selectTexts = screen.getAllByText('Selecione');
    expect(selectTexts.length).toBe(3); // One for each item
  });
});
