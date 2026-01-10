import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComplianceScorecard } from './ComplianceScorecard';
import type { ComplianceScoreSummary } from '@/types/compliance';

// Mock the compliance hook
vi.mock('@/hooks/useComplianceValidation', () => ({
  useComplianceValidation: vi.fn(),
}));

import { useComplianceValidation } from '@/hooks/useComplianceValidation';

describe('ComplianceScorecard', () => {
  const mockScoreSummary: ComplianceScoreSummary = {
    score: 75,
    passed: true,
    status: 'APPROVED',
    totalItems: 20,
    passedItems: 15,
    failedItems: 5,
    topIssues: [
      {
        requirement: 'Justificativa da necessidade',
        fixSuggestion: 'Inclua uma justificativa detalhada...',
        priority: 'high',
      },
      {
        requirement: 'Analise de riscos',
        fixSuggestion: 'Adicione analise de riscos...',
        priority: 'medium',
      },
    ],
  };

  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  it('should render loading state when isLoading is true and no data', () => {
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    expect(screen.getByText('Conformidade TCU')).toBeInTheDocument();
    // Skeleton should be rendered (data-testid or specific class)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render error state when error is present and no data', () => {
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Erro ao carregar',
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /tentar novamente/i }),
    ).toBeInTheDocument();
  });

  it('should call refetch when retry button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Erro ao carregar',
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    await user.click(
      screen.getByRole('button', { name: /tentar novamente/i }),
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should render no data state when data is null', () => {
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    expect(
      screen.getByText('Salve o ETP para verificar conformidade'),
    ).toBeInTheDocument();
  });

  it('should render score and status when data is available', () => {
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: mockScoreSummary,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
    expect(screen.getByText('15/20 itens conformes')).toBeInTheDocument();
  });

  it('should show NEEDS_REVIEW status correctly', () => {
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: { ...mockScoreSummary, status: 'NEEDS_REVIEW', passed: false },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    expect(screen.getByText('Revisao Necessaria')).toBeInTheDocument();
  });

  it('should show REJECTED status correctly', () => {
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: { ...mockScoreSummary, status: 'REJECTED', passed: false },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    expect(screen.getByText('Pendencias')).toBeInTheDocument();
  });

  it('should display collapsible issues list', async () => {
    const user = userEvent.setup();
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: mockScoreSummary,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    // Issues should be collapsed initially
    expect(screen.getByText('5 itens pendentes')).toBeInTheDocument();
    expect(
      screen.queryByText('Justificativa da necessidade'),
    ).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByText('5 itens pendentes'));

    // Now issues should be visible
    await waitFor(() => {
      expect(
        screen.getByText('Justificativa da necessidade'),
      ).toBeInTheDocument();
      expect(screen.getByText('Analise de riscos')).toBeInTheDocument();
    });
  });

  it('should call onNavigateToSection when fix button is clicked', async () => {
    const user = userEvent.setup();
    const onNavigateToSection = vi.fn();
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: mockScoreSummary,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(
      <ComplianceScorecard
        etpId="test-id"
        onNavigateToSection={onNavigateToSection}
      />,
    );

    // Expand issues
    await user.click(screen.getByText('5 itens pendentes'));

    // Click fix button on first issue
    await waitFor(async () => {
      const fixButtons = screen.getAllByRole('button', { name: /corrigir/i });
      await user.click(fixButtons[0]);
    });

    expect(onNavigateToSection).toHaveBeenCalledWith('1');
  });

  it('should show success message when all items passed', () => {
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: {
        ...mockScoreSummary,
        passed: true,
        failedItems: 0,
        passedItems: 20,
        topIssues: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    expect(
      screen.getByText('Todos os requisitos atendidos!'),
    ).toBeInTheDocument();
  });

  it('should call refetch when refresh button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: mockScoreSummary,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    await user.click(
      screen.getByRole('button', { name: /atualizar conformidade/i }),
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should show spinning icon when loading', () => {
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: mockScoreSummary,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    const refreshButton = screen.getByRole('button', {
      name: /atualizar conformidade/i,
    });
    const icon = refreshButton.querySelector('svg');
    expect(icon).toHaveClass('animate-spin');
  });

  it('should display count of additional issues when more than 3', () => {
    const manyIssues: ComplianceScoreSummary = {
      ...mockScoreSummary,
      failedItems: 7,
      topIssues: [
        {
          requirement: 'Issue 1',
          fixSuggestion: 'Fix 1',
          priority: 'high',
        },
        {
          requirement: 'Issue 2',
          fixSuggestion: 'Fix 2',
          priority: 'medium',
        },
        {
          requirement: 'Issue 3',
          fixSuggestion: 'Fix 3',
          priority: 'low',
        },
      ],
    };

    vi.mocked(useComplianceValidation).mockReturnValue({
      data: manyIssues,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ComplianceScorecard etpId="test-id" />);

    // Expand to see the additional issues message
    userEvent.click(screen.getByText('7 itens pendentes'));

    // Check for additional issues text (failedItems - topIssues.length)
    waitFor(() => {
      expect(screen.getByText('+4 outros itens pendentes')).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    vi.mocked(useComplianceValidation).mockReturnValue({
      data: mockScoreSummary,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = render(
      <ComplianceScorecard etpId="test-id" className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
