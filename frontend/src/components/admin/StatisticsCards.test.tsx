import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatisticsCards } from './StatisticsCards';
import { GlobalStatistics } from '@/store/adminStore';

describe('StatisticsCards', () => {
  const mockStatistics: GlobalStatistics = {
    totalDomains: 10,
    activeDomains: 8,
    totalUsers: 100,
    activeUsers: 85,
  };

  describe('Rendering with data', () => {
    it('should render 4 statistics cards', () => {
      render(<StatisticsCards statistics={mockStatistics} loading={false} />);

      expect(screen.getByText('Total Domains')).toBeInTheDocument();
      expect(screen.getByText('Active Domains')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    it('should display correct statistics values', () => {
      render(<StatisticsCards statistics={mockStatistics} loading={false} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('should display card descriptions', () => {
      render(<StatisticsCards statistics={mockStatistics} loading={false} />);

      expect(screen.getByText('Registered domains')).toBeInTheDocument();
      expect(screen.getByText('Currently active')).toBeInTheDocument();
      expect(screen.getByText('Registered users')).toBeInTheDocument();
      expect(screen.getByText('Active this month')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show skeleton placeholders when loading', () => {
      const { container } = render(
        <StatisticsCards statistics={null} loading={true} />,
      );

      // Should have 4 skeleton elements (one per card)
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(4);
    });

    it('should not show values when loading', () => {
      render(<StatisticsCards statistics={mockStatistics} loading={true} />);

      // Values should not be visible during loading
      expect(screen.queryByText('10')).not.toBeInTheDocument();
      expect(screen.queryByText('8')).not.toBeInTheDocument();
    });
  });

  describe('Null statistics', () => {
    it('should display 0 for all values when statistics is null', () => {
      render(<StatisticsCards statistics={null} loading={false} />);

      // All cards should show 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(4);
    });
  });

  describe('Styling', () => {
    it('should use grid layout', () => {
      const { container } = render(
        <StatisticsCards statistics={mockStatistics} loading={false} />,
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('lg:grid-cols-4');
    });

    it('should apply Apple HIG shadow styling', () => {
      const { container } = render(
        <StatisticsCards statistics={mockStatistics} loading={false} />,
      );

      // Cards should have shadow styling
      const cards = container.querySelectorAll('[class*="shadow-"]');
      expect(cards.length).toBeGreaterThan(0);
    });
  });
});
