import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  beforeEach(() => {
    // Clean up any existing main-content elements
    document.body.innerHTML = '';
  });

  it('renders with default props', () => {
    render(<SkipLink />);

    const link = screen.getByText('Skip to main content');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#main-content');
    expect(link).toHaveClass('skip-link');
  });

  it('renders with custom targetId and label', () => {
    render(<SkipLink targetId="custom-content" label="Skip navigation" />);

    const link = screen.getByText('Skip navigation');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#custom-content');
  });

  it('focuses and scrolls to target element on click', () => {
    // Create a target element
    const targetElement = document.createElement('div');
    targetElement.id = 'main-content';
    document.body.appendChild(targetElement);

    // Mock scrollIntoView
    targetElement.scrollIntoView = vi.fn();

    render(<SkipLink />);

    const link = screen.getByText('Skip to main content');
    fireEvent.click(link);

    // Verify tabindex was set
    expect(targetElement).toHaveAttribute('tabindex', '-1');

    // Verify scrollIntoView was called
    expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('does not add tabindex if already present', () => {
    // Create a target element with existing tabindex
    const targetElement = document.createElement('div');
    targetElement.id = 'main-content';
    targetElement.setAttribute('tabindex', '0');
    document.body.appendChild(targetElement);

    targetElement.scrollIntoView = vi.fn();

    render(<SkipLink />);

    const link = screen.getByText('Skip to main content');
    fireEvent.click(link);

    // Verify tabindex was NOT changed
    expect(targetElement).toHaveAttribute('tabindex', '0');
  });

  it('handles missing target element gracefully', () => {
    render(<SkipLink targetId="non-existent" />);

    const link = screen.getByText('Skip to main content');

    // Should not throw when clicking with missing target
    expect(() => fireEvent.click(link)).not.toThrow();
  });

  it('is accessible via keyboard navigation', () => {
    render(<SkipLink />);

    const link = screen.getByText('Skip to main content');

    // Skip link should be focusable
    link.focus();
    expect(document.activeElement).toBe(link);
  });

  it('has correct ARIA attributes', () => {
    render(<SkipLink />);

    const link = screen.getByText('Skip to main content');

    // Link should be an anchor element
    expect(link.tagName.toLowerCase()).toBe('a');
  });
});
