import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AvgCompletionTimeCard } from './AvgCompletionTimeCard';
import { type AvgCompletionTimeData } from '@/hooks/useAvgCompletionTime';

describe('AvgCompletionTimeCard', () => {
  const mockData: AvgCompletionTimeData = {
    avgTimeMinutes: 2880, // 2 days
    formatted: '2 dias',
    completedCount: 15,
  };

  it('should render formatted average time value', () => {
    render(<AvgCompletionTimeCard data={mockData} />);

    expect(screen.getByTestId('avg-completion-time-value')).toHaveTextContent(
      '2 dias',
    );
  });

  it('should render completed count', () => {
    render(<AvgCompletionTimeCard data={mockData} />);

    expect(
      screen.getByText(/Baseado em 15 ETPs concluidos/i),
    ).toBeInTheDocument();
  });

  it('should render singular form for one ETP', () => {
    const singleData: AvgCompletionTimeData = {
      ...mockData,
      completedCount: 1,
    };

    render(<AvgCompletionTimeCard data={singleData} />);

    expect(screen.getByText(/Baseado em 1 ETP concluido/i)).toBeInTheDocument();
  });

  it('should render skeleton when loading', () => {
    render(<AvgCompletionTimeCard data={null} isLoading={true} />);

    expect(screen.getByText('Tempo Medio')).toBeInTheDocument();
    expect(
      screen.queryByTestId('avg-completion-time-value'),
    ).not.toBeInTheDocument();
  });

  it('should render skeleton when data is null', () => {
    render(<AvgCompletionTimeCard data={null} />);

    expect(screen.getByText('Tempo Medio')).toBeInTheDocument();
    expect(
      screen.queryByTestId('avg-completion-time-value'),
    ).not.toBeInTheDocument();
  });

  it('should render no data message when completedCount is 0', () => {
    const noData: AvgCompletionTimeData = {
      avgTimeMinutes: 0,
      formatted: 'Sem dados',
      completedCount: 0,
    };

    render(<AvgCompletionTimeCard data={noData} />);

    expect(screen.getByTestId('avg-completion-time-value')).toHaveTextContent(
      'Sem dados',
    );
    expect(screen.getByText('Nenhum ETP concluido ainda')).toBeInTheDocument();
  });

  it('should apply green color for fast completion time (< 1 day)', () => {
    const fastData: AvgCompletionTimeData = {
      avgTimeMinutes: 720, // 12 hours
      formatted: '12h',
      completedCount: 5,
    };

    render(<AvgCompletionTimeCard data={fastData} />);

    expect(screen.getByTestId('avg-completion-time-value')).toHaveClass(
      'text-green-600',
    );
  });

  it('should apply blue color for good completion time (1-3 days)', () => {
    const goodData: AvgCompletionTimeData = {
      avgTimeMinutes: 2880, // 2 days
      formatted: '2 dias',
      completedCount: 10,
    };

    render(<AvgCompletionTimeCard data={goodData} />);

    expect(screen.getByTestId('avg-completion-time-value')).toHaveClass(
      'text-blue-600',
    );
  });

  it('should apply yellow color for moderate completion time (3-7 days)', () => {
    const moderateData: AvgCompletionTimeData = {
      avgTimeMinutes: 7200, // 5 days
      formatted: '5 dias',
      completedCount: 8,
    };

    render(<AvgCompletionTimeCard data={moderateData} />);

    expect(screen.getByTestId('avg-completion-time-value')).toHaveClass(
      'text-yellow-600',
    );
  });

  it('should apply orange color for slow completion time (> 7 days)', () => {
    const slowData: AvgCompletionTimeData = {
      avgTimeMinutes: 14400, // 10 days
      formatted: '10 dias',
      completedCount: 3,
    };

    render(<AvgCompletionTimeCard data={slowData} />);

    expect(screen.getByTestId('avg-completion-time-value')).toHaveClass(
      'text-orange-600',
    );
  });

  it('should apply muted color when no data', () => {
    const noData: AvgCompletionTimeData = {
      avgTimeMinutes: 0,
      formatted: 'Sem dados',
      completedCount: 0,
    };

    render(<AvgCompletionTimeCard data={noData} />);

    expect(screen.getByTestId('avg-completion-time-value')).toHaveClass(
      'text-muted-foreground',
    );
  });

  it('should accept className prop', () => {
    render(<AvgCompletionTimeCard data={mockData} className="custom-class" />);

    expect(screen.getByTestId('avg-completion-time-card')).toHaveClass(
      'custom-class',
    );
  });
});
