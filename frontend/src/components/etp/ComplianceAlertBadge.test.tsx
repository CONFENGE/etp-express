import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComplianceAlertBadge } from './ComplianceAlertBadge';

describe('ComplianceAlertBadge', () => {
  const defaultProps = {
    count: 5,
    countByPriority: {
      high: 2,
      medium: 2,
      low: 1,
    },
    isValidating: false,
  };

  it('should not render when count is 0 and not validating', () => {
    const { container } = render(
      <ComplianceAlertBadge
        count={0}
        countByPriority={{ high: 0, medium: 0, low: 0 }}
        isValidating={false}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when validating even with count 0', () => {
    render(
      <ComplianceAlertBadge
        count={0}
        countByPriority={{ high: 0, medium: 0, low: 0 }}
        isValidating={true}
      />,
    );

    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('should show count number', () => {
    render(<ComplianceAlertBadge {...defaultProps} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show ... when validating', () => {
    render(<ComplianceAlertBadge {...defaultProps} isValidating={true} />);

    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('should have destructive variant when high priority alerts exist', () => {
    const { container } = render(<ComplianceAlertBadge {...defaultProps} />);

    // Badge should have destructive styling
    const badge = container.querySelector('[class*="destructive"]');
    expect(badge).toBeInTheDocument();
  });

  it('should have warning variant when only medium priority alerts', () => {
    const { container } = render(
      <ComplianceAlertBadge
        count={2}
        countByPriority={{ high: 0, medium: 2, low: 0 }}
        isValidating={false}
      />,
    );

    // Badge should have warning styling (bg-yellow-100 class from badge variant)
    const badge = container.querySelector('[class*="bg-yellow"]');
    expect(badge).toBeInTheDocument();
  });

  it('should have secondary variant when only low priority alerts', () => {
    const { container } = render(
      <ComplianceAlertBadge
        count={1}
        countByPriority={{ high: 0, medium: 0, low: 1 }}
        isValidating={false}
      />,
    );

    // Badge should have secondary styling
    const badge = container.querySelector('[class*="secondary"]');
    expect(badge).toBeInTheDocument();
  });

  it('should have pulse animation when high priority alerts exist', () => {
    const { container } = render(<ComplianceAlertBadge {...defaultProps} />);

    const badge = container.querySelector('.animate-pulse');
    expect(badge).toBeInTheDocument();
  });

  it('should not have pulse animation when no high priority alerts', () => {
    const { container } = render(
      <ComplianceAlertBadge
        count={1}
        countByPriority={{ high: 0, medium: 1, low: 0 }}
        isValidating={false}
      />,
    );

    const badge = container.querySelector('.animate-pulse');
    expect(badge).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ComplianceAlertBadge {...defaultProps} className="custom-badge" />,
    );

    expect(container.querySelector('.custom-badge')).toBeInTheDocument();
  });

  it('should have reduced opacity when validating', () => {
    const { container } = render(
      <ComplianceAlertBadge {...defaultProps} isValidating={true} />,
    );

    const badge = container.querySelector('.opacity-60');
    expect(badge).toBeInTheDocument();
  });
});
