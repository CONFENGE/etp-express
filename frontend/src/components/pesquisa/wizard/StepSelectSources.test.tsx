import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  pesquisaPrecosWizardSchema,
  defaultPesquisaPrecosValues,
  PesquisaPrecosFormData,
  PriceSourceType,
} from '@/schemas/pesquisaPrecosSchema';
import { StepSelectSources } from './StepSelectSources';

// Component that provides form context to StepSelectSources
function StepSelectSourcesWrapper({
  initialSources = [],
}: {
  initialSources?: PriceSourceType[];
}) {
  const form = useForm<PesquisaPrecosFormData>({
    resolver: zodResolver(pesquisaPrecosWizardSchema),
    defaultValues: {
      ...defaultPesquisaPrecosValues,
      selectedSources: initialSources,
    },
  });

  return <StepSelectSources form={form} />;
}

describe('StepSelectSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all price sources', () => {
    render(<StepSelectSourcesWrapper />);

    // Check that all sources are displayed
    expect(screen.getByText('PNCP/Compras.gov')).toBeInTheDocument();
    expect(screen.getByText('SINAPI')).toBeInTheDocument();
    expect(screen.getByText('SICRO')).toBeInTheDocument();
    expect(screen.getByText('Atas de Registro de Precos')).toBeInTheDocument();
    expect(screen.getByText('Cotacao Manual')).toBeInTheDocument();
  });

  it('displays correct labels for automatic vs manual sources', () => {
    render(<StepSelectSourcesWrapper />);

    // Automatic sources should have "Automatico" badge
    const automaticBadges = screen.getAllByText('Automatico');
    expect(automaticBadges.length).toBe(4); // PNCP, SINAPI, SICRO, ATAS

    // Manual source should have "Manual" badge
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('allows selecting a source by clicking', async () => {
    render(<StepSelectSourcesWrapper />);

    // Initially no sources selected - should show warning
    expect(
      screen.getByText('Selecione pelo menos uma fonte para continuar'),
    ).toBeInTheDocument();

    // Click on SINAPI source
    const sinapiButton = screen
      .getByText('SINAPI')
      .closest('button') as HTMLButtonElement;
    fireEvent.click(sinapiButton);

    // Should now show 1 fonte selecionada
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('fonte selecionada')).toBeInTheDocument();
    });
  });

  it('allows selecting multiple sources', async () => {
    render(<StepSelectSourcesWrapper />);

    // Click on multiple sources
    const pncpButton = screen
      .getByText('PNCP/Compras.gov')
      .closest('button') as HTMLButtonElement;
    const sinapiButton = screen
      .getByText('SINAPI')
      .closest('button') as HTMLButtonElement;
    const sicroButton = screen
      .getByText('SICRO')
      .closest('button') as HTMLButtonElement;

    fireEvent.click(pncpButton);
    fireEvent.click(sinapiButton);
    fireEvent.click(sicroButton);

    // Should show 3 fontes selecionadas
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('fontes selecionadas')).toBeInTheDocument();
    });
  });

  it('allows deselecting a source by clicking again', async () => {
    render(
      <StepSelectSourcesWrapper initialSources={[PriceSourceType.SINAPI]} />,
    );

    // Initially should show 1 source selected
    expect(screen.getByText('1')).toBeInTheDocument();

    // Click on SINAPI to deselect
    const sinapiButton = screen
      .getByText('SINAPI')
      .closest('button') as HTMLButtonElement;
    fireEvent.click(sinapiButton);

    // Should now show warning again
    await waitFor(() => {
      expect(
        screen.getByText('Selecione pelo menos uma fonte para continuar'),
      ).toBeInTheDocument();
    });
  });

  it('shows select all automatic sources button', () => {
    render(<StepSelectSourcesWrapper />);

    expect(
      screen.getByText('Selecionar todas automaticas'),
    ).toBeInTheDocument();
  });

  it('selects all automatic sources when button is clicked', async () => {
    render(<StepSelectSourcesWrapper />);

    // Click select all automatic
    const selectAllButton = screen.getByText('Selecionar todas automaticas');
    fireEvent.click(selectAllButton);

    // Should show 4 automatic sources selected
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
      // Text should indicate automatic sources
      expect(screen.getByText(/4 automaticas/)).toBeInTheDocument();
    });

    // Button text should change to indicate all are selected
    expect(
      screen.getByText('Todas automaticas selecionadas'),
    ).toBeInTheDocument();
  });

  it('shows source descriptions', () => {
    render(<StepSelectSourcesWrapper />);

    expect(
      screen.getByText('Portal Nacional de Contratacoes Publicas'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sistema Nacional de Pesquisa de Custos e Indices'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sistema de Custos Referenciais de Obras'),
    ).toBeInTheDocument();
  });

  it('renders with initial sources selected', () => {
    render(
      <StepSelectSourcesWrapper
        initialSources={[PriceSourceType.PNCP, PriceSourceType.SINAPI]}
      />,
    );

    // Should show 2 fontes selecionadas
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('fontes selecionadas')).toBeInTheDocument();
  });

  it('shows info alert when automatic sources are selected', async () => {
    render(<StepSelectSourcesWrapper />);

    // Select an automatic source
    const pncpButton = screen
      .getByText('PNCP/Compras.gov')
      .closest('button') as HTMLButtonElement;
    fireEvent.click(pncpButton);

    // Should show info about automatic sources
    await waitFor(() => {
      expect(
        screen.getByText(/As fontes automaticas consultam APIs governamentais/),
      ).toBeInTheDocument();
    });
  });

  it('shows header with instructions', () => {
    render(<StepSelectSourcesWrapper />);

    expect(
      screen.getByText('Selecione as Fontes de Precos'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Escolha uma ou mais fontes para pesquisar precos/,
      ),
    ).toBeInTheDocument();
  });

  it('counts automatic and manual sources separately in summary', async () => {
    render(<StepSelectSourcesWrapper />);

    // Select 2 automatic and 1 manual source
    const pncpButton = screen
      .getByText('PNCP/Compras.gov')
      .closest('button') as HTMLButtonElement;
    const sinapiButton = screen
      .getByText('SINAPI')
      .closest('button') as HTMLButtonElement;
    const manualButton = screen
      .getByText('Cotacao Manual')
      .closest('button') as HTMLButtonElement;

    fireEvent.click(pncpButton);
    fireEvent.click(sinapiButton);
    fireEvent.click(manualButton);

    // Should show breakdown
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/2 automaticas/)).toBeInTheDocument();
      expect(screen.getByText(/1 manual/)).toBeInTheDocument();
    });
  });
});
