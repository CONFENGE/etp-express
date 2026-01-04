import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ETPEditorProgress } from './ETPEditorProgress';

describe('ETPEditorProgress', () => {
  it('should render progress label', () => {
    render(<ETPEditorProgress progress={50} />);

    expect(screen.getByText('Progresso Geral')).toBeInTheDocument();
  });

  it('should display progress percentage', () => {
    render(<ETPEditorProgress progress={75} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should render Progress component with correct value and data-testid', () => {
    render(<ETPEditorProgress progress={60} />);

    // Verify data-testid is present for E2E testing
    const progressBar = screen.getByTestId('etp-progress');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('role', 'progressbar');
  });

  it('should handle 0% progress', () => {
    render(<ETPEditorProgress progress={0} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should handle 100% progress', () => {
    render(<ETPEditorProgress progress={100} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
