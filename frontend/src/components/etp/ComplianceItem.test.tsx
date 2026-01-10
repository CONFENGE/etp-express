import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComplianceItem } from './ComplianceItem';

describe('ComplianceItem', () => {
  const defaultProps = {
    requirement: 'Justificativa da necessidade',
    fixSuggestion: 'Inclua uma justificativa detalhada explicando...',
    priority: 'high' as const,
  };

  it('should render requirement and suggestion', () => {
    render(<ComplianceItem {...defaultProps} />);

    expect(screen.getByText(defaultProps.requirement)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.fixSuggestion)).toBeInTheDocument();
  });

  it('should show high priority badge with correct label', () => {
    render(<ComplianceItem {...defaultProps} priority="high" />);

    expect(screen.getByText('Alta')).toBeInTheDocument();
  });

  it('should show medium priority badge with correct label', () => {
    render(<ComplianceItem {...defaultProps} priority="medium" />);

    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('should show low priority badge with correct label', () => {
    render(<ComplianceItem {...defaultProps} priority="low" />);

    expect(screen.getByText('Baixa')).toBeInTheDocument();
  });

  it('should apply high priority styles', () => {
    const { container } = render(
      <ComplianceItem {...defaultProps} priority="high" />,
    );

    const item = container.firstChild as HTMLElement;
    expect(item).toHaveClass('border-red-200');
    expect(item).toHaveClass('bg-red-50');
  });

  it('should apply medium priority styles', () => {
    const { container } = render(
      <ComplianceItem {...defaultProps} priority="medium" />,
    );

    const item = container.firstChild as HTMLElement;
    expect(item).toHaveClass('border-yellow-200');
    expect(item).toHaveClass('bg-yellow-50');
  });

  it('should apply low priority styles', () => {
    const { container } = render(
      <ComplianceItem {...defaultProps} priority="low" />,
    );

    const item = container.firstChild as HTMLElement;
    expect(item).toHaveClass('border-gray-200');
    expect(item).toHaveClass('bg-gray-50');
  });

  it('should not render fix button when onFix is not provided', () => {
    render(<ComplianceItem {...defaultProps} />);

    expect(
      screen.queryByRole('button', { name: /corrigir/i }),
    ).not.toBeInTheDocument();
  });

  it('should render fix button when onFix is provided', () => {
    const onFix = vi.fn();
    render(<ComplianceItem {...defaultProps} onFix={onFix} />);

    expect(
      screen.getByRole('button', { name: /corrigir/i }),
    ).toBeInTheDocument();
  });

  it('should call onFix when fix button is clicked', async () => {
    const user = userEvent.setup();
    const onFix = vi.fn();
    render(<ComplianceItem {...defaultProps} onFix={onFix} />);

    await user.click(screen.getByRole('button', { name: /corrigir/i }));

    expect(onFix).toHaveBeenCalledTimes(1);
  });

  it('should disable fix button when disabled is true', () => {
    const onFix = vi.fn();
    render(<ComplianceItem {...defaultProps} onFix={onFix} disabled={true} />);

    expect(screen.getByRole('button', { name: /corrigir/i })).toBeDisabled();
  });

  it('should have correct aria-label on fix button', () => {
    const onFix = vi.fn();
    render(<ComplianceItem {...defaultProps} onFix={onFix} />);

    expect(
      screen.getByRole('button', {
        name: `Corrigir: ${defaultProps.requirement}`,
      }),
    ).toBeInTheDocument();
  });

  it('should render with role listitem for accessibility', () => {
    render(<ComplianceItem {...defaultProps} />);

    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });
});
