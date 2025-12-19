import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WelcomeModal } from './WelcomeModal';

// Store original window.open
const originalWindowOpen = window.open;

function renderWelcomeModal(props = {}) {
  return render(
    <MemoryRouter>
      <WelcomeModal {...props} />
    </MemoryRouter>,
  );
}

describe('WelcomeModal', () => {
  beforeEach(() => {
    window.open = vi.fn();
  });

  afterEach(() => {
    window.open = originalWindowOpen;
  });

  describe('visibility', () => {
    it('opens automatically for first-time users', async () => {
      // Clear localStorage before this specific test
      localStorage.removeItem('etp-express-welcome-dismissed');
      renderWelcomeModal();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('opens when forceOpen is true', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('content', () => {
    it('displays welcome title', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(
          screen.getByText('Bem-vindo ao ETP Express!'),
        ).toBeInTheDocument();
      });
    });

    it('displays system description', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(
          screen.getByText(/elabore estudos tecnicos preliminares/i),
        ).toBeInTheDocument();
      });
    });

    it('displays CTA button to create ETP', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /criar meu primeiro etp/i }),
        ).toBeInTheDocument();
      });
    });

    it('displays button to read manual', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /ler o manual do usuario/i }),
        ).toBeInTheDocument();
      });
    });

    it('displays checkbox for "dont show again"', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(screen.getByText(/nao mostrar novamente/i)).toBeInTheDocument();
      });
    });

    it('displays Welcome illustration', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        // The Welcome SVG should be rendered
        const dialog = screen.getByRole('dialog');
        expect(dialog.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('interactions', () => {
    it('opens manual in new tab when manual button is clicked', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /ler o manual do usuario/i }),
        ).toBeInTheDocument();
      });

      const manualButton = screen.getByRole('button', {
        name: /ler o manual do usuario/i,
      });
      fireEvent.click(manualButton);

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('MANUAL_USUARIO.md'),
        '_blank',
        'noopener,noreferrer',
      );
    });

    it('closes modal when close button is clicked', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find and click the close button
      const closeButton = screen.getByRole('button', { name: /fechar/i });
      fireEvent.click(closeButton);

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('checkbox can be toggled', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find checkbox by its label
      const checkboxLabel = screen.getByText(/nao mostrar novamente/i);
      fireEvent.click(checkboxLabel);

      // Checkbox should be checked (the click on label toggles it)
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('accessibility', () => {
    it('has proper dialog role', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('has aria-describedby for description', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute(
          'aria-describedby',
          'welcome-description',
        );
      });
    });

    it('close button has accessible label', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /fechar/i }),
        ).toBeInTheDocument();
      });
    });

    it('CTA buttons are keyboard accessible', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        const createButton = screen.getByRole('button', {
          name: /criar meu primeiro etp/i,
        });
        const manualButton = screen.getByRole('button', {
          name: /ler o manual do usuario/i,
        });

        expect(createButton).not.toHaveAttribute('tabindex', '-1');
        expect(manualButton).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
