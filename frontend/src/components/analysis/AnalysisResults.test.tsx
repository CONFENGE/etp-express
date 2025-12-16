import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisResults, type AnalysisResultsProps } from './AnalysisResults';
import type {
  AnalysisDimensionScore,
  IssueSummary,
  DocumentInfo,
  ReportIssue,
} from '@/types/analysis';

describe('AnalysisResults', () => {
  const mockOnDownloadReport = vi.fn();
  const mockOnConvertToEtp = vi.fn();
  const mockOnReset = vi.fn();

  const defaultDimensions: AnalysisDimensionScore[] = [
    { dimension: 'legal', score: 75, passed: true },
    { dimension: 'clareza', score: 82, passed: true },
    { dimension: 'fundamentacao', score: 70, passed: true },
  ];

  const defaultIssueSummary: IssueSummary = {
    critical: 1,
    important: 3,
    suggestion: 5,
  };

  const defaultDocumentInfo: DocumentInfo = {
    wordCount: 1500,
    sectionCount: 8,
  };

  const defaultImprovements: ReportIssue[] = [
    {
      dimension: 'legal',
      severity: 'critical',
      title: 'Referência legal ausente',
      description: 'O documento não menciona a Lei 14.133/2021',
      recommendation: 'Adicione referência explícita',
    },
  ];

  const defaultProps: AnalysisResultsProps = {
    analysisId: 'test-analysis-123',
    filename: 'documento.pdf',
    overallScore: 78,
    meetsMinimumQuality: true,
    verdict: 'Aprovado com ressalvas',
    dimensions: defaultDimensions,
    issueSummary: defaultIssueSummary,
    documentInfo: defaultDocumentInfo,
    improvements: defaultImprovements,
    onDownloadReport: mockOnDownloadReport,
    onConvertToEtp: mockOnConvertToEtp,
    onReset: mockOnReset,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the ScoreCard with correct props', () => {
      render(<AnalysisResults {...defaultProps} />);

      expect(screen.getByText('78')).toBeInTheDocument();
      expect(screen.getByText('Aprovado com ressalvas')).toBeInTheDocument();
      expect(screen.getByText('documento.pdf')).toBeInTheDocument();
    });

    it('renders the ImprovementList when improvements are provided', () => {
      render(<AnalysisResults {...defaultProps} />);

      expect(screen.getByText('Referência legal ausente')).toBeInTheDocument();
    });

    it('renders analysis ID at the bottom', () => {
      render(<AnalysisResults {...defaultProps} />);

      expect(screen.getByText(/test-analysis-123/)).toBeInTheDocument();
    });

    it('has testid for container', () => {
      render(<AnalysisResults {...defaultProps} />);

      expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders download report button', () => {
      render(<AnalysisResults {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /baixar relatório pdf/i }),
      ).toBeInTheDocument();
    });

    it('renders convert to ETP button', () => {
      render(<AnalysisResults {...defaultProps} />);

      expect(
        screen.getByRole('button', {
          name: /criar etp a partir deste documento/i,
        }),
      ).toBeInTheDocument();
    });

    it('renders reset button', () => {
      render(<AnalysisResults {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /analisar outro documento/i }),
      ).toBeInTheDocument();
    });

    it('does not render download button when onDownloadReport is not provided', () => {
      render(
        <AnalysisResults {...defaultProps} onDownloadReport={undefined} />,
      );

      expect(
        screen.queryByRole('button', { name: /baixar relatório pdf/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render convert button when onConvertToEtp is not provided', () => {
      render(<AnalysisResults {...defaultProps} onConvertToEtp={undefined} />);

      expect(
        screen.queryByRole('button', {
          name: /criar etp a partir deste documento/i,
        }),
      ).not.toBeInTheDocument();
    });

    it('does not render reset button when onReset is not provided', () => {
      render(<AnalysisResults {...defaultProps} onReset={undefined} />);

      expect(
        screen.queryByRole('button', { name: /analisar outro documento/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Download Report', () => {
    it('calls onDownloadReport when download button is clicked', async () => {
      const user = userEvent.setup();
      mockOnDownloadReport.mockResolvedValueOnce(undefined);

      render(<AnalysisResults {...defaultProps} />);

      const downloadButton = screen.getByRole('button', {
        name: /baixar relatório pdf/i,
      });
      await user.click(downloadButton);

      expect(mockOnDownloadReport).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when downloading', () => {
      render(<AnalysisResults {...defaultProps} isDownloading={true} />);

      expect(screen.getByText('Gerando PDF...')).toBeInTheDocument();
    });

    it('disables buttons when downloading', () => {
      render(<AnalysisResults {...defaultProps} isDownloading={true} />);

      const downloadButton = screen.getByRole('button', {
        name: /gerando pdf/i,
      });
      expect(downloadButton).toBeDisabled();

      const convertButton = screen.getByRole('button', { name: /criar etp/i });
      expect(convertButton).toBeDisabled();
    });
  });

  describe('Convert to ETP', () => {
    it('calls onConvertToEtp when convert button is clicked', async () => {
      const user = userEvent.setup();
      mockOnConvertToEtp.mockResolvedValueOnce(undefined);

      render(<AnalysisResults {...defaultProps} />);

      const convertButton = screen.getByRole('button', {
        name: /criar etp a partir deste documento/i,
      });
      await user.click(convertButton);

      expect(mockOnConvertToEtp).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when converting', () => {
      render(<AnalysisResults {...defaultProps} isConverting={true} />);

      expect(screen.getByText('Convertendo...')).toBeInTheDocument();
    });

    it('disables buttons when converting', () => {
      render(<AnalysisResults {...defaultProps} isConverting={true} />);

      const downloadButton = screen.getByRole('button', {
        name: /baixar relatório pdf/i,
      });
      expect(downloadButton).toBeDisabled();

      const convertButton = screen.getByRole('button', {
        name: /convertendo/i,
      });
      expect(convertButton).toBeDisabled();
    });
  });

  describe('Reset', () => {
    it('calls onReset when reset button is clicked', async () => {
      const user = userEvent.setup();

      render(<AnalysisResults {...defaultProps} />);

      const resetButton = screen.getByRole('button', {
        name: /analisar outro documento/i,
      });
      await user.click(resetButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('displays error prop', () => {
      render(<AnalysisResults {...defaultProps} error="Erro de teste" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Erro de teste')).toBeInTheDocument();
    });

    it('displays error when download fails', async () => {
      const user = userEvent.setup();
      mockOnDownloadReport.mockRejectedValueOnce(new Error('Download failed'));

      render(<AnalysisResults {...defaultProps} />);

      const downloadButton = screen.getByRole('button', {
        name: /baixar relatório pdf/i,
      });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(
          screen.getByText(/erro ao baixar relatório/i),
        ).toBeInTheDocument();
      });
    });

    it('displays error when convert fails', async () => {
      const user = userEvent.setup();
      mockOnConvertToEtp.mockRejectedValueOnce(new Error('Convert failed'));

      render(<AnalysisResults {...defaultProps} />);

      const convertButton = screen.getByRole('button', {
        name: /criar etp a partir deste documento/i,
      });
      await user.click(convertButton);

      await waitFor(() => {
        expect(
          screen.getByText(/erro ao converter documento/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible loading states', () => {
      render(<AnalysisResults {...defaultProps} isDownloading={true} />);

      const downloadButton = screen.getByRole('button', {
        name: /gerando pdf/i,
      });
      expect(downloadButton).toHaveAttribute('aria-busy', 'true');
    });

    it('error message has alert role', () => {
      render(<AnalysisResults {...defaultProps} error="Erro de teste" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Without Improvements', () => {
    it('does not render ImprovementList when no improvements', () => {
      render(<AnalysisResults {...defaultProps} improvements={[]} />);

      expect(
        screen.queryByText('Melhorias Recomendadas'),
      ).not.toBeInTheDocument();
    });

    it('does not render ImprovementList when improvements is undefined', () => {
      render(<AnalysisResults {...defaultProps} improvements={undefined} />);

      expect(
        screen.queryByText('Melhorias Recomendadas'),
      ).not.toBeInTheDocument();
    });
  });
});
