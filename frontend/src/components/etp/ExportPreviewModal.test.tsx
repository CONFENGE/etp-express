import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExportPreviewModal } from './ExportPreviewModal';

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: vi.fn(({ children, onLoadSuccess }) => {
    // Simulate successful load
    if (onLoadSuccess) {
      setTimeout(() => onLoadSuccess({ numPages: 5 }), 0);
    }
    return <div data-testid="pdf-document">{children}</div>;
  }),
  Page: vi.fn(({ pageNumber, scale }) => (
    <div data-testid="pdf-page" data-page={pageNumber} data-scale={scale}>
      Page {pageNumber}
    </div>
  )),
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
    version: '3.11.174',
  },
}));

describe('ExportPreviewModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    pdfBlob: new Blob(['mock pdf'], { type: 'application/pdf' }),
    onDownload: vi.fn(),
    isLoading: false,
    error: null,
    onRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the modal when open', () => {
    render(<ExportPreviewModal {...defaultProps} />);

    expect(screen.getByTestId('export-preview-modal')).toBeInTheDocument();
    expect(screen.getByText('Preview do Documento')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ExportPreviewModal {...defaultProps} open={false} />);

    expect(
      screen.queryByTestId('export-preview-modal'),
    ).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ExportPreviewModal {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('preview-loading')).toBeInTheDocument();
    expect(screen.getByText('Gerando preview...')).toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    const errorMessage = 'Erro ao carregar preview';
    render(
      <ExportPreviewModal
        {...defaultProps}
        error={errorMessage}
        pdfBlob={null}
      />,
    );

    expect(screen.getByTestId('preview-error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByTestId('preview-retry-button')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    render(
      <ExportPreviewModal {...defaultProps} error="Error" pdfBlob={null} />,
    );

    fireEvent.click(screen.getByTestId('preview-retry-button'));

    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onDownload when download button is clicked', () => {
    render(<ExportPreviewModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('preview-download-button'));

    expect(defaultProps.onDownload).toHaveBeenCalledTimes(1);
  });

  it('disables download button when loading', () => {
    render(<ExportPreviewModal {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('preview-download-button')).toBeDisabled();
  });

  it('disables download button when there is an error', () => {
    render(
      <ExportPreviewModal {...defaultProps} error="Error" pdfBlob={null} />,
    );

    expect(screen.getByTestId('preview-download-button')).toBeDisabled();
  });

  describe('page navigation', () => {
    it('renders page indicator', async () => {
      render(<ExportPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-indicator')).toHaveTextContent('1 / 5');
      });
    });

    it('disables previous button on first page', async () => {
      render(<ExportPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('prev-page-button')).toBeDisabled();
      });
    });

    it('enables next button when there are more pages', async () => {
      render(<ExportPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('next-page-button')).not.toBeDisabled();
      });
    });

    it('navigates to next page when clicking next button', async () => {
      render(<ExportPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-indicator')).toHaveTextContent('1 / 5');
      });

      fireEvent.click(screen.getByTestId('next-page-button'));

      await waitFor(() => {
        expect(screen.getByTestId('page-indicator')).toHaveTextContent('2 / 5');
      });
    });

    it('navigates to previous page when clicking prev button', async () => {
      render(<ExportPreviewModal {...defaultProps} />);

      // Go to page 2 first
      await waitFor(() => {
        expect(screen.getByTestId('page-indicator')).toHaveTextContent('1 / 5');
      });

      fireEvent.click(screen.getByTestId('next-page-button'));

      await waitFor(() => {
        expect(screen.getByTestId('page-indicator')).toHaveTextContent('2 / 5');
      });

      // Now go back
      fireEvent.click(screen.getByTestId('prev-page-button'));

      await waitFor(() => {
        expect(screen.getByTestId('page-indicator')).toHaveTextContent('1 / 5');
      });
    });
  });

  describe('zoom controls', () => {
    it('renders zoom indicator with default value', () => {
      render(<ExportPreviewModal {...defaultProps} />);

      expect(screen.getByTestId('zoom-indicator')).toHaveTextContent('100%');
    });

    it('zooms in when clicking zoom in button', () => {
      render(<ExportPreviewModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('zoom-in-button'));

      expect(screen.getByTestId('zoom-indicator')).toHaveTextContent('125%');
    });

    it('zooms out when clicking zoom out button', () => {
      render(<ExportPreviewModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('zoom-out-button'));

      expect(screen.getByTestId('zoom-indicator')).toHaveTextContent('75%');
    });

    it('disables zoom out at minimum zoom', () => {
      render(<ExportPreviewModal {...defaultProps} />);

      // Zoom out to minimum
      fireEvent.click(screen.getByTestId('zoom-out-button'));
      fireEvent.click(screen.getByTestId('zoom-out-button'));

      expect(screen.getByTestId('zoom-out-button')).toBeDisabled();
    });

    it('disables zoom in at maximum zoom', () => {
      render(<ExportPreviewModal {...defaultProps} />);

      // Zoom in to maximum
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      fireEvent.click(screen.getByTestId('zoom-in-button'));

      expect(screen.getByTestId('zoom-in-button')).toBeDisabled();
    });
  });

  describe('keyboard navigation', () => {
    it('navigates pages with arrow keys', async () => {
      render(<ExportPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-indicator')).toHaveTextContent('1 / 5');
      });

      // Arrow right to go to next page
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByTestId('page-indicator')).toHaveTextContent('2 / 5');
      });

      // Arrow left to go back
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByTestId('page-indicator')).toHaveTextContent('1 / 5');
      });
    });

    it('zooms with +/- keys', () => {
      render(<ExportPreviewModal {...defaultProps} />);

      fireEvent.keyDown(window, { key: '+' });
      expect(screen.getByTestId('zoom-indicator')).toHaveTextContent('125%');

      fireEvent.keyDown(window, { key: '-' });
      expect(screen.getByTestId('zoom-indicator')).toHaveTextContent('100%');
    });
  });

  describe('accessibility', () => {
    it('has accessible button labels', () => {
      render(<ExportPreviewModal {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /página anterior/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /próxima página/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /aumentar zoom/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /diminuir zoom/i }),
      ).toBeInTheDocument();
    });

    it('has dialog description', () => {
      render(<ExportPreviewModal {...defaultProps} />);

      expect(
        screen.getByText('Visualize o documento antes de baixar'),
      ).toBeInTheDocument();
    });
  });

  describe('cleanup', () => {
    it('revokes object URL on unmount', () => {
      const { unmount } = render(<ExportPreviewModal {...defaultProps} />);

      unmount();

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
