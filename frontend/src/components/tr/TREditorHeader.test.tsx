import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { TREditorHeader } from './TREditorHeader';
import { TermoReferenciaStatus } from '@/types/termo-referencia';

/**
 * Test suite for TREditorHeader component.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 */

const defaultProps = {
  etpTitle: 'Test ETP Title',
  status: TermoReferenciaStatus.DRAFT,
  versao: 1,
  onSave: vi.fn(),
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('TREditorHeader', () => {
  it('should render TR title with data-testid', () => {
    renderWithRouter(<TREditorHeader {...defaultProps} />);

    expect(screen.getByText('Termo de Referencia')).toBeInTheDocument();
    expect(screen.getByTestId('tr-title')).toBeInTheDocument();
  });

  it('should render ETP origin title', () => {
    renderWithRouter(<TREditorHeader {...defaultProps} />);

    expect(screen.getByText(/Origem: Test ETP Title/)).toBeInTheDocument();
    expect(screen.getByTestId('etp-origin')).toBeInTheDocument();
  });

  it('should show fallback title when etpTitle is empty', () => {
    renderWithRouter(<TREditorHeader {...defaultProps} etpTitle="" />);

    expect(screen.getByText(/Origem: TR sem titulo/)).toBeInTheDocument();
  });

  it('should render status badge with correct label', () => {
    renderWithRouter(<TREditorHeader {...defaultProps} />);

    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
  });

  it('should render different status badges', () => {
    const { rerender } = renderWithRouter(
      <TREditorHeader
        {...defaultProps}
        status={TermoReferenciaStatus.REVIEW}
      />,
    );

    expect(screen.getByText('Em Revisao')).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <TREditorHeader
          {...defaultProps}
          status={TermoReferenciaStatus.APPROVED}
        />
      </BrowserRouter>,
    );
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
  });

  it('should render version badge', () => {
    renderWithRouter(<TREditorHeader {...defaultProps} versao={3} />);

    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByTestId('version-badge')).toBeInTheDocument();
  });

  it('should call onSave when Save button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    renderWithRouter(<TREditorHeader {...defaultProps} onSave={onSave} />);

    const saveButton = screen.getByTestId('save-button');
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should show "Salvando..." text when isSaving is true', () => {
    renderWithRouter(<TREditorHeader {...defaultProps} isSaving={true} />);

    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });

  it('should disable Save button when isSaving is true', () => {
    renderWithRouter(<TREditorHeader {...defaultProps} isSaving={true} />);

    const saveButton = screen.getByTestId('save-button');
    expect(saveButton).toBeDisabled();
  });

  it('should render back button', () => {
    renderWithRouter(<TREditorHeader {...defaultProps} />);

    expect(screen.getByTestId('back-button')).toBeInTheDocument();
    expect(screen.getByText('Voltar')).toBeInTheDocument();
  });

  describe('Unsaved Changes Indicator', () => {
    it('should show unsaved indicator when isDirty is true', () => {
      renderWithRouter(<TREditorHeader {...defaultProps} isDirty={true} />);

      const indicator = screen.getByTestId('unsaved-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('*');
    });

    it('should not show unsaved indicator when isDirty is false', () => {
      renderWithRouter(<TREditorHeader {...defaultProps} isDirty={false} />);

      expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument();
    });
  });
});
