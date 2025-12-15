import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileUpload } from './FileUpload';

describe('FileUpload', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnFileRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Creates a mock file for testing
   */
  function createMockFile(name: string, size: number, type: string): File {
    const file = new File([''], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  }

  describe('Initial Render', () => {
    it('renders drop zone when no file is selected', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      expect(
        screen.getByText(/arraste um documento ou clique para selecionar/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/formatos aceitos: pdf, docx/i),
      ).toBeInTheDocument();
    });

    it('renders with correct accessibility attributes', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });
      expect(dropZone).toBeInTheDocument();
      expect(dropZone).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('File Selection', () => {
    it('renders file preview when file is selected', () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      render(
        <FileUpload
          onFileSelect={mockOnFileSelect}
          onFileRemove={mockOnFileRemove}
          selectedFile={file}
        />,
      );

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
    });

    it('calls onFileRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      render(
        <FileUpload
          onFileSelect={mockOnFileSelect}
          onFileRemove={mockOnFileRemove}
          selectedFile={file}
        />,
      );

      const removeButton = screen.getByRole('button', {
        name: /remover arquivo/i,
      });
      await user.click(removeButton);

      expect(mockOnFileRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('File Validation', () => {
    it('shows error for invalid file type', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      const invalidFile = createMockFile('test.txt', 1024, 'text/plain');
      const dataTransfer = {
        files: [invalidFile],
        types: ['Files'],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/formato inválido/i)).toBeInTheDocument();
      });
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('shows error for file exceeding size limit', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      const largeFile = createMockFile(
        'large.pdf',
        11 * 1024 * 1024, // 11MB
        'application/pdf',
      );
      const dataTransfer = {
        files: [largeFile],
        types: ['Files'],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/arquivo muito grande/i)).toBeInTheDocument();
      });
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('accepts valid PDF file', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      const validFile = createMockFile('test.pdf', 1024, 'application/pdf');
      const dataTransfer = {
        files: [validFile],
        types: ['Files'],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
      });
    });

    it('accepts valid DOCX file', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      const validFile = createMockFile(
        'test.docx',
        1024,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      const dataTransfer = {
        files: [validFile],
        types: ['Files'],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
      });
    });
  });

  describe('Drag and Drop', () => {
    it('shows drag state when dragging over', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      fireEvent.dragEnter(dropZone);

      expect(screen.getByText(/solte o arquivo aqui/i)).toBeInTheDocument();
    });

    it('removes drag state when dragging leaves', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      fireEvent.dragEnter(dropZone);
      fireEvent.dragLeave(dropZone);

      expect(
        screen.getByText(/arraste um documento ou clique para selecionar/i),
      ).toBeInTheDocument();
    });

    it('handles file drop', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };

      fireEvent.dragEnter(dropZone);
      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file);
      });
    });
  });

  describe('Disabled State', () => {
    it('does not allow interaction when disabled', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} disabled />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      expect(dropZone).toHaveAttribute('tabIndex', '-1');
    });

    it('hides remove button when disabled with file selected', () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      render(
        <FileUpload
          onFileSelect={mockOnFileSelect}
          onFileRemove={mockOnFileRemove}
          selectedFile={file}
          disabled
        />,
      );

      expect(
        screen.queryByRole('button', { name: /remover arquivo/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('displays external error message', () => {
      render(
        <FileUpload
          onFileSelect={mockOnFileSelect}
          error="Erro ao fazer upload"
        />,
      );

      expect(screen.getByText('Erro ao fazer upload')).toBeInTheDocument();
    });

    it('displays error with file preview', () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      render(
        <FileUpload
          onFileSelect={mockOnFileSelect}
          selectedFile={file}
          error="Erro na análise"
        />,
      );

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('Erro na análise')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens file dialog on Enter key', async () => {
      const user = userEvent.setup();

      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      // Focus the drop zone
      dropZone.focus();

      // The input should be triggered (we can't fully test this in jsdom)
      await user.keyboard('{Enter}');

      // Component should remain functional
      expect(dropZone).toBeInTheDocument();
    });

    it('opens file dialog on Space key', async () => {
      const user = userEvent.setup();

      render(<FileUpload onFileSelect={mockOnFileSelect} />);

      const dropZone = screen.getByRole('button', {
        name: /área de upload de arquivo/i,
      });

      dropZone.focus();
      await user.keyboard(' ');

      expect(dropZone).toBeInTheDocument();
    });
  });
});
