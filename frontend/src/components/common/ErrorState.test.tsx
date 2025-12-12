import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  const defaultProps = {
    onRetry: vi.fn(),
    onBack: vi.fn(),
    onHome: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default title and message', () => {
      render(<ErrorState />);

      expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Não foi possível carregar o conteúdo. Tente novamente.',
        ),
      ).toBeInTheDocument();
    });

    it('should render custom title', () => {
      render(<ErrorState title="Erro ao carregar ETPs" />);

      expect(screen.getByText('Erro ao carregar ETPs')).toBeInTheDocument();
    });

    it('should render custom message', () => {
      render(
        <ErrorState message="O servidor está temporariamente indisponível." />,
      );

      expect(
        screen.getByText('O servidor está temporariamente indisponível.'),
      ).toBeInTheDocument();
    });

    it('should render error icon', () => {
      render(<ErrorState />);

      // Icon container has specific styling
      const iconContainer = screen
        .getByRole('alert')
        .querySelector('.rounded-full');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply default variant classes', () => {
      render(<ErrorState />);

      const container = screen.getByRole('alert');
      expect(container).toHaveClass('py-12');
    });

    it('should apply compact variant classes', () => {
      render(<ErrorState variant="compact" />);

      const container = screen.getByRole('alert');
      expect(container).toHaveClass('py-6');
    });

    it('should apply fullscreen variant classes', () => {
      render(<ErrorState variant="fullscreen" />);

      const container = screen.getByRole('alert');
      expect(container).toHaveClass('min-h-screen');
    });

    it('should use smaller icon in compact variant', () => {
      const { container } = render(<ErrorState variant="compact" />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('h-8', 'w-8');
    });

    it('should use larger icon in default variant', () => {
      const { container } = render(<ErrorState variant="default" />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('h-12', 'w-12');
    });
  });

  describe('Action Buttons', () => {
    it('should render retry button when onRetry is provided', () => {
      render(<ErrorState onRetry={defaultProps.onRetry} />);

      expect(
        screen.getByRole('button', { name: /tentar novamente/i }),
      ).toBeInTheDocument();
    });

    it('should render back button when onBack is provided', () => {
      render(<ErrorState onBack={defaultProps.onBack} />);

      expect(
        screen.getByRole('button', { name: /voltar/i }),
      ).toBeInTheDocument();
    });

    it('should render home button when onHome is provided', () => {
      render(<ErrorState onHome={defaultProps.onHome} />);

      expect(
        screen.getByRole('button', { name: /início/i }),
      ).toBeInTheDocument();
    });

    it('should not render action buttons when no callbacks provided', () => {
      render(<ErrorState />);

      expect(
        screen.queryByRole('button', { name: /tentar novamente/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /voltar/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /início/i }),
      ).not.toBeInTheDocument();
    });

    it('should render multiple action buttons when multiple callbacks provided', () => {
      render(<ErrorState {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /tentar novamente/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /voltar/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /início/i }),
      ).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      render(<ErrorState onRetry={onRetry} />);

      fireEvent.click(
        screen.getByRole('button', { name: /tentar novamente/i }),
      );

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<ErrorState onBack={onBack} />);

      fireEvent.click(screen.getByRole('button', { name: /voltar/i }));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should call onHome when home button is clicked', () => {
      const onHome = vi.fn();
      render(<ErrorState onHome={onHome} />);

      fireEvent.click(screen.getByRole('button', { name: /início/i }));

      expect(onHome).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for accessibility', () => {
      render(<ErrorState />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="polite" for screen readers', () => {
      render(<ErrorState />);

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-hidden on decorative icons', () => {
      const { container } = render(<ErrorState {...defaultProps} />);

      // All SVG icons should be hidden from screen readers
      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have semantic heading structure', () => {
      render(<ErrorState title="Erro" />);

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className', () => {
      render(<ErrorState className="custom-error-class" />);

      expect(screen.getByRole('alert')).toHaveClass('custom-error-class');
    });

    it('should merge custom className with default classes', () => {
      render(<ErrorState className="custom-class" variant="default" />);

      const container = screen.getByRole('alert');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('py-12');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string title', () => {
      render(<ErrorState title="" />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('');
    });

    it('should handle empty string message', () => {
      render(<ErrorState message="" />);

      // Message paragraph should still exist but be empty
      const alert = screen.getByRole('alert');
      const messageParagraph = alert.querySelector('p');
      expect(messageParagraph).toBeInTheDocument();
      expect(messageParagraph).toHaveTextContent('');
    });

    it('should handle long title text', () => {
      const longTitle = 'A'.repeat(200);
      render(<ErrorState title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle long message text', () => {
      const longMessage = 'B'.repeat(500);
      render(<ErrorState message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });
});
