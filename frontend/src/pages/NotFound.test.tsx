import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { NotFound } from './NotFound';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderNotFound = () => {
  return render(
    <BrowserRouter>
      <NotFound />
    </BrowserRouter>,
  );
};

describe('NotFound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visual Elements', () => {
    it('should render 404 text', () => {
      renderNotFound();

      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('should render 404 text with decorative styling (aria-hidden)', () => {
      renderNotFound();

      const text404 = screen.getByText('404');
      expect(text404).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render FileQuestion icon', () => {
      renderNotFound();

      // Icon should be present and hidden from screen readers
      // The icon is positioned absolutely within a relative container
      const icons = document.querySelectorAll('svg');
      const questionIcon = Array.from(icons).find((icon) =>
        icon.classList.contains('animate-pulse'),
      );
      expect(questionIcon).toBeInTheDocument();
      expect(questionIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render page title', () => {
      renderNotFound();

      expect(
        screen.getByRole('heading', { name: /página não encontrada/i }),
      ).toBeInTheDocument();
    });

    it('should render descriptive message', () => {
      renderNotFound();

      expect(
        screen.getByText(/a página que você está procurando não existe/i),
      ).toBeInTheDocument();
    });

    it('should render with gradient background', () => {
      renderNotFound();

      const container = document.querySelector('.bg-gradient-to-br');
      expect(container).toBeInTheDocument();
    });

    it('should render animated pulse icon', () => {
      renderNotFound();

      const animatedIcon = document.querySelector('.animate-pulse');
      expect(animatedIcon).toBeInTheDocument();
    });
  });

  describe('Navigation Buttons', () => {
    it('should render back button', () => {
      renderNotFound();

      const backButton = screen.getByTestId('back-button');
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveTextContent('Voltar');
    });

    it('should render home button', () => {
      renderNotFound();

      const homeButton = screen.getByTestId('home-button');
      expect(homeButton).toBeInTheDocument();
      expect(homeButton).toHaveTextContent('Ir para início');
    });

    it('should call navigate(-1) when back button is clicked', async () => {
      const user = userEvent.setup();
      renderNotFound();

      const backButton = screen.getByTestId('back-button');
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should link to home page when home button is clicked', () => {
      renderNotFound();

      const homeButton = screen.getByTestId('home-button');
      const link = homeButton.closest('a');
      expect(link).toHaveAttribute('href', '/');
    });

    it('should render back button as outline variant', () => {
      renderNotFound();

      const backButton = screen.getByTestId('back-button');
      expect(backButton).toHaveClass('border');
    });

    it('should render ArrowLeft icon in back button', () => {
      renderNotFound();

      const backButton = screen.getByTestId('back-button');
      const icon = backButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render Home icon in home button', () => {
      renderNotFound();

      const homeButton = screen.getByTestId('home-button');
      const icon = homeButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Useful Links', () => {
    it('should render useful links section', () => {
      renderNotFound();

      expect(
        screen.getByText(/talvez você esteja procurando/i),
      ).toBeInTheDocument();
    });

    it('should render link to ETPs', () => {
      renderNotFound();

      const etpsLink = screen.getByRole('link', { name: /meus etps/i });
      expect(etpsLink).toBeInTheDocument();
      expect(etpsLink).toHaveAttribute('href', '/etps');
    });

    it('should render link to Dashboard', () => {
      renderNotFound();

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('should have navigation landmark for useful links', () => {
      renderNotFound();

      const nav = screen.getByRole('navigation', { name: /links úteis/i });
      expect(nav).toBeInTheDocument();
    });

    it('should apply hover styles to links', () => {
      renderNotFound();

      const etpsLink = screen.getByRole('link', { name: /meus etps/i });
      expect(etpsLink).toHaveClass('hover:underline');
    });
  });

  describe('Responsiveness', () => {
    it('should have responsive button layout (flex-col sm:flex-row)', () => {
      renderNotFound();

      const buttonContainer = screen
        .getByTestId('back-button')
        .closest('.flex');
      expect(buttonContainer).toHaveClass('flex-col');
      expect(buttonContainer).toHaveClass('sm:flex-row');
    });

    it('should have max-width constraint', () => {
      renderNotFound();

      const contentContainer = document.querySelector('.max-w-md');
      expect(contentContainer).toBeInTheDocument();
    });

    it('should have padding for mobile', () => {
      renderNotFound();

      const container = document.querySelector('.min-h-screen');
      expect(container).toHaveClass('p-4');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading hierarchy', () => {
      renderNotFound();

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it('should hide decorative 404 text from screen readers', () => {
      renderNotFound();

      const text404 = screen.getByText('404');
      expect(text404).toHaveAttribute('aria-hidden', 'true');
    });

    it('should hide icons from screen readers', () => {
      renderNotFound();

      const icons = document.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have select-none on decorative 404', () => {
      renderNotFound();

      const text404 = screen.getByText('404');
      expect(text404).toHaveClass('select-none');
    });
  });
});
