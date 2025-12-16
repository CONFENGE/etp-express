import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreCard, type ScoreCardProps } from './ScoreCard';
import type {
  AnalysisDimension,
  IssueSummary,
  DocumentInfo,
} from '@/types/analysis';

describe('ScoreCard', () => {
  const defaultDimensions: AnalysisDimension[] = [
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

  const defaultProps: ScoreCardProps = {
    overallScore: 78,
    meetsMinimumQuality: true,
    verdict: 'Aprovado com ressalvas',
    dimensions: defaultDimensions,
    issueSummary: defaultIssueSummary,
    documentInfo: defaultDocumentInfo,
  };

  describe('Rendering', () => {
    it('renders the overall score', () => {
      render(<ScoreCard {...defaultProps} />);

      expect(screen.getByText('78')).toBeInTheDocument();
      expect(screen.getByText('de 100')).toBeInTheDocument();
    });

    it('renders the verdict badge', () => {
      render(<ScoreCard {...defaultProps} />);

      expect(screen.getByText('Aprovado com ressalvas')).toBeInTheDocument();
    });

    it('renders all dimension scores', () => {
      render(<ScoreCard {...defaultProps} />);

      expect(screen.getByText('Conformidade Legal')).toBeInTheDocument();
      expect(screen.getByText('Clareza e Legibilidade')).toBeInTheDocument();
      expect(
        screen.getByText('Qualidade da Fundamentação'),
      ).toBeInTheDocument();

      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('82%')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('renders issue summary counts', () => {
      render(<ScoreCard {...defaultProps} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Críticos')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Importantes')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Sugestões')).toBeInTheDocument();
    });

    it('renders document info', () => {
      render(<ScoreCard {...defaultProps} />);

      expect(screen.getByText(/1\.500 palavras/)).toBeInTheDocument();
      expect(screen.getByText('8 seções')).toBeInTheDocument();
    });

    it('renders filename when provided', () => {
      render(<ScoreCard {...defaultProps} filename="documento.pdf" />);

      expect(screen.getByText('documento.pdf')).toBeInTheDocument();
    });
  });

  describe('Quality Indicator', () => {
    it('shows positive indicator when meets minimum quality', () => {
      render(<ScoreCard {...defaultProps} meetsMinimumQuality={true} />);

      expect(screen.getByText('Atende qualidade mínima')).toBeInTheDocument();
    });

    it('shows negative indicator when does not meet minimum quality', () => {
      render(<ScoreCard {...defaultProps} meetsMinimumQuality={false} />);

      expect(
        screen.getByText('Não atende qualidade mínima'),
      ).toBeInTheDocument();
    });
  });

  describe('Verdict Display', () => {
    it('displays Aprovado verdict correctly', () => {
      render(<ScoreCard {...defaultProps} verdict="Aprovado" />);

      expect(screen.getByText('Aprovado')).toBeInTheDocument();
    });

    it('displays Aprovado com ressalvas verdict correctly', () => {
      render(<ScoreCard {...defaultProps} verdict="Aprovado com ressalvas" />);

      expect(screen.getByText('Aprovado com ressalvas')).toBeInTheDocument();
    });

    it('displays Reprovado verdict correctly', () => {
      render(<ScoreCard {...defaultProps} verdict="Reprovado" />);

      expect(screen.getByText('Reprovado')).toBeInTheDocument();
    });
  });

  describe('Score Colors', () => {
    it('applies green color for high scores (>=80)', () => {
      render(<ScoreCard {...defaultProps} overallScore={85} />);

      const scoreElement = screen.getByText('85');
      expect(scoreElement).toHaveClass('text-green-600');
    });

    it('applies yellow color for medium scores (60-79)', () => {
      render(<ScoreCard {...defaultProps} overallScore={65} />);

      const scoreElement = screen.getByText('65');
      expect(scoreElement).toHaveClass('text-yellow-600');
    });

    it('applies red color for low scores (<60)', () => {
      render(<ScoreCard {...defaultProps} overallScore={45} />);

      const scoreElement = screen.getByText('45');
      expect(scoreElement).toHaveClass('text-red-600');
    });
  });

  describe('Accessibility', () => {
    it('renders progress bars with proper accessibility attributes', () => {
      render(<ScoreCard {...defaultProps} />);

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBe(3);

      progressBars.forEach((bar) => {
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
      });
    });

    it('provides score label for screen readers', () => {
      render(<ScoreCard {...defaultProps} />);

      expect(screen.getByLabelText('Pontuação: 78 de 100')).toBeInTheDocument();
    });
  });

  describe('Dimension Indicators', () => {
    it('shows check icon for passed dimensions', () => {
      render(<ScoreCard {...defaultProps} />);

      // All default dimensions pass, so we should have check icons
      const checkIcons = screen.getAllByLabelText('Aprovado');
      expect(checkIcons.length).toBe(3);
    });

    it('shows warning icon for failed dimensions', () => {
      const failedDimensions: AnalysisDimension[] = [
        { dimension: 'legal', score: 55, passed: false },
        { dimension: 'clareza', score: 82, passed: true },
        { dimension: 'fundamentacao', score: 50, passed: false },
      ];

      render(<ScoreCard {...defaultProps} dimensions={failedDimensions} />);

      const warningIcons = screen.getAllByLabelText('Atenção necessária');
      expect(warningIcons.length).toBe(2);
    });
  });
});
