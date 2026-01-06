import { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ExportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  onDownload: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const DEFAULT_ZOOM_INDEX = 2; // 1.0

/**
 * Export Preview Modal Component (#1214)
 *
 * Renders a PDF preview in a modal with navigation and zoom controls.
 * Features:
 * - Page navigation (previous/next)
 * - Zoom in/out with predefined levels
 * - Direct download button
 * - Loading state with spinner
 * - Error state with retry option
 * - Mobile responsive
 * - Keyboard navigation support
 */
export function ExportPreviewModal({
  open,
  onOpenChange,
  pdfBlob,
  onDownload,
  isLoading = false,
  error = null,
  onRetry,
}: ExportPreviewModalProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomIndex, setZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const scale = ZOOM_LEVELS[zoomIndex];

  // Create object URL from blob
  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    }
    return undefined;
  }, [pdfBlob]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentPage(1);
      setZoomIndex(DEFAULT_ZOOM_INDEX);
    }
  }, [open]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: pages }: { numPages: number }) => {
      setNumPages(pages);
    },
    [],
  );

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  }, [numPages]);

  const zoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPreviousPage();
          break;
        case 'ArrowRight':
          goToNextPage();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goToPreviousPage, goToNextPage, zoomIn, zoomOut]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-[95vw] md:max-w-4xl lg:max-w-5xl h-[90vh]',
          'flex flex-col p-0 gap-0',
        )}
        data-testid="export-preview-modal"
      >
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Preview do Documento</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Visualize o documento antes de baixar
              </DialogDescription>
            </div>
            <Button
              onClick={onDownload}
              disabled={isLoading || !!error}
              className="gap-2"
              data-testid="preview-download-button"
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
          </div>
        </DialogHeader>

        {/* PDF Viewer */}
        <div
          className="flex-1 overflow-auto bg-muted/30 relative"
          data-testid="pdf-viewer-container"
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2
                  className="h-8 w-8 animate-spin text-primary"
                  data-testid="preview-loading"
                />
                <span className="text-sm text-muted-foreground">
                  Gerando preview...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3 text-center px-4">
                <AlertCircle
                  className="h-8 w-8 text-destructive"
                  data-testid="preview-error"
                />
                <span className="text-sm text-destructive">{error}</span>
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="gap-2"
                    data-testid="preview-retry-button"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Tentar novamente
                  </Button>
                )}
              </div>
            </div>
          )}

          {pdfUrl && !isLoading && !error && (
            <div className="flex justify-center py-4">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
                error={
                  <div className="flex items-center justify-center h-64 text-destructive">
                    Erro ao carregar PDF
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg"
                  data-testid="pdf-page"
                />
              </Document>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="px-4 py-3 border-t bg-background shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage <= 1 || isLoading || !!error}
                aria-label="Página anterior"
                data-testid="prev-page-button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span
                className="text-sm min-w-[80px] text-center"
                data-testid="page-indicator"
              >
                {numPages > 0
                  ? `${currentPage} / ${numPages}`
                  : 'Carregando...'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage >= numPages || isLoading || !!error}
                aria-label="Próxima página"
                data-testid="next-page-button"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={zoomIndex <= 0 || isLoading || !!error}
                aria-label="Diminuir zoom"
                data-testid="zoom-out-button"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span
                className="text-sm min-w-[50px] text-center"
                data-testid="zoom-indicator"
              >
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={
                  zoomIndex >= ZOOM_LEVELS.length - 1 || isLoading || !!error
                }
                aria-label="Aumentar zoom"
                data-testid="zoom-in-button"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
