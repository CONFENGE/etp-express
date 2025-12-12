import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  LoadingState,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonStats,
  SkeletonRecentItems,
  SkeletonDashboard,
  SkeletonETPGrid,
} from './LoadingState';

describe('LoadingState', () => {
  describe('LoadingState (Spinner)', () => {
    it('should render with default message', () => {
      render(<LoadingState />);

      expect(screen.getByRole('status')).toHaveTextContent('Carregando...');
    });

    it('should render with custom message', () => {
      render(<LoadingState message="Carregando ETPs..." />);

      expect(screen.getByRole('status')).toHaveTextContent(
        'Carregando ETPs...',
      );
    });

    it('should render with no message when empty string', () => {
      render(<LoadingState message="" />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should apply size sm classes', () => {
      const { container } = render(<LoadingState size="sm" />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('should apply size md classes (default)', () => {
      const { container } = render(<LoadingState />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('should apply size lg classes', () => {
      const { container } = render(<LoadingState size="lg" />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-12', 'w-12');
    });

    it('should apply custom className', () => {
      const { container } = render(<LoadingState className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should have aria-hidden on spinner icon', () => {
      const { container } = render(<LoadingState />);

      const spinner = container.querySelector('svg');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('SkeletonCard', () => {
    it('should render skeleton card', () => {
      render(<SkeletonCard />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading card')).toBeInTheDocument();
    });

    it('should have correct structure with skeleton elements', () => {
      const { container } = render(<SkeletonCard />);

      // Check for skeleton divs (animate-pulse)
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });

    it('should have border and card styling', () => {
      const { container } = render(<SkeletonCard />);

      expect(container.firstChild).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
      );
    });
  });

  describe('SkeletonList', () => {
    it('should render with default count of 3', () => {
      render(<SkeletonList />);

      const cards = screen.getAllByLabelText('Loading card');
      expect(cards).toHaveLength(3);
    });

    it('should render with custom count', () => {
      render(<SkeletonList count={5} />);

      const cards = screen.getAllByLabelText('Loading card');
      expect(cards).toHaveLength(5);
    });

    it('should have accessibility label', () => {
      render(<SkeletonList />);

      expect(screen.getByLabelText('Loading list')).toBeInTheDocument();
    });
  });

  describe('SkeletonTable', () => {
    it('should render with default rows and cols', () => {
      render(<SkeletonTable />);

      expect(screen.getByLabelText('Loading table')).toBeInTheDocument();
    });

    it('should render correct number of rows', () => {
      const { container } = render(<SkeletonTable rows={3} cols={4} />);

      // Header + 3 rows = 4 row containers, but we check the divide-y children
      const rowsContainer = container.querySelector('.divide-y');
      expect(rowsContainer?.children).toHaveLength(3);
    });

    it('should render header row', () => {
      const { container } = render(<SkeletonTable cols={4} />);

      const header = container.querySelector('.bg-muted\\/50');
      expect(header).toBeInTheDocument();
    });

    it('should have proper structure', () => {
      const { container } = render(<SkeletonTable />);

      expect(container.firstChild).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
        'overflow-hidden',
      );
    });
  });

  describe('SkeletonStats', () => {
    it('should render with default count of 3', () => {
      render(<SkeletonStats />);

      expect(screen.getByLabelText('Loading statistics')).toBeInTheDocument();
    });

    it('should render correct number of stat cards', () => {
      const { container } = render(<SkeletonStats count={4} />);

      const cards = container.querySelectorAll('.rounded-lg.border.bg-card');
      expect(cards).toHaveLength(4);
    });

    it('should have grid layout', () => {
      const { container } = render(<SkeletonStats />);

      expect(container.firstChild).toHaveClass(
        'grid',
        'gap-4',
        'md:grid-cols-3',
      );
    });
  });

  describe('SkeletonRecentItems', () => {
    it('should render with default count of 5', () => {
      const { container } = render(<SkeletonRecentItems />);

      expect(screen.getByLabelText('Loading recent items')).toBeInTheDocument();
      const items = container.querySelectorAll('.p-4.rounded-lg.border');
      expect(items).toHaveLength(5);
    });

    it('should render with custom count', () => {
      const { container } = render(<SkeletonRecentItems count={3} />);

      const items = container.querySelectorAll('.p-4.rounded-lg.border');
      expect(items).toHaveLength(3);
    });

    it('should have flex layout for each item', () => {
      const { container } = render(<SkeletonRecentItems count={1} />);

      const item = container.querySelector('.p-4.rounded-lg.border');
      expect(item).toHaveClass('flex', 'items-start', 'justify-between');
    });
  });

  describe('SkeletonDashboard', () => {
    it('should render dashboard skeleton', () => {
      render(<SkeletonDashboard />);

      expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();
    });

    it('should contain stats and recent items skeletons', () => {
      render(<SkeletonDashboard />);

      expect(screen.getByLabelText('Loading statistics')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading recent items')).toBeInTheDocument();
    });

    it('should have proper spacing', () => {
      const { container } = render(<SkeletonDashboard />);

      expect(container.firstChild).toHaveClass('space-y-8');
    });
  });

  describe('SkeletonETPGrid', () => {
    it('should render with default count of 6', () => {
      const { container } = render(<SkeletonETPGrid />);

      expect(screen.getByLabelText('Loading ETPs')).toBeInTheDocument();
      const cards = container.querySelectorAll(
        '.rounded-lg.border.bg-card.p-6.space-y-4',
      );
      expect(cards).toHaveLength(6);
    });

    it('should render with custom count', () => {
      const { container } = render(<SkeletonETPGrid count={3} />);

      const cards = container.querySelectorAll(
        '.rounded-lg.border.bg-card.p-6.space-y-4',
      );
      expect(cards).toHaveLength(3);
    });

    it('should have grid layout with responsive columns', () => {
      const { container } = render(<SkeletonETPGrid />);

      expect(container.firstChild).toHaveClass(
        'grid',
        'gap-4',
        'md:grid-cols-2',
        'lg:grid-cols-3',
      );
    });

    it('should contain skeleton elements for title, badge, description, progress', () => {
      const { container } = render(<SkeletonETPGrid count={1} />);

      // Each card should have multiple skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Accessibility', () => {
    it('LoadingState should have role status for message', () => {
      render(<LoadingState message="Loading..." />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('SkeletonCard should have role status', () => {
      render(<SkeletonCard />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('SkeletonList should have role status', () => {
      render(<SkeletonList />);

      // Multiple roles from nested components, check main container
      expect(screen.getByLabelText('Loading list')).toHaveAttribute(
        'role',
        'status',
      );
    });

    it('SkeletonTable should have role status', () => {
      render(<SkeletonTable />);

      expect(screen.getByLabelText('Loading table')).toHaveAttribute(
        'role',
        'status',
      );
    });

    it('SkeletonStats should have role status', () => {
      render(<SkeletonStats />);

      expect(screen.getByLabelText('Loading statistics')).toHaveAttribute(
        'role',
        'status',
      );
    });

    it('SkeletonDashboard should have role status', () => {
      render(<SkeletonDashboard />);

      expect(screen.getByLabelText('Loading dashboard')).toHaveAttribute(
        'role',
        'status',
      );
    });

    it('SkeletonETPGrid should have role status', () => {
      render(<SkeletonETPGrid />);

      expect(screen.getByLabelText('Loading ETPs')).toHaveAttribute(
        'role',
        'status',
      );
    });
  });
});
