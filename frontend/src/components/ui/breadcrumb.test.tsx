import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Breadcrumb, type BreadcrumbItem } from './breadcrumb';

// Wrapper to provide router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Breadcrumb', () => {
  describe('rendering', () => {
    it('should render nothing when items array is empty', () => {
      const { container } = renderWithRouter(<Breadcrumb items={[]} />);
      expect(container.querySelector('nav')).toBeNull();
    });

    it('should render breadcrumb items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
        { label: 'Details' },
      ];

      renderWithRouter(<Breadcrumb items={items} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('should render home icon by default', () => {
      const items: BreadcrumbItem[] = [{ label: 'Page' }];

      renderWithRouter(<Breadcrumb items={items} />);

      const homeLink = screen.getByLabelText('Início');
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/dashboard');
    });

    it('should hide home icon when showHome is false', () => {
      const items: BreadcrumbItem[] = [{ label: 'Page' }];

      renderWithRouter(<Breadcrumb items={items} showHome={false} />);

      expect(screen.queryByLabelText('Início')).toBeNull();
    });

    it('should use custom home path', () => {
      const items: BreadcrumbItem[] = [{ label: 'Page' }];

      renderWithRouter(<Breadcrumb items={items} homePath="/custom" />);

      const homeLink = screen.getByLabelText('Início');
      expect(homeLink).toHaveAttribute('href', '/custom');
    });
  });

  describe('links', () => {
    it('should render links for items with href', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Parent', href: '/parent' },
        { label: 'Current' },
      ];

      renderWithRouter(<Breadcrumb items={items} />);

      const parentLink = screen.getByRole('link', { name: 'Parent' });
      expect(parentLink).toHaveAttribute('href', '/parent');
    });

    it('should render last item as static text (no link)', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Parent', href: '/parent' },
        { label: 'Current' },
      ];

      renderWithRouter(<Breadcrumb items={items} />);

      // Last item should be a span, not a link
      const currentItem = screen.getByText('Current');
      expect(currentItem.tagName).toBe('SPAN');
      expect(currentItem).not.toHaveAttribute('href');
    });

    it('should render last item without link even if href is provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Parent', href: '/parent' },
        { label: 'Current', href: '/current' },
      ];

      renderWithRouter(<Breadcrumb items={items} />);

      // Last item should be span (current page), not a link
      const currentItem = screen.getByText('Current');
      expect(currentItem.tagName).toBe('SPAN');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label on nav', () => {
      const items: BreadcrumbItem[] = [{ label: 'Page' }];

      renderWithRouter(<Breadcrumb items={items} />);

      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(nav).toBeInTheDocument();
    });

    it('should mark current page with aria-current', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Parent', href: '/parent' },
        { label: 'Current' },
      ];

      renderWithRouter(<Breadcrumb items={items} />);

      const currentItem = screen.getByText('Current');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
    });

    it('should not have aria-current on non-current items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Parent', href: '/parent' },
        { label: 'Current' },
      ];

      renderWithRouter(<Breadcrumb items={items} />);

      const parentLink = screen.getByRole('link', { name: 'Parent' });
      expect(parentLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('styling', () => {
    it('should accept custom className', () => {
      const items: BreadcrumbItem[] = [{ label: 'Page' }];

      renderWithRouter(<Breadcrumb items={items} className="custom-class" />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('custom-class');
    });

    it('should render separators between items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'First', href: '/first' },
        { label: 'Second', href: '/second' },
        { label: 'Third' },
      ];

      const { container } = renderWithRouter(<Breadcrumb items={items} />);

      // ChevronRight icons are used as separators
      const separators = container.querySelectorAll('svg.lucide-chevron-right');
      expect(separators.length).toBe(3); // One for each item (after home + 3 items)
    });
  });

  describe('truncation', () => {
    it('should have title attribute for truncated items', () => {
      const longLabel =
        'This is a very long breadcrumb label that should be truncated';
      const items: BreadcrumbItem[] = [{ label: longLabel }];

      renderWithRouter(<Breadcrumb items={items} />);

      const item = screen.getByText(longLabel);
      expect(item).toHaveAttribute('title', longLabel);
    });
  });
});
