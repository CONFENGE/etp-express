import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router';
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
    // Reset localStorage mock before each test
    vi.mocked(localStorage.getItem).mockReset();
    vi.mocked(localStorage.setItem).mockReset();
    vi.mocked(localStorage.removeItem).mockReset();
  });

  afterEach(() => {
    window.open = originalWindowOpen;
  });

  describe('visibility', () => {
    it('opens automatically for first-time users', async () => {
      // Simulate first-time user (no dismissed value in localStorage)
      vi.mocked(localStorage.getItem).mockReturnValue(null);
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
          screen.getByText(/elabore estudos técnicos preliminares/i),
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
          screen.getByRole('link', { name: /ler o manual do usuário/i }),
        ).toBeInTheDocument();
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
    it('manual link navigates to internal user-manual page', async () => {
      renderWelcomeModal({ forceOpen: true });

      await waitFor(() => {
        const manualLink = screen.getByRole('link', {
          name: /ler o manual do usuário/i,
        });
        expect(manualLink).toBeInTheDocument();
        expect(manualLink).toHaveAttribute('href', '/user-manual');
      });
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

    it('persists dismissal to localStorage when close button is clicked', async () => {
      // Simulate first-time user
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      renderWelcomeModal();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByRole('button', { name: /fechar/i });
      fireEvent.click(closeButton);

      // Check localStorage.setItem was called with correct arguments
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'etp-express-welcome-dismissed',
        'true',
      );
    });

    it('does not reopen after being dismissed (#1327)', async () => {
      // Simulate returning user who already dismissed the modal
      vi.mocked(localStorage.getItem).mockReturnValue('true');

      renderWelcomeModal();

      // Modal should NOT appear because localStorage indicates it was dismissed
      // Wait a bit to ensure useEffect has run
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
        const manualLink = screen.getByRole('link', {
          name: /ler o manual do usuário/i,
        });

        expect(createButton).not.toHaveAttribute('tabindex', '-1');
        expect(manualLink).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
