import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyDocuments } from './EmptyDocuments';

describe('EmptyDocuments', () => {
  it('renders without crashing', () => {
    const { container } = render(<EmptyDocuments />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EmptyDocuments className="custom-class" />);
    expect(container.querySelector('svg')).toHaveClass('custom-class');
  });

  it('has aria-hidden for accessibility', () => {
    const { container } = render(<EmptyDocuments />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('has correct viewBox', () => {
    const { container } = render(<EmptyDocuments />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 200 160',
    );
  });

  it('passes additional SVG props', () => {
    const { container } = render(<EmptyDocuments data-testid="test-svg" />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'data-testid',
      'test-svg',
    );
  });

  it('contains document elements', () => {
    const { container } = render(<EmptyDocuments />);
    // Should have multiple rect elements for the document stack
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(3);
  });

  it('contains plus icon for empty state', () => {
    const { container } = render(<EmptyDocuments />);
    // Should have a path for the plus sign
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });
});
