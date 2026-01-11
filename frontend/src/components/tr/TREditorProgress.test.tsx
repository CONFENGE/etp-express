import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TREditorProgress } from './TREditorProgress';

/**
 * Test suite for TREditorProgress component.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 */

describe('TREditorProgress', () => {
  it('should render progress container with data-testid', () => {
    render(<TREditorProgress progress={50} />);

    expect(screen.getByTestId('tr-progress-container')).toBeInTheDocument();
  });

  it('should display progress percentage', () => {
    render(<TREditorProgress progress={75} />);

    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('75%');
  });

  it('should round progress percentage', () => {
    render(<TREditorProgress progress={33.7} />);

    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('34%');
  });

  it('should show 0% for zero progress', () => {
    render(<TREditorProgress progress={0} />);

    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('0%');
  });

  it('should show 100% and green color when complete', () => {
    render(<TREditorProgress progress={100} />);

    const percentageElement = screen.getByTestId('progress-percentage');
    expect(percentageElement).toHaveTextContent('100%');
    expect(percentageElement).toHaveClass('text-green-600');
  });

  it('should render progress bar with data-testid', () => {
    render(<TREditorProgress progress={50} />);

    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('should show label text', () => {
    render(<TREditorProgress progress={50} />);

    expect(screen.getByText('Progresso do TR')).toBeInTheDocument();
  });
});
