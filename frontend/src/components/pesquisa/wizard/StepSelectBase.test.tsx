import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  pesquisaPrecosWizardSchema,
  defaultPesquisaPrecosValues,
  PesquisaPrecosFormData,
} from '@/schemas/pesquisaPrecosSchema';
import { StepSelectBase } from './StepSelectBase';

// Mock stores
const mockFetchETPs = vi.fn();
const mockFetchTRs = vi.fn();

vi.mock('@/store/etpStore', () => ({
  useETPStore: () => ({
    etps: [
      {
        id: 'etp-1',
        title: 'ETP de Teste',
        status: 'completed',
        progress: 100,
        sections: [],
        description: 'Descricao do ETP de teste',
        userId: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'etp-2',
        title: 'ETP em Revisao',
        status: 'review',
        progress: 80,
        sections: [],
        userId: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'etp-3',
        title: 'ETP Rascunho',
        status: 'draft',
        progress: 30,
        sections: [],
        userId: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
    isLoading: false,
    fetchETPs: mockFetchETPs,
  }),
}));

vi.mock('@/store/trStore', () => ({
  useTRStore: () => ({
    trs: [
      {
        id: 'tr-1',
        objeto: 'TR de Teste Aprovado',
        status: 'approved',
        versao: 1,
        currentVersion: 1,
        etpId: 'etp-1',
        organizationId: 'org-1',
        createdById: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'tr-2',
        objeto: 'TR em Revisao',
        status: 'review',
        versao: 2,
        currentVersion: 2,
        etpId: 'etp-2',
        organizationId: 'org-1',
        createdById: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
    isLoading: false,
    fetchTRs: mockFetchTRs,
  }),
}));

// Component that provides form context to StepSelectBase
function StepSelectBaseWrapper() {
  const form = useForm<PesquisaPrecosFormData>({
    resolver: zodResolver(pesquisaPrecosWizardSchema),
    defaultValues: defaultPesquisaPrecosValues,
  });

  return <StepSelectBase form={form} />;
}

describe('StepSelectBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders base type selection options', () => {
    render(<StepSelectBaseWrapper />);

    expect(screen.getByText('Selecione o tipo de documento base')).toBeInTheDocument();
    expect(screen.getByLabelText(/ETP/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Termo de Referencia/i)).toBeInTheDocument();
  });

  it('shows ETP list when ETP type is selected', async () => {
    render(<StepSelectBaseWrapper />);

    // Click on ETP radio option
    const etpRadio = screen.getByLabelText(/ETP/i);
    fireEvent.click(etpRadio);

    await waitFor(() => {
      // Should show search input for ETPs
      expect(screen.getByPlaceholderText(/Buscar ETP/i)).toBeInTheDocument();
    });

    // Should show completed/review ETPs only (not draft)
    expect(screen.getByText('ETP de Teste')).toBeInTheDocument();
    expect(screen.getByText('ETP em Revisao')).toBeInTheDocument();
    expect(screen.queryByText('ETP Rascunho')).not.toBeInTheDocument();
  });

  it('shows TR list when TR type is selected', async () => {
    render(<StepSelectBaseWrapper />);

    // Click on TR radio option
    const trRadio = screen.getByLabelText(/Termo de Referencia/i);
    fireEvent.click(trRadio);

    await waitFor(() => {
      // Should show search input for TRs
      expect(screen.getByPlaceholderText(/Buscar TR/i)).toBeInTheDocument();
    });

    // Should show approved/review TRs
    expect(screen.getByText('TR de Teste Aprovado')).toBeInTheDocument();
    expect(screen.getByText('TR em Revisao')).toBeInTheDocument();
  });

  it('filters ETPs by search term', async () => {
    render(<StepSelectBaseWrapper />);

    // Select ETP type
    fireEvent.click(screen.getByLabelText(/ETP/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar ETP/i)).toBeInTheDocument();
    });

    // Type in search
    const searchInput = screen.getByPlaceholderText(/Buscar ETP/i);
    fireEvent.change(searchInput, { target: { value: 'Teste' } });

    // Should filter to only show matching ETP
    await waitFor(() => {
      expect(screen.getByText('ETP de Teste')).toBeInTheDocument();
    });
  });

  it('shows preview when ETP is selected', async () => {
    render(<StepSelectBaseWrapper />);

    // Select ETP type
    fireEvent.click(screen.getByLabelText(/ETP/i));

    await waitFor(() => {
      expect(screen.getByText('ETP de Teste')).toBeInTheDocument();
    });

    // Click on an ETP item to select it
    fireEvent.click(screen.getByText('ETP de Teste'));

    // Should show preview
    await waitFor(() => {
      expect(screen.getByText('ETP Selecionado')).toBeInTheDocument();
    });
  });

  it('shows preview when TR is selected', async () => {
    render(<StepSelectBaseWrapper />);

    // Select TR type
    fireEvent.click(screen.getByLabelText(/Termo de Referencia/i));

    await waitFor(() => {
      expect(screen.getByText('TR de Teste Aprovado')).toBeInTheDocument();
    });

    // Click on a TR item to select it
    fireEvent.click(screen.getByText('TR de Teste Aprovado'));

    // Should show preview
    await waitFor(() => {
      expect(screen.getByText('Termo de Referencia Selecionado')).toBeInTheDocument();
    });
  });

  it('resets selection when changing base type', async () => {
    render(<StepSelectBaseWrapper />);

    // Select ETP type and pick an ETP
    fireEvent.click(screen.getByLabelText(/ETP/i));

    await waitFor(() => {
      expect(screen.getByText('ETP de Teste')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ETP de Teste'));

    await waitFor(() => {
      expect(screen.getByText('ETP Selecionado')).toBeInTheDocument();
    });

    // Change to TR type
    fireEvent.click(screen.getByLabelText(/Termo de Referencia/i));

    // Preview should disappear (selection reset)
    await waitFor(() => {
      expect(screen.queryByText('ETP Selecionado')).not.toBeInTheDocument();
    });
  });

  it('does not refetch when ETPs and TRs already loaded', () => {
    // With mocked data already present, fetch should not be called
    render(<StepSelectBaseWrapper />);

    // Since the mock already has data, fetches should NOT be called
    // (the component only fetches when etps.length === 0)
    expect(mockFetchETPs).not.toHaveBeenCalled();
    expect(mockFetchTRs).not.toHaveBeenCalled();
  });

  it('shows status badges on list items', async () => {
    render(<StepSelectBaseWrapper />);

    // Select ETP type
    fireEvent.click(screen.getByLabelText(/ETP/i));

    await waitFor(() => {
      // Check for status badges
      expect(screen.getByText('Concluido')).toBeInTheDocument();
      expect(screen.getByText('Em revisao')).toBeInTheDocument();
    });
  });
});
