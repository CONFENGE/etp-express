import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MedicaoForm } from './MedicaoForm';

describe('MedicaoForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields correctly', () => {
    render(
      <MedicaoForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
    );

    expect(screen.getByLabelText(/Período - Início/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Período - Fim/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Valor Medido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Observações/i)).toBeInTheDocument();
  });

  it('should show validation errors when submitting empty form', async () => {
    render(
      <MedicaoForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
    );

    const submitButton = screen.getByText(/Salvar Medição/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Data de início é obrigatória/i)).toBeInTheDocument();
      expect(screen.getByText(/Data de fim é obrigatória/i)).toBeInTheDocument();
      expect(screen.getByText(/Valor medido é obrigatório/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate valor medido format', async () => {
    render(
      <MedicaoForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
    );

    const valorInput = screen.getByLabelText(/Valor Medido/i);
    fireEvent.change(valorInput, { target: { value: 'invalid' } });

    const submitButton = screen.getByText(/Salvar Medição/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Valor deve ser um número válido/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with valid data', async () => {
    render(
      <MedicaoForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
    );

    fireEvent.change(screen.getByLabelText(/Período - Início/i), {
      target: { value: '2024-01-01' },
    });
    fireEvent.change(screen.getByLabelText(/Período - Fim/i), {
      target: { value: '2024-01-31' },
    });
    fireEvent.change(screen.getByLabelText(/Valor Medido/i), {
      target: { value: '10000.00' },
    });

    const submitButton = screen.getByText(/Salvar Medição/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        periodoInicio: '2024-01-01',
        periodoFim: '2024-01-31',
        valorMedido: '10000.00',
        descricao: '',
        observacoes: '',
      });
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <MedicaoForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
    );

    const cancelButton = screen.getByText(/Cancelar/i);
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
