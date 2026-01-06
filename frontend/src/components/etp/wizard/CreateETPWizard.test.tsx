import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CreateETPWizard } from './CreateETPWizard';

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
    it('renders all 5 step indicators', () => {
      renderWizard();
      // Use getAllByText since step titles appear in both step indicators and current step heading
      expect(screen.getAllByText('Identificacao').length).toBeGreaterThan(0);
      expect(
        screen.getAllByText('Objeto e Justificativa').length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText('Requisitos Tecnicos').length).toBeGreaterThan(
        0,
      );
      expect(
        screen.getAllByText('Estimativa de Custos').length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText('Analise de Riscos').length).toBeGreaterThan(
        0,
      );
    });

    it('renders step 1 content initially', () => {
      renderWizard();
      expect(screen.getByLabelText(/titulo do etp/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/orgao\/entidade/i)).toBeInTheDocument();
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
        screen.getByRole('button', { name: /proximo/i }),
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
    it('advances to step 2 when title is filled and next is clicked', async () => {
      const user = userEvent.setup();
      renderWizard();

      const titleInput = screen.getByLabelText(/titulo do etp/i);
      await user.type(titleInput, 'Contratacao de Servicos de TI');

      const nextButton = screen.getByRole('button', { name: /proximo/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/objeto da contratacao/i),
        ).toBeInTheDocument();
      });
    });

    it('shows back button after advancing to step 2', async () => {
      const user = userEvent.setup();
      renderWizard();

      const titleInput = screen.getByLabelText(/titulo do etp/i);
      await user.type(titleInput, 'Contratacao de Servicos de TI');

      const nextButton = screen.getByRole('button', { name: /proximo/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /voltar/i }),
        ).toBeInTheDocument();
      });
    });

    it('goes back to step 1 when back button is clicked', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Fill step 1 and advance
      const titleInput = screen.getByLabelText(/titulo do etp/i);
      await user.type(titleInput, 'Contratacao de Servicos de TI');
      await user.click(screen.getByRole('button', { name: /proximo/i }));

      // Wait for step 2
      await waitFor(() => {
        expect(
          screen.getByLabelText(/objeto da contratacao/i),
        ).toBeInTheDocument();
      });

      // Go back
      await user.click(screen.getByRole('button', { name: /voltar/i }));

      // Should be back on step 1
      await waitFor(() => {
        expect(screen.getByLabelText(/titulo do etp/i)).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('shows validation error when title is too short', async () => {
      const user = userEvent.setup();
      renderWizard();

      const titleInput = screen.getByLabelText(/titulo do etp/i);
      await user.type(titleInput, 'abc');
      fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(
          screen.getByText(/titulo deve ter no minimo 5 caracteres/i),
        ).toBeInTheDocument();
      });
    });

    it('does not advance when required field is empty', async () => {
      const user = userEvent.setup();
      renderWizard();

      const nextButton = screen.getByRole('button', { name: /proximo/i });
      await user.click(nextButton);

      // Should still be on step 1 after attempting to advance
      await waitFor(() => {
        expect(screen.getByLabelText(/titulo do etp/i)).toBeInTheDocument();
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
    it('shows submit button on last step', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Fill step 1 and advance
      await user.type(
        screen.getByLabelText(/titulo do etp/i),
        'Contratacao de Servicos de TI',
      );
      await user.click(screen.getByRole('button', { name: /proximo/i }));

      // Fill step 2 and advance
      await waitFor(() => screen.getByLabelText(/objeto da contratacao/i));
      await user.type(
        screen.getByLabelText(/objeto da contratacao/i),
        'Contratacao de empresa especializada em desenvolvimento',
      );
      await user.click(screen.getByRole('button', { name: /proximo/i }));

      // Advance through step 3
      await waitFor(() => screen.getByLabelText(/requisitos tecnicos/i));
      await user.click(screen.getByRole('button', { name: /proximo/i }));

      // Advance through step 4
      await waitFor(() => screen.getByLabelText(/valor unitario/i));
      await user.click(screen.getByRole('button', { name: /proximo/i }));

      // Should be on step 5 with submit button
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
      expect(screen.getByRole('button', { name: /proximo/i })).toBeDisabled();
    });
  });

  describe('step indicators', () => {
    it('shows checkmark on completed steps', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Fill step 1 and advance
      await user.type(
        screen.getByLabelText(/titulo do etp/i),
        'Contratacao de Servicos de TI',
      );
      await user.click(screen.getByRole('button', { name: /proximo/i }));

      await waitFor(() => {
        // Step 1 indicator should show checkmark (SVG icon)
        const checkIcon = document.querySelector('svg.w-4.h-4');
        expect(checkIcon).toBeInTheDocument();
      });
    });
  });
});
