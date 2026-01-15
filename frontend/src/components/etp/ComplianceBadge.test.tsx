import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComplianceBadge } from './ComplianceBadge';
import type { ComplianceScoreSummary } from '@/types/compliance';

// Mock the compliance hook
vi.mock('@/hooks/useComplianceValidation', () => ({
  useComplianceValidation: vi.fn(),
}));

import { useComplianceValidation } from '@/hooks/useComplianceValidation';

describe('ComplianceBadge', () => {
  const mockScoreSummaryApproved: ComplianceScoreSummary = {
    score: 95,
    passed: true,
    status: 'APPROVED',
    totalItems: 20,
    passedItems: 19,
    failedItems: 1,
    topIssues: [
      {
        requirement: 'Analise de riscos',
        fixSuggestion: 'Adicione analise de riscos detalhada',
        priority: 'low',
      },
    ],
  };

  const mockScoreSummaryNeedsReview: ComplianceScoreSummary = {
    score: 75,
    passed: true,
    status: 'NEEDS_REVIEW',
    totalItems: 20,
    passedItems: 15,
    failedItems: 5,
    topIssues: [
      {
        requirement: 'Justificativa da necessidade',
        fixSuggestion: 'Inclua uma justificativa detalhada',
        priority: 'high',
      },
      {
        requirement: 'Analise de riscos',
        fixSuggestion: 'Adicione analise de riscos',
        priority: 'medium',
      },
    ],
  };

  const mockScoreSummaryRejected: ComplianceScoreSummary = {
    score: 35,
    passed: false,
    status: 'REJECTED',
    totalItems: 20,
    passedItems: 7,
    failedItems: 13,
    topIssues: [
      {
        requirement: 'Justificativa da necessidade',
        fixSuggestion: 'Campo obrigatorio',
        priority: 'high',
      },
      {
        requirement: 'Estimativa de valor',
        fixSuggestion: 'Inclua pesquisa de precos',
        priority: 'high',
      },
      {
        requirement: 'Analise de riscos',
        fixSuggestion: 'Campo obrigatorio',
        priority: 'high',
      },
    ],
  };

  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  describe('Loading state', () => {
    it('should render skeleton when loading and no data', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" />);

      // Skeleton should be rendered
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should render neutral badge when error is present', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: null,
        isLoading: false,
        error: 'Erro ao carregar',
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" />);

      expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('should render neutral badge when data is null', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" />);

      expect(screen.getByText('--')).toBeInTheDocument();
    });
  });

  describe('Approved state (score >= 90)', () => {
    it('should render green badge with score', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryApproved,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore />);

      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should render label when showScore is false', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryApproved,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore={false} />);

      expect(screen.getByText('Aprovado')).toBeInTheDocument();
    });
  });

  describe('Needs Review state (score 70-89)', () => {
    it('should render yellow badge with score', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryNeedsReview,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should render label when showScore is false', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryNeedsReview,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore={false} />);

      expect(screen.getByText('Ressalvas')).toBeInTheDocument();
    });
  });

  describe('Attention state (score 50-69)', () => {
    it('should render attention badge', () => {
      const attentionData: ComplianceScoreSummary = {
        ...mockScoreSummaryNeedsReview,
        score: 55,
        passed: false,
        status: 'NEEDS_REVIEW',
      };

      vi.mocked(useComplianceValidation).mockReturnValue({
        data: attentionData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore={false} />);

      expect(screen.getByText('Atencao')).toBeInTheDocument();
    });
  });

  describe('Rejected state (score < 50)', () => {
    it('should render red badge with score', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryRejected,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore />);

      expect(screen.getByText('35%')).toBeInTheDocument();
    });

    it('should render label when showScore is false', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryRejected,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore={false} />);

      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip on hover when showTooltip is true', async () => {
      const user = userEvent.setup();
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryNeedsReview,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore showTooltip />);

      const badge = screen.getByText('75%');
      await user.hover(badge);

      // Wait for tooltip to appear
      expect(await screen.findByText('Ressalvas')).toBeInTheDocument();
      expect(
        await screen.findByText('ETP aprovado com ressalvas'),
      ).toBeInTheDocument();
    });

    it('should show issues in tooltip', async () => {
      const user = userEvent.setup();
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryNeedsReview,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore showTooltip />);

      const badge = screen.getByText('75%');
      await user.hover(badge);

      // Check for issues in tooltip
      expect(
        await screen.findByText('Principais pendencias:'),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('Justificativa da necessidade'),
      ).toBeInTheDocument();
    });

    it('should show all passed message when no issues', async () => {
      const user = userEvent.setup();
      const passedData: ComplianceScoreSummary = {
        ...mockScoreSummaryApproved,
        failedItems: 0,
        passedItems: 20,
        topIssues: [],
      };

      vi.mocked(useComplianceValidation).mockReturnValue({
        data: passedData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore showTooltip />);

      const badge = screen.getByText('95%');
      await user.hover(badge);

      expect(
        await screen.findByText('Todos os requisitos atendidos!'),
      ).toBeInTheDocument();
    });

    it('should not show tooltip when showTooltip is false', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryNeedsReview,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showScore showTooltip={false} />);

      // Badge should render without TooltipProvider wrapper
      expect(screen.getByText('75%')).toBeInTheDocument();
      // No tooltip elements should exist
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Size variants', () => {
    it('should apply small size class when size is sm', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryApproved,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" size="sm" showTooltip={false} />);

      const badge = screen.getByText('95%').closest('div');
      expect(badge).toHaveClass('text-xs');
    });

    it('should apply default size when size is md', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryApproved,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" size="md" showTooltip={false} />);

      const badge = screen.getByText('95%').closest('div');
      expect(badge).not.toHaveClass('text-xs');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label with compliance information', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryApproved,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" showTooltip={false} />);

      const badge = screen.getByText('95%').closest('div');
      expect(badge).toHaveAttribute(
        'aria-label',
        'Conformidade TCU: 95% - Aprovado',
      );
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to badge', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryApproved,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <ComplianceBadge
          etpId="test-id"
          className="custom-class"
          showTooltip={false}
        />,
      );

      const badge = screen.getByText('95%').closest('div');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('Hook configuration', () => {
    it('should disable polling for badge performance', () => {
      vi.mocked(useComplianceValidation).mockReturnValue({
        data: mockScoreSummaryApproved,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ComplianceBadge etpId="test-id" />);

      expect(useComplianceValidation).toHaveBeenCalledWith('test-id', {
        enablePolling: false,
        refetchInterval: 0,
      });
    });
  });
});
