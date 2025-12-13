import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NoResults } from './NoResults';

describe('NoResults', () => {
  it('renders without crashing', () => {
    const { container } = render(<NoResults />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<NoResults className="custom-class" />);
    expect(container.querySelector('svg')).toHaveClass('custom-class');
  });

  it('has aria-hidden for accessibility', () => {
    const { container } = render(<NoResults />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('has correct viewBox', () => {
    const { container } = render(<NoResults />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 200 160',
    );
  });

  it('passes additional SVG props', () => {
    const { container } = render(<NoResults data-testid="test-svg" />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'data-testid',
      'test-svg',
    );
  });

  it('contains magnifying glass elements', () => {
    const { container } = render(<NoResults />);
    // Should have circles for the magnifying glass
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(2);
  });

  it('contains X mark for no results', () => {
    const { container } = render(<NoResults />);
    // Should have a path for the X mark
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });
});
