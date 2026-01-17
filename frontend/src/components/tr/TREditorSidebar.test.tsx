import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TREditorSidebar } from './TREditorSidebar';
import {
  TR_SECTION_TEMPLATES,
  TermoReferencia,
  TermoReferenciaStatus,
} from '@/types/termo-referencia';

/**
 * Test suite for TREditorSidebar component.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 */

const mockTR: TermoReferencia = {
  id: 'test-id',
  etpId: 'etp-id',
  organizationId: 'org-id',
  objeto: 'Test objeto filled',
  fundamentacaoLegal: '',
  descricaoSolucao: 'Test descricao',
  requisitosContratacao: '',
  modeloExecucao: '',
  modeloGestao: '',
  criteriosSelecao: '',
  valorEstimado: 10000,
  dotacaoOrcamentaria: '',
  prazoVigencia: 0,
  obrigacoesContratante: '',
  obrigacoesContratada: '',
  sancoesPenalidades: '',
  status: TermoReferenciaStatus.DRAFT,
  versao: 1,
  currentVersion: 1,
  createdById: 'user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  etp: {
    id: 'etp-id',
    title: 'Test ETP',
    status: 'completed',
    templateType: 'TI',
  },
};

const defaultProps = {
  sections: TR_SECTION_TEMPLATES,
  activeSection: 1,
  onSectionClick: vi.fn(),
  currentTR: mockTR,
};

describe('TREditorSidebar', () => {
  it('should render summary card with data-testid', () => {
    render(<TREditorSidebar {...defaultProps} />);

    expect(screen.getByTestId('sidebar-summary')).toBeInTheDocument();
  });

  it('should display filled sections count', () => {
    render(<TREditorSidebar {...defaultProps} />);

    // mockTR has objeto, descricaoSolucao, valorEstimado filled (3 out of 10)
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('should display required sections count', () => {
    render(<TREditorSidebar {...defaultProps} />);

    // Required: objeto (filled), requisitos (empty), custos (filled) = 2/3
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('should render navigation card with data-testid', () => {
    render(<TREditorSidebar {...defaultProps} />);

    expect(screen.getByTestId('sidebar-navigation')).toBeInTheDocument();
  });

  it('should render section navigation buttons', () => {
    render(<TREditorSidebar {...defaultProps} />);

    TR_SECTION_TEMPLATES.forEach((section) => {
      expect(
        screen.getByTestId(`sidebar-section-${section.number}`),
      ).toBeInTheDocument();
    });
  });

  it('should call onSectionClick when section is clicked', async () => {
    const user = userEvent.setup();
    const onSectionClick = vi.fn();

    render(
      <TREditorSidebar {...defaultProps} onSectionClick={onSectionClick} />,
    );

    const section3Button = screen.getByTestId('sidebar-section-3');
    await user.click(section3Button);

    expect(onSectionClick).toHaveBeenCalledWith(3);
  });

  it('should render ETP info card when etp data is available', () => {
    render(<TREditorSidebar {...defaultProps} />);

    expect(screen.getByTestId('sidebar-etp-info')).toBeInTheDocument();
    expect(screen.getByText('Test ETP')).toBeInTheDocument();
    expect(screen.getByText(/Tipo: TI/)).toBeInTheDocument();
  });

  it('should not render ETP info card when etp data is not available', () => {
    const trWithoutEtp = { ...mockTR, etp: undefined };

    render(<TREditorSidebar {...defaultProps} currentTR={trWithoutEtp} />);

    expect(screen.queryByTestId('sidebar-etp-info')).not.toBeInTheDocument();
  });

  it('should show check icon for filled sections', () => {
    render(<TREditorSidebar {...defaultProps} />);

    // Section 1 (objeto) is filled - should have check icon styling
    const section1 = screen.getByTestId('sidebar-section-1');
    const checkIcon = section1.querySelector('.text-green-600');
    expect(checkIcon).toBeInTheDocument();
  });

  it('should show alert icon for empty required sections', () => {
    render(<TREditorSidebar {...defaultProps} />);

    // Section 4 (requisitos) is required but empty - should have alert icon
    const section4 = screen.getByTestId('sidebar-section-4');
    const alertIcon = section4.querySelector('.text-amber-500');
    expect(alertIcon).toBeInTheDocument();
  });
});
