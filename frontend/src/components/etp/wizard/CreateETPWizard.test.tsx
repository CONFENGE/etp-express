import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CreateETPWizard } from './CreateETPWizard';
import { EtpTemplate, EtpTemplateType } from '@/types/template';
import * as useTemplatesModule from '@/hooks/useTemplates';

// Mock the useTemplates hook
vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: vi.fn(),
}));

const mockTemplates: EtpTemplate[] = [
  {
    id: 'template-1',
    name: 'Template para Obras',
    type: EtpTemplateType.OBRAS,
    description: 'Template para obras de engenharia',
    requiredFields: ['objeto', 'justificativa'],
    optionalFields: [],
    defaultSections: [],
    prompts: [],
    legalReferences: ['Lei 14.133/2021'],
    priceSourcesPreferred: ['SINAPI'],
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

// Mock ResizeObserver for Radix UI components
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

describe('CreateETPWizard', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock useTemplates to return templates
    vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWizard = (props = {}) => {
    return render(
      <CreateETPWizard
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        {...props}
      />,
    );
  };

  describe('rendering', () => {
    it('renders all 7 step indicators when template is selected', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Select a template first
      const templateCard = screen
        .getByText('Template para Obras')
        .closest('[role="option"]');
      await user.click(templateCard!);

      // Now all 7 steps should be visible including Campos Específicos
      expect(screen.getAllByText('Tipo de Documento').length).toBeGreaterThan(
        0,
      );
      expect(screen.getAllByText('Identificação').length).toBeGreaterThan(0);
      expect(
        screen.getAllByText('Objeto e Justificativa').length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText('Requisitos Técnicos').length).toBeGreaterThan(
        0,
      );
      expect(screen.getAllByText('Campos Específicos').length).toBeGreaterThan(
        0,
      );
      expect(
        screen.getAllByText('Estimativa de Custos').length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText('Análise de Riscos').length).toBeGreaterThan(
        0,
      );
    });

    // #1330 - When no template is selected, "Campos Específicos" step should be hidden
    it('renders only 6 step indicators when no template is selected', () => {
      renderWizard();
      // Use getAllByText since step titles appear in both step indicators and current step heading
      expect(screen.getAllByText('Tipo de Documento').length).toBeGreaterThan(
        0,
      );
      expect(screen.getAllByText('Identificação').length).toBeGreaterThan(0);
      expect(
        screen.getAllByText('Objeto e Justificativa').length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText('Requisitos Técnicos').length).toBeGreaterThan(
        0,
      );
      // "Campos Específicos" should NOT be visible when no template selected
      expect(screen.queryByText('Campos Específicos')).not.toBeInTheDocument();
      expect(
        screen.getAllByText('Estimativa de Custos').length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText('Análise de Riscos').length).toBeGreaterThan(
        0,
      );
    });

    it('renders step 0 (template selection) content initially', () => {
      renderWizard();
      expect(screen.getByText('Escolha um modelo de ETP')).toBeInTheDocument();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      renderWizard();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders cancel and next buttons', () => {
      renderWizard();
      expect(
        screen.getByRole('button', { name: /cancelar/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /próximo/i }),
      ).toBeInTheDocument();
    });

    it('does not render back button on first step', () => {
      renderWizard();
      expect(
        screen.queryByRole('button', { name: /voltar/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('advances to step 1 (identification) when next is clicked from step 0', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Step 0 has no required fields, so we can advance directly
      const nextButton = screen.getByRole('button', { name: /próximo/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/título do etp/i)).toBeInTheDocument();
      });
    });

    it('advances to step 2 when title is filled and next is clicked', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Advance from step 0
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/título do etp/i)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/título do etp/i);
      await user.type(titleInput, 'Contratacao de Servicos de TI');

      const nextButton = screen.getByRole('button', { name: /próximo/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/objeto da contratação/i),
        ).toBeInTheDocument();
      });
    });

    it('shows back button after advancing to step 1', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Advance from step 0
      const nextButton = screen.getByRole('button', { name: /próximo/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /voltar/i }),
        ).toBeInTheDocument();
      });
    });

    it('goes back to step 0 when back button is clicked from step 1', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Advance from step 0 to step 1
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Wait for step 1
      await waitFor(() => {
        expect(screen.getByLabelText(/título do etp/i)).toBeInTheDocument();
      });

      // Go back
      await user.click(screen.getByRole('button', { name: /voltar/i }));

      // Should be back on step 0 (template selection)
      await waitFor(() => {
        expect(
          screen.getByText('Escolha um modelo de ETP'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('shows validation error when title is too short', async () => {
      const user = userEvent.setup();
      renderWizard();

      // First advance from step 0 to step 1
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await waitFor(() => {
        expect(screen.getByLabelText(/título do etp/i)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/título do etp/i);
      await user.type(titleInput, 'abc');
      fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(
          screen.getByText(/titulo deve ter no minimo 5 caracteres/i),
        ).toBeInTheDocument();
      });
    });

    it('does not advance from step 1 when required field is empty', async () => {
      const user = userEvent.setup();
      renderWizard();

      // First advance from step 0 to step 1
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await waitFor(() => {
        expect(screen.getByLabelText(/título do etp/i)).toBeInTheDocument();
      });

      // Try to advance without filling title
      const nextButton = screen.getByRole('button', { name: /próximo/i });
      await user.click(nextButton);

      // Should still be on step 1 after attempting to advance
      await waitFor(() => {
        expect(screen.getByLabelText(/título do etp/i)).toBeInTheDocument();
      });
    });
  });

  describe('cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWizard();

      await user.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('submit', () => {
    // #1330 - Updated to skip step 4 (Campos Específicos) when no template selected
    it('shows submit button on last step (skipping Campos Específicos when no template)', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Advance from step 0 (template selection)
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await waitFor(() => screen.getByLabelText(/título do etp/i));

      // Fill step 1 and advance
      await user.type(
        screen.getByLabelText(/título do etp/i),
        'Contratacao de Servicos de TI',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Fill step 2 and advance
      await waitFor(() => screen.getByLabelText(/objeto da contratação/i));
      await user.type(
        screen.getByLabelText(/objeto da contratação/i),
        'Contratacao de empresa especializada em desenvolvimento',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Advance through step 3 (requirements)
      await waitFor(() => screen.getByLabelText(/requisitos técnicos/i));
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // #1330 - Step 4 (Campos Específicos) is SKIPPED when no template selected
      // Should go directly to step 5 (Costs)
      await waitFor(() => screen.getByLabelText(/valor unitário/i));
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Should be on step 6 (Risks) with submit button
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /criar etp/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('disables buttons when loading', () => {
      renderWizard({ isLoading: true });

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /próximo/i })).toBeDisabled();
    });
  });

  describe('step indicators', () => {
    it('shows checkmark on completed steps', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Advance from step 0
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      await waitFor(() => {
        // Step 0 indicator should show checkmark (SVG icon)
        const checkIcon = document.querySelector('svg.w-4.h-4');
        expect(checkIcon).toBeInTheDocument();
      });
    });
  });

  describe('template selection integration', () => {
    it('allows selecting a template before proceeding', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Should show template selection initially
      expect(screen.getByText('Escolha um modelo de ETP')).toBeInTheDocument();

      // Click on a template
      const templateCard = screen
        .getByText('Template para Obras')
        .closest('[role="option"]');
      await user.click(templateCard!);

      // Template should be selected (aria-selected=true)
      expect(templateCard).toHaveAttribute('aria-selected', 'true');

      // Advance to next step
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Should now be on step 1 (identification)
      await waitFor(() => {
        expect(screen.getByLabelText(/título do etp/i)).toBeInTheDocument();
      });
    });

    it('allows proceeding with blank document option', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Click on blank document option
      await user.click(
        screen.getByRole('button', {
          name: /iniciar com documento em branco/i,
        }),
      );

      // Advance to next step
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Should now be on step 1 (identification)
      await waitFor(() => {
        expect(screen.getByLabelText(/título do etp/i)).toBeInTheDocument();
      });
    });
  });

  describe('premature submission prevention (#1332)', () => {
    it('does not call onSubmit when pressing Enter on intermediate steps', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Advance from step 0 to step 1
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await waitFor(() => screen.getByLabelText(/título do etp/i));

      // Fill in a valid title
      const titleInput = screen.getByLabelText(/título do etp/i);
      await user.type(titleInput, 'Contratacao de Servicos de TI');

      // Press Enter on the title input - should NOT submit the form
      await user.type(titleInput, '{Enter}');

      // onSubmit should NOT have been called
      expect(mockOnSubmit).not.toHaveBeenCalled();

      // Should still be on step 1 (not advanced since Enter was intercepted)
      expect(screen.getByLabelText(/título do etp/i)).toBeInTheDocument();
    });

    it('does not submit form when clicking Next button on intermediate steps', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Advance from step 0 to step 1
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await waitFor(() => screen.getByLabelText(/título do etp/i));

      // Fill step 1 required fields
      await user.type(
        screen.getByLabelText(/título do etp/i),
        'Contratacao de Servicos de TI',
      );

      // Click Next to advance to step 2
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Wait for step 2
      await waitFor(() => screen.getByLabelText(/objeto da contratação/i));

      // onSubmit should NOT have been called - we're still navigating
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    // #1330 - Updated to skip step 4 (Campos Específicos) when no template selected
    it('only submits form on last step when Criar ETP is clicked', async () => {
      const user = userEvent.setup();
      // Mock successful submission
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderWizard();

      // Navigate through all steps
      // Step 0 -> 1
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await waitFor(() => screen.getByLabelText(/título do etp/i));

      // Fill step 1 and advance
      await user.type(
        screen.getByLabelText(/título do etp/i),
        'Contratacao de Servicos de TI',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Fill step 2 and advance
      await waitFor(() => screen.getByLabelText(/objeto da contratação/i));
      await user.type(
        screen.getByLabelText(/objeto da contratação/i),
        'Contratacao de empresa especializada em desenvolvimento',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Advance through step 3 (requirements - optional fields)
      await waitFor(() => screen.getByLabelText(/requisitos técnicos/i));
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // #1330 - Step 4 (Campos Específicos) is SKIPPED when no template selected
      // Should go directly to step 5 (costs)
      await waitFor(() => screen.getByLabelText(/valor unitário/i));
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Now on last step (step 6 - risks)
      await waitFor(() => screen.getByRole('button', { name: /criar etp/i }));

      // Verify onSubmit was NOT called during navigation
      expect(mockOnSubmit).not.toHaveBeenCalled();

      // Click Criar ETP to submit
      await user.click(screen.getByRole('button', { name: /criar etp/i }));

      // Now onSubmit should be called
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  // #1330 - Tests for skipping dynamic fields step when no template is selected
  describe('step skipping (#1330)', () => {
    it('skips Campos Específicos step when no template is selected', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Do not select a template, just proceed with blank document
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await waitFor(() => screen.getByLabelText(/título do etp/i));

      // Fill step 1
      await user.type(
        screen.getByLabelText(/título do etp/i),
        'Contratacao de Servicos de TI',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Fill step 2
      await waitFor(() => screen.getByLabelText(/objeto da contratação/i));
      await user.type(
        screen.getByLabelText(/objeto da contratação/i),
        'Contratacao de empresa especializada em desenvolvimento',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Step 3 (requirements)
      await waitFor(() => screen.getByLabelText(/requisitos técnicos/i));
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Should go directly to Costs (step 5), NOT Campos Específicos (step 4)
      await waitFor(() => {
        expect(screen.getByLabelText(/valor unitário/i)).toBeInTheDocument();
      });

      // The "selecione um template" message should NOT appear
      expect(
        screen.queryByText(/selecione um template no passo anterior/i),
      ).not.toBeInTheDocument();
    });

    it('shows Campos Específicos step when a template is selected', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Select a template
      const templateCard = screen
        .getByText('Template para Obras')
        .closest('[role="option"]');
      await user.click(templateCard!);

      // Proceed through steps
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await waitFor(() => screen.getByLabelText(/título do etp/i));

      // Fill step 1
      await user.type(
        screen.getByLabelText(/título do etp/i),
        'Contratacao de Obras',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Fill step 2
      await waitFor(() => screen.getByLabelText(/objeto da contratação/i));
      await user.type(
        screen.getByLabelText(/objeto da contratação/i),
        'Contratacao de empresa para obra civil',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Step 3 (requirements)
      await waitFor(() => screen.getByLabelText(/requisitos técnicos/i));
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Should be on Campos Específicos (step 4) with template-specific fields
      // Template OBRAS should show ART/RRT field
      await waitFor(() => {
        expect(screen.getByLabelText(/art\/rrt/i)).toBeInTheDocument();
      });
    });

    it('handles back navigation correctly when step is skipped', async () => {
      const user = userEvent.setup();
      renderWizard();

      // No template selected
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await waitFor(() => screen.getByLabelText(/título do etp/i));

      // Fill step 1
      await user.type(
        screen.getByLabelText(/título do etp/i),
        'Contratacao de Servicos de TI',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Fill step 2
      await waitFor(() => screen.getByLabelText(/objeto da contratação/i));
      await user.type(
        screen.getByLabelText(/objeto da contratação/i),
        'Contratacao de empresa especializada',
      );
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Step 3 (requirements)
      await waitFor(() => screen.getByLabelText(/requisitos técnicos/i));
      await user.click(screen.getByRole('button', { name: /próximo/i }));

      // Should be on Costs (step 5)
      await waitFor(() => screen.getByLabelText(/valor unitário/i));

      // Go back - should go to step 3, NOT step 4 (which is skipped)
      await user.click(screen.getByRole('button', { name: /voltar/i }));

      await waitFor(() => {
        expect(
          screen.getByLabelText(/requisitos técnicos/i),
        ).toBeInTheDocument();
      });
    });
  });
});
