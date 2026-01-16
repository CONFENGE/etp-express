import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import { CreatePesquisaPrecosWizard } from './CreatePesquisaPrecosWizard';
import { PESQUISA_WIZARD_STEPS } from '@/schemas/pesquisaPrecosSchema';

// Mock stores for step components
vi.mock('@/store/etpStore', () => ({
  useETPStore: () => ({
    etps: [],
    isLoading: false,
    fetchETPs: vi.fn(),
    fetchETP: vi.fn(),
  }),
}));

vi.mock('@/store/trStore', () => ({
  useTRStore: () => ({
    trs: [],
    isLoading: false,
    fetchTRs: vi.fn(),
    fetchTR: vi.fn(),
  }),
}));

// Wrapper component to provide router context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('CreatePesquisaPrecosWizard', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the wizard with initial step', () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // Should show step 1 title (may appear multiple times)
    const titleElements = screen.getAllByText(PESQUISA_WIZARD_STEPS[0].title);
    expect(titleElements.length).toBeGreaterThanOrEqual(1);

    // Description should be present
    expect(
      screen.getByText(PESQUISA_WIZARD_STEPS[0].description),
    ).toBeInTheDocument();
  });

  it('renders all step indicators', () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // All step titles should be visible (may appear multiple times - once in indicator, once in header)
    PESQUISA_WIZARD_STEPS.forEach((step) => {
      const elements = screen.getAllByText(step.title);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows cancel and next buttons on first step', () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Proximo')).toBeInTheDocument();
    // Back button should NOT be visible on first step
    expect(screen.queryByText('Voltar')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('navigates to next step when clicking Proximo', async () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // Click next button
    fireEvent.click(screen.getByText('Proximo'));

    // Wait for step change - step 2 title should appear in the header
    await waitFor(() => {
      // Check the current step header shows the second step
      const stepHeaders = screen.getAllByText(PESQUISA_WIZARD_STEPS[1].title);
      expect(stepHeaders.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows back button after first step', async () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // Navigate to step 2
    fireEvent.click(screen.getByText('Proximo'));

    await waitFor(() => {
      expect(screen.getByText('Voltar')).toBeInTheDocument();
    });
  });

  it('navigates back when clicking Voltar', async () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // Navigate to step 2
    fireEvent.click(screen.getByText('Proximo'));

    await waitFor(() => {
      expect(screen.getByText('Voltar')).toBeInTheDocument();
    });

    // Navigate back to step 1
    fireEvent.click(screen.getByText('Voltar'));

    await waitFor(() => {
      // Back button should disappear when back on first step
      expect(screen.queryByText('Voltar')).not.toBeInTheDocument();
    });
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      </TestWrapper>,
    );

    // Buttons should be disabled
    expect(screen.getByText('Cancelar')).toBeDisabled();
    expect(screen.getByText('Proximo')).toBeDisabled();
  });

  it('renders progress bar', () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // Progress bar should be present
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders StepSelectBase on first step', () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // StepSelectBase should render base type selection
    expect(screen.getByText('Selecione o tipo de documento base')).toBeInTheDocument();
  });

  it('renders StepDefineItems on second step', async () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // Navigate to step 2
    fireEvent.click(screen.getByText('Proximo'));

    await waitFor(() => {
      // StepDefineItems should render
      expect(screen.getByText('Itens para Pesquisa')).toBeInTheDocument();
    });
  });

  it('renders placeholder content for steps 3-5', async () => {
    render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // Navigate to step 3
    fireEvent.click(screen.getByText('Proximo')); // Go to step 2
    await waitFor(() => {
      expect(screen.getByText('Itens para Pesquisa')).toBeInTheDocument();
    });

    // Add at least one item to pass validation (since step 2 requires items)
    fireEvent.click(screen.getByText('Adicionar Item'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Descricao do Item/i)).toBeInTheDocument();
    });

    // Fill item to pass validation
    const descInput = screen.getByLabelText(/Descricao do Item/i);
    fireEvent.change(descInput, { target: { value: 'Test Item' } });

    fireEvent.click(screen.getByText('Proximo')); // Go to step 3

    await waitFor(() => {
      // Placeholder message should be visible for step 3+
      expect(
        screen.getByText(/Este passo sera implementado nas proximas issues/i),
      ).toBeInTheDocument();
    });
  });
});

describe('CreatePesquisaPrecosWizard - Keyboard Navigation', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prevents form submission on Enter key except on last step', async () => {
    const { container } = render(
      <TestWrapper>
        <CreatePesquisaPrecosWizard
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>,
    );

    // Find the form element directly
    const form = container.querySelector('form');
    expect(form).toBeTruthy();

    // Simulate Enter key press
    if (form) {
      fireEvent.keyDown(form, { key: 'Enter', code: 'Enter' });
    }

    // onSubmit should NOT be called on first step
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
