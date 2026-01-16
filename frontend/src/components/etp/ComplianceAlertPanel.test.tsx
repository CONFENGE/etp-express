import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ComplianceAlertPanel } from './ComplianceAlertPanel';
import { ComplianceSuggestion } from '@/types/compliance';

describe('ComplianceAlertPanel', () => {
  const mockAlerts: ComplianceSuggestion[] = [
    {
      category: 'JUSTIFICATION',
      title: 'Justificativa incompleta',
      description: 'Adicione detalhes sobre os beneficios',
      priority: 'high',
      field: 'justificativa',
    },
    {
      category: 'REQUIREMENTS',
      title: 'Requisitos vagos',
      description: 'Especifique requisitos tecnicos',
      priority: 'medium',
      field: 'requisitos',
    },
    {
      category: 'IDENTIFICATION',
      title: 'UASG ausente',
      description: 'Preencha o codigo UASG',
      priority: 'low',
      field: 'uasg',
    },
    {
      category: 'PRICING',
      title: 'Preco sem fonte',
      description: 'Informe fonte do preco',
      priority: 'medium',
      field: 'preco',
    },
  ];

  const defaultProps = {
    alerts: mockAlerts,
    isValidating: false,
    dismissedAlerts: new Set<string>(),
    onDismiss: vi.fn(),
  };

  it('should render nothing when no alerts and not validating', () => {
    const { container } = render(
      <ComplianceAlertPanel
        {...defaultProps}
        alerts={[]}
        isValidating={false}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show validating message when isValidating is true', () => {
    render(
      <ComplianceAlertPanel
        {...defaultProps}
        alerts={[]}
        isValidating={true}
      />,
    );

    expect(screen.getByText('Verificando conformidade...')).toBeInTheDocument();
  });

  it('should display correct count of pendencias', () => {
    render(<ComplianceAlertPanel {...defaultProps} />);

    expect(screen.getByText('4 pendencias de conformidade')).toBeInTheDocument();
  });

  it('should display singular form for one pendencia', () => {
    render(
      <ComplianceAlertPanel {...defaultProps} alerts={[mockAlerts[0]]} />,
    );

    expect(screen.getByText('1 pendencia de conformidade')).toBeInTheDocument();
  });

  it('should show priority badges', () => {
    render(<ComplianceAlertPanel {...defaultProps} />);

    expect(screen.getByText('1 obrig.')).toBeInTheDocument();
    expect(screen.getByText('2 recom.')).toBeInTheDocument();
    expect(screen.getByText('1 opc.')).toBeInTheDocument();
  });

  it('should limit displayed alerts to maxAlerts', () => {
    render(<ComplianceAlertPanel {...defaultProps} maxAlerts={2} />);

    // Should show 2 alerts plus "more" message
    expect(screen.getByText('+2 outras pendencias (ver na sidebar)')).toBeInTheDocument();
  });

  it('should call onDismiss when alert is dismissed', () => {
    const onDismiss = vi.fn();
    render(<ComplianceAlertPanel {...defaultProps} onDismiss={onDismiss} />);

    const dismissButtons = screen.getAllByLabelText('Dispensar alerta');
    fireEvent.click(dismissButtons[0]);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should not show dismissed alerts', () => {
    const dismissedAlerts = new Set(['JUSTIFICATION-Justificativa incompleta-justificativa']);

    render(
      <ComplianceAlertPanel {...defaultProps} dismissedAlerts={dismissedAlerts} />,
    );

    // Should show 3 instead of 4 pendencias
    expect(screen.getByText('3 pendencias de conformidade')).toBeInTheDocument();
  });

  it('should not render panel when all alerts are dismissed', () => {
    // When all alerts are dismissed, the panel returns null
    const { container } = render(
      <ComplianceAlertPanel
        {...defaultProps}
        alerts={mockAlerts}
        dismissedAlerts={new Set([
          'JUSTIFICATION-Justificativa incompleta-justificativa',
          'REQUIREMENTS-Requisitos vagos-requisitos',
          'IDENTIFICATION-UASG ausente-uasg',
          'PRICING-Preco sem fonte-preco',
        ])}
      />,
    );

    // Panel returns null when no active alerts and not validating
    expect(container.firstChild).toBeNull();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ComplianceAlertPanel {...defaultProps} className="custom-panel" />,
    );

    expect(container.firstChild).toHaveClass('custom-panel');
  });

  it('should have correct border color for high priority alerts', () => {
    const highPriorityOnly: ComplianceSuggestion[] = [
      {
        category: 'JUSTIFICATION',
        title: 'Critical issue',
        description: 'Fix this',
        priority: 'high',
      },
    ];

    const { container } = render(
      <ComplianceAlertPanel {...defaultProps} alerts={highPriorityOnly} />,
    );

    expect(container.firstChild).toHaveClass('border-red-200');
  });

  it('should have correct border color when only medium priority', () => {
    const mediumPriorityOnly: ComplianceSuggestion[] = [
      {
        category: 'REQUIREMENTS',
        title: 'Medium issue',
        description: 'Consider this',
        priority: 'medium',
      },
    ];

    const { container } = render(
      <ComplianceAlertPanel {...defaultProps} alerts={mediumPriorityOnly} />,
    );

    expect(container.firstChild).toHaveClass('border-yellow-200');
  });

  it('should have correct border color when only low priority', () => {
    const lowPriorityOnly: ComplianceSuggestion[] = [
      {
        category: 'IDENTIFICATION',
        title: 'Low issue',
        description: 'Nice to have',
        priority: 'low',
      },
    ];

    const { container } = render(
      <ComplianceAlertPanel {...defaultProps} alerts={lowPriorityOnly} />,
    );

    expect(container.firstChild).toHaveClass('border-blue-200');
  });
});
