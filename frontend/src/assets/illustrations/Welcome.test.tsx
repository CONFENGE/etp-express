import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Welcome } from './Welcome';

describe('Welcome', () => {
  it('renders without crashing', () => {
    const { container } = render(<Welcome />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Welcome className="custom-class" />);
    expect(container.querySelector('svg')).toHaveClass('custom-class');
  });

  it('has aria-hidden for accessibility', () => {
    const { container } = render(<Welcome />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('has correct viewBox', () => {
    const { container } = render(<Welcome />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 200 160',
    );
  });

  it('passes additional SVG props', () => {
    const { container } = render(<Welcome data-testid="test-svg" />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'data-testid',
      'test-svg',
    );
  });

  it('contains clipboard elements', () => {
    const { container } = render(<Welcome />);
    // Should have rects for the clipboard
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(5);
  });

  it('contains checklist checkmarks', () => {
    const { container } = render(<Welcome />);
    // Should have paths for the checkmarks
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(2);
  });

  it('contains sparkle decorations', () => {
    const { container } = render(<Welcome />);
    // Should have circles for sparkles
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(1);
  });
});
