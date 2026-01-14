import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageContainer } from './PageContainer';

describe('PageContainer', () => {
  it('renders children correctly', () => {
    render(
      <PageContainer>
        <div>Test Content</div>
      </PageContainer>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies safe area CSS variables via inline styles', () => {
    const { container } = render(
      <PageContainer>
        <div>Content</div>
      </PageContainer>,
    );

    const pageContainer = container.firstChild as HTMLElement;
    const styles = pageContainer.style;

    // Check that safe area variables are applied
    expect(styles.paddingTop).toBe('var(--padding-safe-top)');
    expect(styles.paddingBottom).toBe('var(--padding-safe-bottom)');
    expect(styles.paddingLeft).toBe('var(--padding-safe-left)');
    expect(styles.paddingRight).toBe('var(--padding-safe-right)');
  });

  it('applies default padding classes', () => {
    const { container } = render(
      <PageContainer>
        <div>Content</div>
      </PageContainer>,
    );

    const pageContainer = container.firstChild as HTMLElement;
    expect(pageContainer.className).toContain('p-4');
    expect(pageContainer.className).toContain('sm:p-6');
    expect(pageContainer.className).toContain('lg:p-8');
  });

  it('applies custom padding when specified', () => {
    const { container } = render(
      <PageContainer padding="sm">
        <div>Content</div>
      </PageContainer>,
    );

    const pageContainer = container.firstChild as HTMLElement;
    expect(pageContainer.className).toContain('p-2');
    expect(pageContainer.className).toContain('sm:p-4');
  });

  it('applies no padding classes when padding="none"', () => {
    const { container } = render(
      <PageContainer padding="none">
        <div>Content</div>
      </PageContainer>,
    );

    const pageContainer = container.firstChild as HTMLElement;
    // Should only use safe area insets, no padding classes
    expect(pageContainer.style.paddingTop).toBe('var(--safe-area-top)');
    expect(pageContainer.className).not.toContain('p-');
  });

  it('applies large padding when padding="lg"', () => {
    const { container } = render(
      <PageContainer padding="lg">
        <div>Content</div>
      </PageContainer>,
    );

    const pageContainer = container.firstChild as HTMLElement;
    expect(pageContainer.className).toContain('p-6');
    expect(pageContainer.className).toContain('sm:p-8');
    expect(pageContainer.className).toContain('lg:p-12');
  });

  it('accepts custom className', () => {
    const { container } = render(
      <PageContainer className="custom-class">
        <div>Content</div>
      </PageContainer>,
    );

    const pageContainer = container.firstChild as HTMLElement;
    expect(pageContainer.className).toContain('custom-class');
  });

  it('has accessible structure with correct ARIA', () => {
    render(
      <PageContainer>
        <h1>Page Title</h1>
        <p>Page content</p>
      </PageContainer>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Page Title',
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});
