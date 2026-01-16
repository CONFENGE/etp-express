import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriceSourceType, PesquisaItem, PriceResult } from '@/schemas/pesquisaPrecosSchema';
import { PriceEditModal } from './PriceEditModal';

const mockItem: PesquisaItem = {
  id: 'item-1',
  description: 'Computador Dell Optiplex 7090',
  quantity: 10,
  unit: 'un',
};

const mockExistingResult: PriceResult = {
  itemId: 'item-1',
  source: PriceSourceType.MANUAL,
  price: 4500.00,
  date: '2026-01-15',
  reference: 'Proposta Comercial #123',
  isManual: true,
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  item: mockItem,
  onSave: vi.fn(),
  mode: 'add' as const,
};

describe('PriceEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByText('Adicionar Cotacao Manual')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<PriceEditModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Adicionar Cotacao Manual')).not.toBeInTheDocument();
  });

  it('shows edit title when mode is edit', () => {
    render(<PriceEditModal {...defaultProps} mode="edit" existingResult={mockExistingResult} />);

    expect(screen.getByText('Editar Preco')).toBeInTheDocument();
  });

  it('displays item description', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByText('Computador Dell Optiplex 7090')).toBeInTheDocument();
  });

  it('displays item quantity and unit', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByText('Quantidade: 10 un')).toBeInTheDocument();
  });

  it('has source selector', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByLabelText('Fonte')).toBeInTheDocument();
  });

  it('has price input field', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByLabelText('Preco Unitario (R$)')).toBeInTheDocument();
  });

  it('has reference input field', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByLabelText('Referencia (opcional)')).toBeInTheDocument();
  });

  it('has date input field', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByLabelText('Data da Cotacao')).toBeInTheDocument();
  });

  it('has justification textarea', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByLabelText('Justificativa (opcional)')).toBeInTheDocument();
  });

  it('has cancel button', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('has save button with correct label for add mode', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('has save button with correct label for edit mode', () => {
    render(<PriceEditModal {...defaultProps} mode="edit" existingResult={mockExistingResult} />);

    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<PriceEditModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancelar'));

    expect(onClose).toHaveBeenCalled();
  });

  it('allows entering price value', async () => {
    render(<PriceEditModal {...defaultProps} />);

    const priceInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(priceInput, { target: { value: '1500,00' } });

    await waitFor(() => {
      expect(priceInput).toHaveValue('1500,00');
    });
  });

  it('allows entering reference', async () => {
    render(<PriceEditModal {...defaultProps} />);

    const referenceInput = screen.getByPlaceholderText(/Proposta Comercial/);
    fireEvent.change(referenceInput, { target: { value: 'NF-e 12345' } });

    await waitFor(() => {
      expect(referenceInput).toHaveValue('NF-e 12345');
    });
  });

  it('allows entering justification', async () => {
    render(<PriceEditModal {...defaultProps} />);

    const justificationTextarea = screen.getByPlaceholderText(/Justifique a escolha/);
    fireEvent.change(justificationTextarea, { target: { value: 'Melhor proposta recebida' } });

    await waitFor(() => {
      expect(justificationTextarea).toHaveValue('Melhor proposta recebida');
    });
  });

  it('pre-fills fields when editing existing result', () => {
    render(<PriceEditModal {...defaultProps} mode="edit" existingResult={mockExistingResult} />);

    const priceInput = screen.getByPlaceholderText('0,00');
    expect(priceInput).toHaveValue('4500,00');
  });

  it('validates price is required', async () => {
    render(<PriceEditModal {...defaultProps} />);

    // Try to submit without price - the validation should prevent submission
    const submitButton = screen.getByText('Adicionar');
    fireEvent.click(submitButton);

    // Wait for validation error to appear
    await waitFor(
      () => {
        const errorMessages = document.querySelectorAll('.text-destructive');
        expect(errorMessages.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  });

  it('calls onSave with correct data when form is valid', async () => {
    const onSave = vi.fn();
    render(<PriceEditModal {...defaultProps} onSave={onSave} />);

    // Fill in the price
    const priceInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(priceInput, { target: { value: '2500,00' } });

    // Fill in reference
    const referenceInput = screen.getByPlaceholderText(/Proposta Comercial/);
    fireEvent.change(referenceInput, { target: { value: 'Teste Ref' } });

    // Submit the form
    fireEvent.click(screen.getByText('Adicionar'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      const call = onSave.mock.calls[0];
      expect(call[0]).toBe('item-1'); // itemId
      expect(call[1].price).toBe(2500);
      expect(call[1].source).toBe(PriceSourceType.MANUAL);
      expect(call[1].reference).toBe('Teste Ref');
    });
  });

  it('formats price input with comma as decimal separator', async () => {
    render(<PriceEditModal {...defaultProps} />);

    const priceInput = screen.getByPlaceholderText('0,00');

    // Type with period - should convert to comma
    fireEvent.change(priceInput, { target: { value: '1500.50' } });

    await waitFor(() => {
      expect(priceInput).toHaveValue('1500,50');
    });
  });

  it('limits decimal places to 2', async () => {
    render(<PriceEditModal {...defaultProps} />);

    const priceInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(priceInput, { target: { value: '1500,999' } });

    await waitFor(() => {
      expect(priceInput).toHaveValue('1500,99');
    });
  });

  it('shows helper text about justification', () => {
    render(<PriceEditModal {...defaultProps} />);

    expect(screen.getByText(/A justificativa sera incluida no relatorio/)).toBeInTheDocument();
  });

  it('returns null when item is null', () => {
    const { container } = render(<PriceEditModal {...defaultProps} item={null} />);

    // Modal content should not be rendered
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
