import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormProgressBar } from './FormProgressBar';

describe('FormProgressBar', () => {
  const defaultProps = {
    progress: 50,
    filledFields: 2,
    totalFields: 4,
  };

  describe('rendering', () => {
    it('renders progress percentage', () => {
      render(<FormProgressBar {...defaultProps} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders field count when showFieldCount is true (default)', () => {
      render(<FormProgressBar {...defaultProps} />);
      expect(screen.getByText('2 de 4 campos preenchidos')).toBeInTheDocument();
    });

    it('hides field count when showFieldCount is false', () => {
      render(<FormProgressBar {...defaultProps} showFieldCount={false} />);
      expect(
        screen.queryByText('2 de 4 campos preenchidos'),
      ).not.toBeInTheDocument();
    });

    it('has correct ARIA attributes', () => {
      render(<FormProgressBar {...defaultProps} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
      expect(progressbar).toHaveAttribute(
        'aria-label',
        'Progresso do formulário: 50%',
      );
    });
  });

  describe('progress clamping', () => {
    it('clamps progress to 0 when negative', () => {
      render(<FormProgressBar {...defaultProps} progress={-10} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('clamps progress to 100 when over 100', () => {
      render(<FormProgressBar {...defaultProps} progress={150} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('rounds progress to nearest integer', () => {
      render(<FormProgressBar {...defaultProps} progress={33.7} />);
      expect(screen.getByText('34%')).toBeInTheDocument();
    });
  });

  describe('completion state', () => {
    it('shows completion message when progress is 100%', () => {
      render(
        <FormProgressBar {...defaultProps} progress={100} filledFields={4} />,
      );
      expect(
        screen.getByText(
          'Formulário completo! Revise os dados antes de salvar.',
        ),
      ).toBeInTheDocument();
    });

    it('hides completion message when showCompletionMessage is false', () => {
      render(
        <FormProgressBar
          {...defaultProps}
          progress={100}
          filledFields={4}
          showCompletionMessage={false}
        />,
      );
      expect(
        screen.queryByText(
          'Formulário completo! Revise os dados antes de salvar.',
        ),
      ).not.toBeInTheDocument();
    });

    it('does not show completion message when progress < 100%', () => {
      render(<FormProgressBar {...defaultProps} progress={99} />);
      expect(
        screen.queryByText(
          'Formulário completo! Revise os dados antes de salvar.',
        ),
      ).not.toBeInTheDocument();
    });

    it('shows check icon when complete', () => {
      render(
        <FormProgressBar {...defaultProps} progress={100} filledFields={4} />,
      );
      // CheckCircle2 icon should be present - the SVG has the class directly
      const checkIcon = document.querySelector(
        'svg.text-green-600, svg.text-green-500',
      );
      expect(checkIcon).toBeInTheDocument();
    });

    it('applies green styling to percentage when complete', () => {
      render(
        <FormProgressBar {...defaultProps} progress={100} filledFields={4} />,
      );
      const percentage = screen.getByText('100%');
      expect(percentage.className).toMatch(/text-green-/);
    });
  });

  describe('progress bar colors', () => {
    it('has orange color for low progress (< 25%)', () => {
      render(<FormProgressBar {...defaultProps} progress={20} />);
      const progressBar = document.querySelector('[style*="width: 20%"]');
      expect(progressBar).toHaveClass('bg-orange-400');
    });

    it('has yellow-500 color for progress 25-49%', () => {
      render(<FormProgressBar {...defaultProps} progress={30} />);
      const progressBar = document.querySelector('[style*="width: 30%"]');
      expect(progressBar).toHaveClass('bg-yellow-500');
    });

    it('has yellow-400 color for progress 50-74%', () => {
      render(<FormProgressBar {...defaultProps} progress={60} />);
      const progressBar = document.querySelector('[style*="width: 60%"]');
      expect(progressBar).toHaveClass('bg-yellow-400');
    });

    it('has green-400 color for progress 75-99%', () => {
      render(<FormProgressBar {...defaultProps} progress={80} />);
      const progressBar = document.querySelector('[style*="width: 80%"]');
      expect(progressBar).toHaveClass('bg-green-400');
    });

    it('has green-500 color for 100% completion', () => {
      render(
        <FormProgressBar {...defaultProps} progress={100} filledFields={4} />,
      );
      const progressBar = document.querySelector('[style*="width: 100%"]');
      expect(progressBar).toHaveClass('bg-green-500');
    });
  });

  describe('progress bar width', () => {
    it('sets correct width style based on progress', () => {
      render(<FormProgressBar {...defaultProps} progress={75} />);
      const progressBar = document.querySelector('.h-full.rounded-full');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('sets width to 0% for 0 progress', () => {
      render(
        <FormProgressBar {...defaultProps} progress={0} filledFields={0} />,
      );
      const progressBar = document.querySelector('.h-full.rounded-full');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });
  });

  describe('accessibility', () => {
    it('completion message has aria-live polite', () => {
      render(
        <FormProgressBar {...defaultProps} progress={100} filledFields={4} />,
      );
      const message = screen.getByText(
        'Formulário completo! Revise os dados antes de salvar.',
      );
      expect(message).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('custom className', () => {
    it('applies custom className to wrapper', () => {
      const { container } = render(
        <FormProgressBar {...defaultProps} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
