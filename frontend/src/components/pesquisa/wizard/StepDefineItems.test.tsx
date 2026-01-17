import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  pesquisaPrecosWizardSchema,
  defaultPesquisaPrecosValues,
  PesquisaPrecosFormData,
} from '@/schemas/pesquisaPrecosSchema';
import { StepDefineItems } from './StepDefineItems';

// Mock stores
const mockFetchETP = vi.fn();
const mockFetchTR = vi.fn();

vi.mock('@/store/etpStore', () => ({
  useETPStore: () => ({
    etps: [
      {
        id: 'etp-1',
        title: 'ETP de Teste',
        status: 'completed',
        progress: 100,
        sections: [
          {
            id: 'section-1',
            etpId: 'etp-1',
            sectionNumber: 8,
            title: 'Estimativa de Custos',
            content: '- Item 1: Computador Desktop\n- Item 2: Monitor LED',
            isRequired: true,
            isCompleted: true,
            aiGenerated: false,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
        description: 'Descricao do ETP',
        userId: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
    isLoading: false,
    fetchETP: mockFetchETP,
  }),
}));

vi.mock('@/store/trStore', () => ({
  useTRStore: () => ({
    trs: [
      {
        id: 'tr-1',
        objeto: 'Aquisicao de equipamentos de informatica',
        status: 'approved',
        versao: 1,
        currentVersion: 1,
        etpId: 'etp-1',
        organizationId: 'org-1',
        createdById: 'user-1',
        especificacoesTecnicas: {
          items: [
            { description: 'Notebook Core i7', quantity: 10, unit: 'un' },
            { description: 'Mouse sem fio', quantity: 20, unit: 'un' },
          ],
        },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
    isLoading: false,
    fetchTR: mockFetchTR,
  }),
}));

// Component that provides form context to StepDefineItems
function StepDefineItemsWrapper({
  initialValues = defaultPesquisaPrecosValues,
}: {
  initialValues?: Partial<PesquisaPrecosFormData>;
}) {
  const form = useForm<PesquisaPrecosFormData>({
    resolver: zodResolver(pesquisaPrecosWizardSchema),
    defaultValues: { ...defaultPesquisaPrecosValues, ...initialValues },
  });

  return <StepDefineItems form={form} />;
}

describe('StepDefineItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no items', () => {
    render(<StepDefineItemsWrapper />);

    expect(screen.getByText('Nenhum item definido')).toBeInTheDocument();
    expect(screen.getByText('Adicionar Primeiro Item')).toBeInTheDocument();
  });

  it('shows header with item count', () => {
    render(<StepDefineItemsWrapper />);

    expect(screen.getByText('Itens para Pesquisa')).toBeInTheDocument();
    expect(screen.getByText(/Adicione pelo menos um item/i)).toBeInTheDocument();
  });

  it('adds a new item when clicking add button', async () => {
    render(<StepDefineItemsWrapper />);

    // Click add button
    fireEvent.click(screen.getByText('Adicionar Item'));

    await waitFor(() => {
      // Should show item form fields
      expect(screen.getByLabelText(/Descricao do Item/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Quantidade/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Unidade/i)).toBeInTheDocument();
    });
  });

  it('adds item via empty state button', async () => {
    render(<StepDefineItemsWrapper />);

    // Click add first item button in empty state
    fireEvent.click(screen.getByText('Adicionar Primeiro Item'));

    await waitFor(() => {
      // Should show item form fields
      expect(screen.getByLabelText(/Descricao do Item/i)).toBeInTheDocument();
    });
  });

  it('allows editing item fields', async () => {
    render(<StepDefineItemsWrapper />);

    // Add an item
    fireEvent.click(screen.getByText('Adicionar Item'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Descricao do Item/i)).toBeInTheDocument();
    });

    // Fill in the description
    const descInput = screen.getByLabelText(/Descricao do Item/i);
    fireEvent.change(descInput, {
      target: { value: 'Computador Desktop' },
    });

    expect(descInput).toHaveValue('Computador Desktop');

    // Fill in quantity
    const qtyInput = screen.getByLabelText(/Quantidade/i);
    fireEvent.change(qtyInput, { target: { value: '5' } });

    expect(qtyInput).toHaveValue(5);

    // Fill in unit
    const unitInput = screen.getByLabelText(/Unidade/i);
    fireEvent.change(unitInput, { target: { value: 'pc' } });

    expect(unitInput).toHaveValue('pc');
  });

  it('shows warning when no base document selected', () => {
    render(<StepDefineItemsWrapper />);

    expect(
      screen.getByText(/Selecione um ETP ou TR no passo anterior/i),
    ).toBeInTheDocument();
  });

  it('allows removing items when more than one exists', async () => {
    render(<StepDefineItemsWrapper />);

    // Add first item
    fireEvent.click(screen.getByText('Adicionar Item'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Descricao do Item/i)).toBeInTheDocument();
    });

    // Add second item
    fireEvent.click(screen.getByText('Adicionar Item'));

    await waitFor(() => {
      // Should have 2 description inputs
      const inputs = screen.getAllByLabelText(/Descricao do Item/i);
      expect(inputs).toHaveLength(2);
    });

    // Find and click remove button for first item
    const removeButtons = screen.getAllByTitle('Remover item');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      // Should have 1 description input now
      const inputs = screen.getAllByLabelText(/Descricao do Item/i);
      expect(inputs).toHaveLength(1);
    });
  });

  it('disables remove button when only one item exists', async () => {
    render(<StepDefineItemsWrapper />);

    // Add one item
    fireEvent.click(screen.getByText('Adicionar Item'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Descricao do Item/i)).toBeInTheDocument();
    });

    // Remove button should be disabled
    const removeButton = screen.getByTitle('Minimo 1 item necessario');
    expect(removeButton).toBeDisabled();
  });

  it('updates item count in header', async () => {
    render(<StepDefineItemsWrapper />);

    // Add items
    fireEvent.click(screen.getByText('Adicionar Item'));
    await waitFor(() => {
      expect(screen.getByText(/1 item definido/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Adicionar Item'));
    await waitFor(() => {
      expect(screen.getByText(/2 itens definidos/i)).toBeInTheDocument();
    });
  });

  it('shows default unit as "un"', async () => {
    render(<StepDefineItemsWrapper />);

    // Add an item
    fireEvent.click(screen.getByText('Adicionar Item'));

    await waitFor(() => {
      const unitInput = screen.getByLabelText(/Unidade/i);
      expect(unitInput).toHaveValue('un');
    });
  });

  it('shows default quantity as 1', async () => {
    render(<StepDefineItemsWrapper />);

    // Add an item
    fireEvent.click(screen.getByText('Adicionar Item'));

    await waitFor(() => {
      const qtyInput = screen.getByLabelText(/Quantidade/i);
      expect(qtyInput).toHaveValue(1);
    });
  });
});

describe('StepDefineItems - Item Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts items from ETP when baseType is etp', async () => {
    render(
      <StepDefineItemsWrapper
        initialValues={{
          baseType: 'etp',
          baseId: 'etp-1',
        }}
      />,
    );

    // Wait for items to be extracted
    await waitFor(
      () => {
        // Should have extracted items from ETP cost section
        const inputs = screen.getAllByLabelText(/Descricao do Item/i);
        expect(inputs.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  });

  it('extracts items from TR when baseType is tr', async () => {
    render(
      <StepDefineItemsWrapper
        initialValues={{
          baseType: 'tr',
          baseId: 'tr-1',
        }}
      />,
    );

    // Wait for items to be extracted from TR
    await waitFor(
      () => {
        // Should have extracted the TR objeto as first item
        const inputs = screen.getAllByLabelText(/Descricao do Item/i);
        expect(inputs.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  });
});
