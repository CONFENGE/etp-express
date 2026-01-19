import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriceAlertBadge } from './PriceAlertBadge';
import { AlertLevel } from '@/types/analytics';
import { TooltipProvider } from '@/components/ui/tooltip';

// Wrapper for Tooltip provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

describe('PriceAlertBadge', () => {
  describe('Loading state', () => {
    it('should render loading spinner when isLoading is true', () => {
      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={null}
            medianPrice={null}
            suggestedRange={null}
            percentageAbove={null}
            isLoading={true}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Verificando preço...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-label for accessibility', () => {
      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={null}
            medianPrice={null}
            suggestedRange={null}
            percentageAbove={null}
            isLoading={true}
          />
        </TestWrapper>,
      );

      expect(
        screen.getByRole('status', { name: 'Verificando preço' }),
      ).toBeInTheDocument();
    });
  });

  describe('Null state', () => {
    it('should render nothing when alertLevel is null and not loading', () => {
      const { container } = render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={null}
            medianPrice={null}
            suggestedRange={null}
            percentageAbove={null}
            isLoading={false}
          />
        </TestWrapper>,
      );

      expect(container.textContent).toBe('');
    });
  });

  describe('Alert Levels', () => {
    const testCases: Array<{
      level: AlertLevel;
      label: string;
      description: string;
    }> = [
      {
        level: AlertLevel.OK,
        label: 'OK',
        description: 'Dentro da faixa aceitável de mercado',
      },
      {
        level: AlertLevel.ATTENTION,
        label: 'Atentar',
        description: 'Levemente acima da mediana regional',
      },
      {
        level: AlertLevel.WARNING,
        label: 'Alerta',
        description:
          'Significativamente acima da mediana - TCE pode questionar',
      },
      {
        level: AlertLevel.CRITICAL,
        label: 'Risco',
        description: 'Alto risco de questionamento em auditoria',
      },
    ];

    testCases.forEach(({ level, label, description }) => {
      it(`should render ${level} level badge with correct label`, () => {
        render(
          <TestWrapper>
            <PriceAlertBadge
              alertLevel={level}
              medianPrice={3450}
              suggestedRange={{ low: 3200, high: 3700 }}
              percentageAbove={44.93}
            />
          </TestWrapper>,
        );

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByText(description)).toBeInTheDocument();
      });
    });
  });

  describe('Compact mode', () => {
    it('should render only badge in compact mode', () => {
      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.WARNING}
            medianPrice={3450}
            suggestedRange={{ low: 3200, high: 3700 }}
            percentageAbove={44.93}
            compact={true}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Alerta')).toBeInTheDocument();
      // Should not show description in compact mode
      expect(
        screen.queryByText(
          'Significativamente acima da mediana - TCE pode questionar',
        ),
      ).not.toBeInTheDocument();
    });

    it('should have aria-label in compact mode', () => {
      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.WARNING}
            medianPrice={3450}
            suggestedRange={{ low: 3200, high: 3700 }}
            percentageAbove={44.93}
            compact={true}
          />
        </TestWrapper>,
      );

      expect(
        screen.getByRole('status', { name: 'Alerta de preço: Alerta' }),
      ).toBeInTheDocument();
    });
  });

  describe('Percentage display', () => {
    it('should display positive percentage with + sign', () => {
      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.WARNING}
            medianPrice={3450}
            suggestedRange={{ low: 3200, high: 3700 }}
            percentageAbove={44.93}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('(+44.9%)')).toBeInTheDocument();
    });

    it('should display negative percentage without + sign', () => {
      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.OK}
            medianPrice={3450}
            suggestedRange={{ low: 3200, high: 3700 }}
            percentageAbove={-10.5}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('(-10.5%)')).toBeInTheDocument();
    });
  });

  describe('Expandable details', () => {
    it('should show details when expand button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.WARNING}
            medianPrice={3450}
            suggestedRange={{ low: 3200, high: 3700 }}
            percentageAbove={44.93}
            sampleCount={245}
            benchmarkUf="SP"
          />
        </TestWrapper>,
      );

      // Details should not be visible initially
      expect(screen.queryByText('Mediana regional:')).not.toBeInTheDocument();

      // Click expand button
      const expandButton = screen.getByRole('button', {
        name: 'Ver detalhes',
      });
      await user.click(expandButton);

      // Details should now be visible
      expect(screen.getByText('Mediana regional:')).toBeInTheDocument();
      expect(screen.getByText('R$ 3.450,00')).toBeInTheDocument();
      expect(screen.getByText('Faixa sugerida:')).toBeInTheDocument();
      expect(screen.getByText('R$ 3.200,00 - R$ 3.700,00')).toBeInTheDocument();
      expect(screen.getByText('Amostras:')).toBeInTheDocument();
      expect(screen.getByText('245 contratos')).toBeInTheDocument();
      expect(screen.getByText('Referência:')).toBeInTheDocument();
      expect(screen.getByText('SP')).toBeInTheDocument();
    });

    it('should hide details when collapse button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.WARNING}
            medianPrice={3450}
            suggestedRange={{ low: 3200, high: 3700 }}
            percentageAbove={44.93}
          />
        </TestWrapper>,
      );

      // Expand
      const expandButton = screen.getByRole('button', {
        name: 'Ver detalhes',
      });
      await user.click(expandButton);

      expect(screen.getByText('Mediana regional:')).toBeInTheDocument();

      // Collapse
      const collapseButton = screen.getByRole('button', {
        name: 'Ocultar detalhes',
      });
      await user.click(collapseButton);

      expect(screen.queryByText('Mediana regional:')).not.toBeInTheDocument();
    });

    it('should show informative disclaimer in expanded details', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.WARNING}
            medianPrice={3450}
            suggestedRange={{ low: 3200, high: 3700 }}
            percentageAbove={44.93}
          />
        </TestWrapper>,
      );

      await user.click(screen.getByRole('button', { name: 'Ver detalhes' }));

      expect(
        screen.getByText(/não impede o envio do formulário/),
      ).toBeInTheDocument();
    });
  });

  describe('Currency formatting', () => {
    it('should format currency in Brazilian Real format', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.WARNING}
            medianPrice={1234567.89}
            suggestedRange={{ low: 1000000, high: 1500000 }}
            percentageAbove={23.45}
          />
        </TestWrapper>,
      );

      await user.click(screen.getByRole('button', { name: 'Ver detalhes' }));

      // Check that large numbers are formatted correctly with dots for thousands
      expect(screen.getByText('R$ 1.234.567,89')).toBeInTheDocument();
      expect(
        screen.getByText('R$ 1.000.000,00 - R$ 1.500.000,00'),
      ).toBeInTheDocument();
    });
  });

  describe('Sample count formatting', () => {
    it('should format large sample counts with thousand separators', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.OK}
            medianPrice={1000}
            suggestedRange={{ low: 900, high: 1100 }}
            percentageAbove={5}
            sampleCount={12345}
          />
        </TestWrapper>,
      );

      await user.click(screen.getByRole('button', { name: 'Ver detalhes' }));

      expect(screen.getByText('12.345 contratos')).toBeInTheDocument();
    });

    it('should not show sample count when it is 0', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.OK}
            medianPrice={1000}
            suggestedRange={{ low: 900, high: 1100 }}
            percentageAbove={5}
            sampleCount={0}
          />
        </TestWrapper>,
      );

      await user.click(screen.getByRole('button', { name: 'Ver detalhes' }));

      expect(screen.queryByText('Amostras:')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.WARNING}
            medianPrice={3450}
            suggestedRange={{ low: 3200, high: 3700 }}
            percentageAbove={44.93}
          />
        </TestWrapper>,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-expanded attribute on toggle button', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.WARNING}
            medianPrice={3450}
            suggestedRange={{ low: 3200, high: 3700 }}
            percentageAbove={44.93}
          />
        </TestWrapper>,
      );

      const button = screen.getByRole('button', { name: 'Ver detalhes' });
      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);

      expect(
        screen.getByRole('button', { name: 'Ocultar detalhes' }),
      ).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(
        <TestWrapper>
          <PriceAlertBadge
            alertLevel={AlertLevel.OK}
            medianPrice={1000}
            suggestedRange={{ low: 900, high: 1100 }}
            percentageAbove={5}
            className="custom-class"
          />
        </TestWrapper>,
      );

      expect(screen.getByRole('alert')).toHaveClass('custom-class');
    });
  });
});
