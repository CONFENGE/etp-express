import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ETPEditorHeader, type ExportState } from './ETPEditorHeader';

describe('ETPEditorHeader', () => {
  it('should render ETP title with data-testid', () => {
    render(<ETPEditorHeader etpTitle="Test ETP Title" onSave={() => {}} />);

    expect(screen.getByText('Test ETP Title')).toBeInTheDocument();
    expect(screen.getByTestId('etp-title')).toBeInTheDocument();
  });

  // Fallback title tests (#1317)
  it('should show fallback title when etpTitle is empty string', () => {
    render(<ETPEditorHeader etpTitle="" onSave={() => {}} />);

    expect(screen.getByText('ETP sem titulo')).toBeInTheDocument();
    expect(screen.getByTestId('etp-title')).toBeInTheDocument();
  });

  it('should show fallback title when etpTitle is whitespace only', () => {
    render(<ETPEditorHeader etpTitle="   " onSave={() => {}} />);

    expect(screen.getByText('ETP sem titulo')).toBeInTheDocument();
  });

  it('should render ETP description when provided with data-testid', () => {
    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        etpDescription="Test Description"
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByTestId('etp-description')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const { container } = render(
      <ETPEditorHeader etpTitle="Test Title" onSave={() => {}} />,
    );

    const description = container.querySelector('.text-muted-foreground');
    expect(description).not.toBeInTheDocument();
  });

  it('should call onSave when Save button is clicked and have data-testid', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<ETPEditorHeader etpTitle="Test Title" onSave={onSave} />);

    const saveButton = screen.getByTestId('save-button');
    expect(saveButton).toBeInTheDocument();
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should show "Salvando..." text when isSaving is true', () => {
    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        onSave={() => {}}
        isSaving={true}
      />,
    );

    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });

  it('should disable Save button when isSaving is true', () => {
    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        onSave={() => {}}
        isSaving={true}
      />,
    );

    const saveButton = screen.getByRole('button', { name: /salvando/i });
    expect(saveButton).toBeDisabled();
  });

  it('should render main action buttons', () => {
    render(<ETPEditorHeader etpTitle="Test Title" onSave={() => {}} />);

    expect(
      screen.getByRole('button', { name: /exportar/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
  });

  it('should show export dropdown with Preview, PDF and DOCX options when clicked', async () => {
    const user = userEvent.setup();
    render(<ETPEditorHeader etpTitle="Test Title" onSave={() => {}} />);

    const exportButton = screen.getByRole('button', { name: /exportar/i });
    await user.click(exportButton);

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('PDF (.pdf)')).toBeInTheDocument();
    expect(screen.getByText('Word (.docx)')).toBeInTheDocument();
  });

  it('should call onPreview when Preview option is clicked (#1214)', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();

    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        onSave={() => {}}
        onPreview={onPreview}
      />,
    );

    const exportButton = screen.getByRole('button', { name: /exportar/i });
    await user.click(exportButton);

    const previewOption = screen.getByText('Preview');
    await user.click(previewOption);

    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it('should call onExportPDF when PDF option is clicked', async () => {
    const user = userEvent.setup();
    const onExportPDF = vi.fn();

    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        onSave={() => {}}
        onExportPDF={onExportPDF}
      />,
    );

    const exportButton = screen.getByRole('button', { name: /exportar/i });
    await user.click(exportButton);

    const pdfOption = screen.getByText('PDF (.pdf)');
    await user.click(pdfOption);

    expect(onExportPDF).toHaveBeenCalledTimes(1);
  });

  it('should call onExportDocx when DOCX option is clicked', async () => {
    const user = userEvent.setup();
    const onExportDocx = vi.fn();

    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        onSave={() => {}}
        onExportDocx={onExportDocx}
      />,
    );

    const exportButton = screen.getByRole('button', { name: /exportar/i });
    await user.click(exportButton);

    const docxOption = screen.getByText('Word (.docx)');
    await user.click(docxOption);

    expect(onExportDocx).toHaveBeenCalledTimes(1);
  });

  it('should show "Exportando..." text when isExporting is true', () => {
    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        onSave={() => {}}
        isExporting={true}
      />,
    );

    expect(screen.getByText('Exportando...')).toBeInTheDocument();
  });

  it('should disable Export button when isExporting is true', () => {
    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        onSave={() => {}}
        isExporting={true}
      />,
    );

    const exportButton = screen.getByRole('button', { name: /exportando/i });
    expect(exportButton).toBeDisabled();
  });

  // Unsaved changes indicator tests (#610)
  describe('Unsaved Changes Indicator (#610)', () => {
    it('should show unsaved indicator with data-testid when isDirty is true', () => {
      render(
        <ETPEditorHeader
          etpTitle="Test Title"
          onSave={() => {}}
          isDirty={true}
        />,
      );

      const indicator = screen.getByTestId('unsaved-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('*');
    });

    it('should not show unsaved indicator when isDirty is false', () => {
      render(
        <ETPEditorHeader
          etpTitle="Test Title"
          onSave={() => {}}
          isDirty={false}
        />,
      );

      expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument();
    });
  });

  // Export progress tests (#612)
  describe('Export Progress UI (#612)', () => {
    const exportingState: ExportState = {
      isExporting: true,
      progress: 45,
      stage: 'generating',
      format: 'pdf',
    };

    it('should show progress bar when exportState.isExporting is true', () => {
      render(
        <ETPEditorHeader
          etpTitle="Test Title"
          onSave={() => {}}
          exportState={exportingState}
        />,
      );

      // Should show progress percentage
      expect(screen.getByText('45%')).toBeInTheDocument();
      // Should show stage label
      expect(screen.getByText('Gerando PDF...')).toBeInTheDocument();
    });

    it('should show cancel button during export', () => {
      render(
        <ETPEditorHeader
          etpTitle="Test Title"
          onSave={() => {}}
          exportState={exportingState}
        />,
      );

      const cancelButton = screen.getByRole('button', {
        name: /cancelar exportação/i,
      });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should call onCancelExport when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancelExport = vi.fn();

      render(
        <ETPEditorHeader
          etpTitle="Test Title"
          onSave={() => {}}
          exportState={exportingState}
          onCancelExport={onCancelExport}
        />,
      );

      const cancelButton = screen.getByRole('button', {
        name: /cancelar exportação/i,
      });
      await user.click(cancelButton);

      expect(onCancelExport).toHaveBeenCalledTimes(1);
    });

    it('should show correct stage label for preparing stage', () => {
      const preparingState: ExportState = {
        isExporting: true,
        progress: 5,
        stage: 'preparing',
        format: 'pdf',
      };

      render(
        <ETPEditorHeader
          etpTitle="Test Title"
          onSave={() => {}}
          exportState={preparingState}
        />,
      );

      expect(screen.getByText('Preparando...')).toBeInTheDocument();
    });

    it('should show correct stage label for downloading stage', () => {
      const downloadingState: ExportState = {
        isExporting: true,
        progress: 90,
        stage: 'downloading',
        format: 'docx',
      };

      render(
        <ETPEditorHeader
          etpTitle="Test Title"
          onSave={() => {}}
          exportState={downloadingState}
        />,
      );

      expect(screen.getByText('Baixando...')).toBeInTheDocument();
    });

    it('should show DOCX in stage label when format is docx', () => {
      const docxState: ExportState = {
        isExporting: true,
        progress: 50,
        stage: 'generating',
        format: 'docx',
      };

      render(
        <ETPEditorHeader
          etpTitle="Test Title"
          onSave={() => {}}
          exportState={docxState}
        />,
      );

      expect(screen.getByText('Gerando DOCX...')).toBeInTheDocument();
    });

    it('should not show export dropdown when exportState.isExporting is true', () => {
      render(
        <ETPEditorHeader
          etpTitle="Test Title"
          onSave={() => {}}
          exportState={exportingState}
        />,
      );

      // Dropdown trigger should not be present
      expect(
        screen.queryByRole('button', { name: /exportar/i }),
      ).not.toBeInTheDocument();
    });
  });
});
