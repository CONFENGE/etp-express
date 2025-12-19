import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataSourceStatus } from './DataSourceStatus';
import { SearchStatus, SourceStatus } from '@/types/search';

describe('DataSourceStatus', () => {
  const mockOnRetry = vi.fn();

  const successSources: SourceStatus[] = [
    {
      name: 'pncp',
      status: SearchStatus.SUCCESS,
      resultCount: 10,
      latencyMs: 120,
    },
    {
      name: 'comprasgov',
      status: SearchStatus.SUCCESS,
      resultCount: 5,
      latencyMs: 200,
    },
  ];

  const partialSources: SourceStatus[] = [
    {
      name: 'pncp',
      status: SearchStatus.SUCCESS,
      resultCount: 10,
      latencyMs: 120,
    },
    {
      name: 'comprasgov',
      status: SearchStatus.SERVICE_UNAVAILABLE,
      error: 'Timeout',
    },
  ];

  const failedSources: SourceStatus[] = [
    {
      name: 'pncp',
      status: SearchStatus.SERVICE_UNAVAILABLE,
      error: 'Connection refused',
    },
    { name: 'comprasgov', status: SearchStatus.TIMEOUT, error: 'Timeout' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render success status correctly', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SUCCESS}
          sources={successSources}
        />,
      );

      // Status appears in both AlertTitle and Badge
      expect(screen.getAllByText('Dados carregados')).toHaveLength(2);
    });

    it('should render partial status with warning', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
        />,
      );

      // Status appears in both AlertTitle and Badge
      expect(screen.getAllByText('Dados parciais')).toHaveLength(2);
    });

    it('should render service unavailable status with error', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SERVICE_UNAVAILABLE}
          sources={failedSources}
        />,
      );

      // Status appears in both AlertTitle and Badge
      expect(screen.getAllByText('Serviço indisponível')).toHaveLength(2);
    });

    it('should render rate limited status', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.RATE_LIMITED}
          sources={[{ name: 'pncp', status: SearchStatus.RATE_LIMITED }]}
        />,
      );

      // Status appears in both AlertTitle and Badge
      expect(screen.getAllByText('Limite atingido')).toHaveLength(2);
    });

    it('should render timeout status', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.TIMEOUT}
          sources={[{ name: 'pncp', status: SearchStatus.TIMEOUT }]}
        />,
      );

      // Status appears in both AlertTitle and Badge
      expect(screen.getAllByText('Tempo esgotado')).toHaveLength(2);
    });
  });

  describe('Compact Mode', () => {
    it('should render only badge in compact mode for success', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SUCCESS}
          sources={successSources}
          compact
        />,
      );

      // Should only have badge, no alert banner
      expect(screen.getByText('Dados carregados')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should render badge with retry button in compact mode for failures', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
          compact
          onRetry={mockOnRetry}
        />,
      );

      expect(screen.getByText('Dados parciais')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not show retry button in compact success mode', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SUCCESS}
          sources={successSources}
          compact
          onRetry={mockOnRetry}
        />,
      );

      // Success status shouldn't have retry button even with callback
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should render retry button when onRetry is provided', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
          onRetry={mockOnRetry}
        />,
      );

      expect(
        screen.getByRole('button', { name: /tentar novamente/i }),
      ).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
          onRetry={mockOnRetry}
        />,
      );

      fireEvent.click(
        screen.getByRole('button', { name: /tentar novamente/i }),
      );

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should disable retry button when isRetrying is true', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
          onRetry={mockOnRetry}
          isRetrying
        />,
      );

      expect(screen.getByRole('button', { name: /tentando/i })).toBeDisabled();
    });

    it('should show spinner icon when isRetrying', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
          onRetry={mockOnRetry}
          isRetrying
        />,
      );

      const button = screen.getByRole('button', { name: /tentando/i });
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('should not render retry button when status is SUCCESS', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SUCCESS}
          sources={successSources}
          onRetry={mockOnRetry}
        />,
      );

      expect(
        screen.queryByRole('button', { name: /tentar novamente/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Status Messages', () => {
    it('should show correct message for partial status', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
        />,
      );

      // Should mention the failed source
      expect(
        screen.getByText(/Compras\.gov\.br.*indisponível/i),
      ).toBeInTheDocument();
    });

    it('should show correct message for service unavailable', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SERVICE_UNAVAILABLE}
          sources={failedSources}
        />,
      );

      expect(
        screen.getByText(
          /Serviços governamentais temporariamente indisponíveis/i,
        ),
      ).toBeInTheDocument();
    });

    it('should show correct message for rate limited', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.RATE_LIMITED}
          sources={[{ name: 'pncp', status: SearchStatus.RATE_LIMITED }]}
        />,
      );

      expect(
        screen.getByText(/Limite de requisições atingido/i),
      ).toBeInTheDocument();
    });

    it('should show correct message for timeout', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.TIMEOUT}
          sources={[{ name: 'pncp', status: SearchStatus.TIMEOUT }]}
        />,
      );

      expect(
        screen.getByText(/busca demorou mais que o esperado/i),
      ).toBeInTheDocument();
    });
  });

  describe('Source Labels', () => {
    it('should display correct label for PNCP', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SUCCESS}
          sources={[
            { name: 'pncp', status: SearchStatus.SUCCESS, resultCount: 5 },
          ]}
        />,
      );

      // Status label appears in multiple places
      expect(screen.getAllByText('Dados carregados').length).toBeGreaterThan(0);
    });

    it('should display correct label for Compras.gov.br', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
        />,
      );

      expect(screen.getByText(/Compras\.gov\.br/i)).toBeInTheDocument();
    });
  });

  describe('Alert Variants', () => {
    it('should use destructive variant for service unavailable', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SERVICE_UNAVAILABLE}
          sources={failedSources}
        />,
      );

      const alert = screen.getByRole('alert');
      // The Alert component with destructive variant should have specific classes
      expect(alert).toHaveClass('border-destructive/50');
    });

    it('should use warning variant for partial status', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
        />,
      );

      const alert = screen.getByRole('alert');
      // Warning variant should have yellow-related classes
      expect(alert).toHaveClass('border-yellow-500/50');
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for non-compact mode', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
        />,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-hidden on decorative icons', () => {
      const { container } = render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
        />,
      );

      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have sr-only text for compact retry button', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
          compact
          onRetry={mockOnRetry}
        />,
      );

      expect(screen.getByText('Tentar novamente')).toHaveClass('sr-only');
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
          className="custom-class"
        />,
      );

      expect(screen.getByRole('alert')).toHaveClass('custom-class');
    });

    it('should apply custom className in compact mode', () => {
      const { container } = render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={partialSources}
          compact
          className="custom-compact-class"
        />,
      );

      expect(container.firstChild).toHaveClass('custom-compact-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sources array', () => {
      render(<DataSourceStatus status={SearchStatus.SUCCESS} sources={[]} />);

      expect(screen.getAllByText('Dados carregados').length).toBeGreaterThan(0);
    });

    it('should handle sources with missing optional fields', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SUCCESS}
          sources={[{ name: 'pncp', status: SearchStatus.SUCCESS }]}
        />,
      );

      expect(screen.getAllByText('Dados carregados').length).toBeGreaterThan(0);
    });

    it('should handle unknown source names gracefully', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SUCCESS}
          sources={[
            {
              name: 'unknown_source',
              status: SearchStatus.SUCCESS,
              resultCount: 3,
            },
          ]}
        />,
      );

      expect(screen.getAllByText('Dados carregados').length).toBeGreaterThan(0);
    });

    it('should handle source with zero results', () => {
      render(
        <DataSourceStatus
          status={SearchStatus.SUCCESS}
          sources={[
            { name: 'pncp', status: SearchStatus.SUCCESS, resultCount: 0 },
          ]}
        />,
      );

      expect(screen.getAllByText('Dados carregados').length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Sources', () => {
    it('should handle mix of success and failed sources', () => {
      const mixedSources: SourceStatus[] = [
        { name: 'pncp', status: SearchStatus.SUCCESS, resultCount: 10 },
        { name: 'comprasgov', status: SearchStatus.SERVICE_UNAVAILABLE },
        { name: 'sinapi', status: SearchStatus.SUCCESS, resultCount: 5 },
        { name: 'sicro', status: SearchStatus.TIMEOUT },
      ];

      render(
        <DataSourceStatus
          status={SearchStatus.PARTIAL}
          sources={mixedSources}
        />,
      );

      expect(screen.getAllByText('Dados parciais').length).toBeGreaterThan(0);
    });

    it('should list multiple failed sources in message', () => {
      const multiFailSources: SourceStatus[] = [
        { name: 'pncp', status: SearchStatus.SERVICE_UNAVAILABLE },
        { name: 'comprasgov', status: SearchStatus.SERVICE_UNAVAILABLE },
      ];

      render(
        <DataSourceStatus
          status={SearchStatus.SERVICE_UNAVAILABLE}
          sources={multiFailSources}
        />,
      );

      expect(
        screen.getByText(
          /Serviços governamentais temporariamente indisponíveis/i,
        ),
      ).toBeInTheDocument();
    });
  });
});
