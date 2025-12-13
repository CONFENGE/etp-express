import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlusCircle } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  describe('rendering', () => {
    it('renders with documents type illustration', () => {
      render(
        <EmptyState
          type="documents"
          title="No documents"
          description="Create your first document"
        />,
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('No documents')).toBeInTheDocument();
      expect(
        screen.getByText('Create your first document'),
      ).toBeInTheDocument();
    });

    it('renders with search type illustration', () => {
      render(
        <EmptyState
          type="search"
          title="No results found"
          description="Try adjusting your search"
        />,
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
    });

    it('renders with welcome type illustration', () => {
      render(
        <EmptyState
          type="welcome"
          title="Welcome!"
          description="Get started with your first project"
        />,
      );

      expect(screen.getByText('Welcome!')).toBeInTheDocument();
      expect(
        screen.getByText('Get started with your first project'),
      ).toBeInTheDocument();
    });

    it('renders with custom illustration', () => {
      const CustomIllustration = () => (
        <div data-testid="custom-illustration">Custom</div>
      );

      render(
        <EmptyState
          type="custom"
          title="Custom state"
          illustration={<CustomIllustration />}
        />,
      );

      expect(screen.getByTestId('custom-illustration')).toBeInTheDocument();
      expect(screen.getByText('Custom state')).toBeInTheDocument();
    });

    it('renders without description when not provided', () => {
      render(<EmptyState type="documents" title="No documents" />);

      expect(screen.getByText('No documents')).toBeInTheDocument();
      expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
    });
  });

  describe('action button', () => {
    it('renders action button when provided', () => {
      const handleClick = vi.fn();

      render(
        <EmptyState
          type="documents"
          title="No documents"
          action={{
            label: 'Create Document',
            onClick: handleClick,
          }}
        />,
      );

      const button = screen.getByRole('button', { name: 'Create Document' });
      expect(button).toBeInTheDocument();
    });

    it('calls onClick when action button is clicked', () => {
      const handleClick = vi.fn();

      render(
        <EmptyState
          type="documents"
          title="No documents"
          action={{
            label: 'Create Document',
            onClick: handleClick,
          }}
        />,
      );

      const button = screen.getByRole('button', { name: 'Create Document' });
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders action button with icon when provided', () => {
      render(
        <EmptyState
          type="documents"
          title="No documents"
          action={{
            label: 'Create Document',
            onClick: vi.fn(),
            icon: PlusCircle,
          }}
        />,
      );

      const button = screen.getByRole('button', { name: 'Create Document' });
      expect(button).toBeInTheDocument();
      // Icon is rendered inside the button
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('does not render action button when not provided', () => {
      render(<EmptyState type="documents" title="No documents" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders action button with custom variant', () => {
      render(
        <EmptyState
          type="documents"
          title="No documents"
          action={{
            label: 'Create Document',
            onClick: vi.fn(),
            variant: 'outline',
          }}
        />,
      );

      const button = screen.getByRole('button', { name: 'Create Document' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('renders with small size', () => {
      const { container } = render(
        <EmptyState type="documents" title="No documents" size="sm" />,
      );

      // Check that SVG has the small size class
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-32', 'h-32');
    });

    it('renders with medium size (default)', () => {
      const { container } = render(
        <EmptyState type="documents" title="No documents" />,
      );

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-48', 'h-48');
    });

    it('renders with large size', () => {
      const { container } = render(
        <EmptyState type="documents" title="No documents" size="lg" />,
      );

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-64', 'h-64');
    });
  });

  describe('accessibility', () => {
    it('has role="status" for screen readers', () => {
      render(<EmptyState type="documents" title="No documents" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label with the title', () => {
      render(<EmptyState type="documents" title="No documents" />);

      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'No documents',
      );
    });

    it('illustrations have aria-hidden="true"', () => {
      const { container } = render(
        <EmptyState type="documents" title="No documents" />,
      );

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      render(
        <EmptyState
          type="documents"
          title="No documents"
          className="custom-class"
        />,
      );

      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });

    it('has centered text alignment', () => {
      render(<EmptyState type="documents" title="No documents" />);

      expect(screen.getByRole('status')).toHaveClass('text-center');
    });
  });
});
