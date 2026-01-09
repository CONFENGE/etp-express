import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SuccessRateCard } from './SuccessRateCard';
import { type SuccessRateData } from '@/hooks/useSuccessRate';

describe('SuccessRateCard', () => {
  const mockData: SuccessRateData = {
    rate: 75.5,
    trend: 'up',
    completedCount: 15,
    totalCount: 20,
    previousRate: 60.0,
  };

  it('should render success rate value', () => {
    render(<SuccessRateCard data={mockData} />);

    expect(screen.getByTestId('success-rate-value')).toHaveTextContent('75.5%');
  });

  it('should render completed count and total', () => {
    render(<SuccessRateCard data={mockData} />);

    expect(screen.getByText(/15 de 20 ETPs concluidos/i)).toBeInTheDocument();
  });

  it('should render trend indicator with up icon', () => {
    render(<SuccessRateCard data={mockData} />);

    const trendElement = screen.getByTestId('success-rate-trend');
    expect(trendElement).toHaveTextContent('+15.5%');
  });

  it('should render down trend when rate decreased', () => {
    const downData: SuccessRateData = {
      ...mockData,
      rate: 40.0,
      trend: 'down',
      previousRate: 60.0,
    };

    render(<SuccessRateCard data={downData} />);

    const trendElement = screen.getByTestId('success-rate-trend');
    expect(trendElement).toHaveTextContent('-20.0%');
    expect(trendElement).toHaveClass('text-red-600');
  });

  it('should render stable trend when rate is similar', () => {
    const stableData: SuccessRateData = {
      ...mockData,
      rate: 60.5,
      trend: 'stable',
      previousRate: 60.0,
    };

    render(<SuccessRateCard data={stableData} />);

    const trendElement = screen.getByTestId('success-rate-trend');
    expect(trendElement).toHaveTextContent('+0.5%');
    expect(trendElement).toHaveClass('text-gray-600');
  });

  it('should render skeleton when loading', () => {
    render(<SuccessRateCard data={null} isLoading={true} />);

    expect(screen.getByText('Taxa de Sucesso')).toBeInTheDocument();
    expect(screen.queryByTestId('success-rate-value')).not.toBeInTheDocument();
  });

  it('should render skeleton when data is null', () => {
    render(<SuccessRateCard data={null} />);

    expect(screen.getByText('Taxa de Sucesso')).toBeInTheDocument();
    expect(screen.queryByTestId('success-rate-value')).not.toBeInTheDocument();
  });

  it('should apply green color for high success rate', () => {
    const highRateData: SuccessRateData = {
      ...mockData,
      rate: 85.0,
    };

    render(<SuccessRateCard data={highRateData} />);

    expect(screen.getByTestId('success-rate-value')).toHaveClass(
      'text-green-600',
    );
  });

  it('should apply yellow color for medium success rate', () => {
    const mediumRateData: SuccessRateData = {
      ...mockData,
      rate: 55.0,
    };

    render(<SuccessRateCard data={mediumRateData} />);

    expect(screen.getByTestId('success-rate-value')).toHaveClass(
      'text-yellow-600',
    );
  });

  it('should apply red color for low success rate', () => {
    const lowRateData: SuccessRateData = {
      ...mockData,
      rate: 25.0,
    };

    render(<SuccessRateCard data={lowRateData} />);

    expect(screen.getByTestId('success-rate-value')).toHaveClass(
      'text-red-600',
    );
  });

  it('should accept className prop', () => {
    render(<SuccessRateCard data={mockData} className="custom-class" />);

    expect(screen.getByTestId('success-rate-card')).toHaveClass('custom-class');
  });
});
