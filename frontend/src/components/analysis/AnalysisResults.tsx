import { useState, useCallback } from 'react';
import {
  Download,
  FileOutput,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScoreCard } from './ScoreCard';
import { ImprovementList } from './ImprovementList';
import type {
  AnalysisDimension,
  AnalysisVerdict,
  IssueSummary,
  DocumentInfo,
  ReportIssue,
} from '@/types/analysis';

/**
 * Props for AnalysisResults component
 */
export interface AnalysisResultsProps {
  /**
   * Analysis ID for API calls
   */
  analysisId: string;
  /**
   * Original filename
   */
  filename: string;
  /**
   * Overall quality score (0-100)
   */
  overallScore: number;
  /**
   * Whether document meets minimum quality threshold
   */
  meetsMinimumQuality: boolean;
  /**
   * Final verdict
   */
  verdict: AnalysisVerdict;
  /**
   * Dimension scores breakdown
   */
  dimensions: AnalysisDimension[];
  /**
   * Issue summary by severity
   */
  issueSummary: IssueSummary;
  /**
   * Document metadata
   */
  documentInfo: DocumentInfo;
  /**
   * List of improvements/issues (optional - fetched separately)
   */
  improvements?: ReportIssue[];
  /**
   * Callback when download report is clicked
   */
  onDownloadReport?: () => Promise<void>;
  /**
   * Callback when convert to ETP is clicked
   */
  onConvertToEtp?: () => Promise<void>;
  /**
   * Callback when analyze another document is clicked
   */
  onReset?: () => void;
  /**
   * Whether currently downloading report
   */
  isDownloading?: boolean;
  /**
   * Whether currently converting to ETP
   */
  isConverting?: boolean;
  /**
   * Error message to display
   */
  error?: string | null;
  /**
   * Additional class names for container
   */
  className?: string;
}

/**
 * AnalysisResults Component
 *
 * Main component for displaying analysis results. Combines ScoreCard and
 * ImprovementList with action buttons for downloading reports and converting
 * to ETP.
 *
 * @example
 * ```tsx
 * <AnalysisResults
 *   analysisId="abc-123"
 *   filename="documento.pdf"
 *   overallScore={78}
 *   meetsMinimumQuality={true}
 *   verdict="Aprovado com ressalvas"
 *   dimensions={[...]}
 *   issueSummary={{ critical: 1, important: 3, suggestion: 5 }}
 *   documentInfo={{ wordCount: 1500, sectionCount: 8 }}
 *   improvements={[...]}
 *   onDownloadReport={handleDownload}
 *   onConvertToEtp={handleConvert}
 *   onReset={handleReset}
 * />
 * ```
 */
export function AnalysisResults({
  analysisId,
  filename,
  overallScore,
  meetsMinimumQuality,
  verdict,
  dimensions,
  issueSummary,
  documentInfo,
  improvements = [],
  onDownloadReport,
  onConvertToEtp,
  onReset,
  isDownloading = false,
  isConverting = false,
  error,
  className,
}: AnalysisResultsProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = error || localError;

  /**
   * Handle download with error handling
   */
  const handleDownload = useCallback(async () => {
    if (!onDownloadReport) return;

    setLocalError(null);
    try {
      await onDownloadReport();
    } catch {
      setLocalError('Erro ao baixar relatório. Tente novamente.');
    }
  }, [onDownloadReport]);

  /**
   * Handle convert with error handling
   */
  const handleConvert = useCallback(async () => {
    if (!onConvertToEtp) return;

    setLocalError(null);
    try {
      await onConvertToEtp();
    } catch {
      setLocalError('Erro ao converter documento. Tente novamente.');
    }
  }, [onConvertToEtp]);

  return (
    <div className={cn('space-y-6', className)} data-testid="analysis-results">
      {/* Score Card */}
      <ScoreCard
        overallScore={overallScore}
        meetsMinimumQuality={meetsMinimumQuality}
        verdict={verdict}
        dimensions={dimensions}
        issueSummary={issueSummary}
        documentInfo={documentInfo}
        filename={filename}
      />

      {/* Actions Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Download Report */}
          {onDownloadReport && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleDownload}
              disabled={isDownloading || isConverting}
              aria-busy={isDownloading}
            >
              {isDownloading ? (
                <>
                  <RefreshCw
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Baixar Relatório PDF
                </>
              )}
            </Button>
          )}

          {/* Convert to ETP */}
          {onConvertToEtp && (
            <Button
              className="w-full justify-start"
              onClick={handleConvert}
              disabled={isDownloading || isConverting}
              aria-busy={isConverting}
            >
              {isConverting ? (
                <>
                  <RefreshCw
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Convertendo...
                </>
              ) : (
                <>
                  <FileOutput className="mr-2 h-4 w-4" aria-hidden="true" />
                  Criar ETP a partir deste documento
                  <ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          )}

          {/* Reset */}
          {onReset && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={onReset}
              disabled={isDownloading || isConverting}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Analisar outro documento
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Improvements List */}
      {improvements.length > 0 && (
        <ImprovementList issues={improvements} maxInitialItems={5} />
      )}

      {/* Error Message */}
      {displayError && (
        <div
          className="flex items-center gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-lg"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Analysis ID for debugging */}
      <p className="text-xs text-muted-foreground text-center">
        ID da análise: {analysisId}
      </p>
    </div>
  );
}
