import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PriceSourceType,
  PesquisaItem,
  PriceResult,
} from '@/schemas/pesquisaPrecosSchema';
import { PriceComparisonTable } from './PriceComparisonTable';

// Sample test data
const mockItems: PesquisaItem[] = [
  { id: 'item-1', description: 'Computador Dell Optiplex 7090', quantity: 10, unit: 'un' },
  { id: 'item-2', description: 'Monitor LED 24 polegadas', quantity: 10, unit: 'un' },
];

const mockResults: PriceResult[] = [
  { itemId: 'item-1', source: PriceSourceType.PNCP, price: 4500.00, date: '2026-01-15', reference: 'Pregao 123/2026', isManual: false },
  { itemId: 'item-1', source: PriceSourceType.SINAPI, price: 4200.00, date: '2026-01-01', reference: 'SINAPI Jan/2026', isManual: false },
  { itemId: 'item-1', source: PriceSourceType.ATAS, price: 4350.00, date: '2026-01-10', reference: 'Ata RP 456', isManual: false },
  { itemId: 'item-2', source: PriceSourceType.PNCP, price: 800.00, date: '2026-01-15', reference: 'Pregao 124/2026', isManual: false },
  { itemId: 'item-2', source: PriceSourceType.SINAPI, price: 750.00, date: '2026-01-01', reference: 'SINAPI Jan/2026', isManual: false },
];

const defaultProps = {
  items: mockItems,
  results: mockResults,
  selectedPrices: {},
  onSelectPrice: vi.fn(),
  onEditPrice: vi.fn(),
  onAddManual: vi.fn(),
};

describe('PriceComparisonTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table with item descriptions', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    expect(screen.getByText('Computador Dell Optiplex 7090')).toBeInTheDocument();
    expect(screen.getByText('Monitor LED 24 polegadas')).toBeInTheDocument();
  });

  it('renders table with quantities and units', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    const quantityTexts = screen.getAllByText('10 un');
    expect(quantityTexts.length).toBe(2);
  });

  it('displays prices formatted as currency', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    // Check for formatted prices - use getAllByText since median values duplicate prices
    expect(screen.getAllByText(/R\$\s*4\.500,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*4\.200,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*4\.350,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*800,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*750,00/).length).toBeGreaterThan(0);
  });

  it('shows source headers', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    expect(screen.getByText('PNCP/Compras.gov')).toBeInTheDocument();
    expect(screen.getByText('SINAPI')).toBeInTheDocument();
    expect(screen.getByText('Atas de Registro de Precos')).toBeInTheDocument();
  });

  it('shows Mediana column header', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    expect(screen.getByText('Mediana')).toBeInTheDocument();
  });

  it('shows Escolhido column header', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    expect(screen.getByText('Escolhido')).toBeInTheDocument();
  });

  it('shows Acoes column header', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    expect(screen.getByText('Acoes')).toBeInTheDocument();
  });

  it('calls onSelectPrice when clicking on a price', () => {
    const onSelectPrice = vi.fn();
    render(<PriceComparisonTable {...defaultProps} onSelectPrice={onSelectPrice} />);

    // Click on a price button (R$ 4.200,00 - SINAPI for item-1)
    const priceButton = screen.getByText(/R\$\s*4\.200,00/).closest('button');
    if (priceButton) {
      fireEvent.click(priceButton);
    }

    expect(onSelectPrice).toHaveBeenCalledWith('item-1', 4200.00, PriceSourceType.SINAPI);
  });

  it('calls onEditPrice when clicking edit button', () => {
    const onEditPrice = vi.fn();
    render(<PriceComparisonTable {...defaultProps} onEditPrice={onEditPrice} />);

    // Find edit buttons by their class
    const editButtons = document.querySelectorAll('button.h-7.w-7.p-0');

    // Click the first edit button
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
    }

    // onEditPrice is called with itemId only
    expect(onEditPrice).toHaveBeenCalled();
    const call = onEditPrice.mock.calls[0];
    expect(call[0]).toBe('item-1');
  });

  it('shows "Adicionar" button for manual source when no price exists', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    // There should be "Adicionar" buttons for manual prices
    const addButtons = screen.getAllByText('Adicionar');
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('calls onAddManual when clicking Adicionar button', () => {
    const onAddManual = vi.fn();
    render(<PriceComparisonTable {...defaultProps} onAddManual={onAddManual} />);

    // Click on first "Adicionar" button
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]);

    expect(onAddManual).toHaveBeenCalled();
  });

  it('highlights selected price', () => {
    const selectedPrices = { 'item-1': 4200.00 };
    render(<PriceComparisonTable {...defaultProps} selectedPrices={selectedPrices} />);

    // The selected price should show a checkmark icon
    const selectedCheckmarks = document.querySelectorAll('.text-green-600, .text-green-700');
    expect(selectedCheckmarks.length).toBeGreaterThan(0);
  });

  it('shows summary with selection count', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    expect(screen.getByText(/Itens com preco escolhido:/)).toBeInTheDocument();
    // Check summary text contains the count
    const summaryText = screen.getByText(/Itens com preco escolhido:/);
    expect(summaryText.parentElement?.textContent).toContain('0');
    expect(summaryText.parentElement?.textContent).toContain('/ 2');
  });

  it('updates summary count with selected prices', () => {
    const selectedPrices = { 'item-1': 4200.00 };
    render(<PriceComparisonTable {...defaultProps} selectedPrices={selectedPrices} />);

    // Should show 1 / 2
    const summaryText = screen.getByText(/Itens com preco escolhido:/);
    expect(summaryText.parentElement?.textContent).toContain('1');
    expect(summaryText.parentElement?.textContent).toContain('/ 2');
  });

  it('shows legend for min/max indicators', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    expect(screen.getByText('Menor preco')).toBeInTheDocument();
    expect(screen.getByText('Maior preco')).toBeInTheDocument();
    expect(screen.getByText('Selecionado')).toBeInTheDocument();
  });

  it('handles empty items array gracefully', () => {
    render(<PriceComparisonTable {...defaultProps} items={[]} />);

    // Should render table header but no body rows
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.queryByText('Computador Dell Optiplex 7090')).not.toBeInTheDocument();
  });

  it('handles empty results array gracefully', () => {
    render(<PriceComparisonTable {...defaultProps} results={[]} />);

    // Items should still be displayed
    expect(screen.getByText('Computador Dell Optiplex 7090')).toBeInTheDocument();
    expect(screen.getByText('Monitor LED 24 polegadas')).toBeInTheDocument();
  });

  it('shows "Selecione" text for items without selected price', () => {
    render(<PriceComparisonTable {...defaultProps} />);

    const selectTexts = screen.getAllByText('Selecione');
    expect(selectTexts.length).toBe(2); // One for each item
  });
});
