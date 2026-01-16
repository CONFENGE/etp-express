import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ComplianceAlert } from './ComplianceAlert';

describe('ComplianceAlert', () => {
  const defaultProps = {
    title: 'Justificativa incompleta',
    description: 'Adicione detalhes sobre os beneficios esperados',
    priority: 'high' as const,
  };

  it('should render alert with title and description', () => {
    render(<ComplianceAlert {...defaultProps} />);

    expect(screen.getByText('Justificativa incompleta')).toBeInTheDocument();
    expect(
      screen.getByText('Adicione detalhes sobre os beneficios esperados'),
    ).toBeInTheDocument();
  });

  it('should show "Obrigatorio" badge for high priority', () => {
    render(<ComplianceAlert {...defaultProps} priority="high" />);

    expect(screen.getByText('Obrigatorio')).toBeInTheDocument();
  });

  it('should show "Recomendado" badge for medium priority', () => {
    render(<ComplianceAlert {...defaultProps} priority="medium" />);

    expect(screen.getByText('Recomendado')).toBeInTheDocument();
  });

  it('should show "Opcional" badge for low priority', () => {
    render(<ComplianceAlert {...defaultProps} priority="low" />);

    expect(screen.getByText('Opcional')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ComplianceAlert {...defaultProps} onDismiss={onDismiss} />);

    const dismissButton = screen.getByLabelText('Dispensar alerta');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not render dismiss button when onDismiss is not provided', () => {
    render(<ComplianceAlert {...defaultProps} />);

    expect(screen.queryByLabelText('Dispensar alerta')).not.toBeInTheDocument();
  });

  it('should apply correct color classes for high priority', () => {
    const { container } = render(<ComplianceAlert {...defaultProps} priority="high" />);

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('border-red-200');
    expect(alert).toHaveClass('bg-red-50/50');
  });

  it('should apply correct color classes for medium priority', () => {
    const { container } = render(
      <ComplianceAlert {...defaultProps} priority="medium" />,
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('border-yellow-200');
    expect(alert).toHaveClass('bg-yellow-50/50');
  });

  it('should apply correct color classes for low priority', () => {
    const { container } = render(<ComplianceAlert {...defaultProps} priority="low" />);

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('border-blue-200');
    expect(alert).toHaveClass('bg-blue-50/50');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ComplianceAlert {...defaultProps} className="custom-class" />,
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('custom-class');
  });
});
