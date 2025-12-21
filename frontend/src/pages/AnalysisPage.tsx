import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  FileSearch,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  FileOutput,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/analysis/FileUpload';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Analysis dimension from the API
 */
interface AnalysisDimension {
  dimension: string;
  score: number;
  passed: boolean;
}

/**
 * Issue summary from the API
 */
interface IssueSummary {
  critical: number;
  important: number;
  suggestion: number;
}

/**
 * Document info from the API
 */
interface DocumentInfo {
  wordCount: number;
  sectionCount: number;
}

/**
 * Upload analysis response from the API
 */
interface UploadAnalysisResponse {
  data: {
    analysisId: string;
    originalFilename: string;
    mimeType: string;
    overallScore: number;
    meetsMinimumQuality: boolean;
    verdict: string;
    documentInfo: DocumentInfo;
    issueSummary: IssueSummary;
    dimensions: AnalysisDimension[];
    message: string;
  };
  disclaimer: string;
}

/**
 * Convert to ETP response from the API
 */
interface ConvertToEtpResponse {
  data: {
    etpId: string;
    title: string;
    status: string;
    sectionsCount: number;
    mappedSectionsCount: number;
    customSectionsCount: number;
    convertedAt: string;
    message: string;
  };
  disclaimer: string;
}

/**
 * Upload state machine
 */
type UploadState = 'idle' | 'uploading' | 'analyzing' | 'results' | 'error';

/**
 * Dimension labels in Portuguese
 */
const DIMENSION_LABELS: Record<string, string> = {
  legal: 'Conformidade Legal',
  clarity: 'Clareza e Legibilidade',
  foundation: 'Qualidade da Fundamentação',
};

/**
 * Verdict labels and colors
 */
const VERDICT_CONFIG: Record<string, { label: string; color: string }> = {
  approved: { label: 'Aprovado', color: 'bg-green-500' },
  'needs-review': { label: 'Necessita Revisão', color: 'bg-yellow-500' },
  rejected: { label: 'Reprovado', color: 'bg-red-500' },
};

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get progress color based on value
 */
function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * AnalysisPage Component
 *
 * Provides interface for uploading and analyzing existing ETP documents.
 * Displays analysis results with quality scores and recommendations.
 * Allows converting analyzed documents to new ETPs.
 */
export function AnalysisPage() {
  const navigate = useNavigate();

  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [analysisResult, setAnalysisResult] =
    useState<UploadAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setError(null);
    setAnalysisResult(null);
    setUploadState('idle');
  }, []);

  /**
   * Handle file removal
   */
  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setAnalysisResult(null);
    setUploadState('idle');
  }, []);

  /**
   * Upload and analyze file
   */
  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setUploadState('analyzing');

      const response = await api.post<UploadAnalysisResponse>(
        '/analysis/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      setAnalysisResult(response.data);
      setUploadState('results');
    } catch (err) {
      setUploadState('error');
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: string }).message)
            : 'Erro ao analisar documento. Tente novamente.';
      setError(errorMessage);
    }
  }, [selectedFile]);

  /**
   * Download analysis report as PDF
   */
  const handleDownloadReport = useCallback(async () => {
    if (!analysisResult?.data.analysisId) return;

    try {
      const response = await api.get(
        `/analysis/${analysisResult.data.analysisId}/report/pdf`,
        {
          responseType: 'blob',
        },
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `analise_${analysisResult.data.originalFilename.replace(/\.[^.]+$/, '')}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Erro ao baixar relatório. Tente novamente.');
    }
  }, [analysisResult]);

  /**
   * Convert analyzed document to ETP
   */
  const handleConvertToEtp = useCallback(async () => {
    if (!analysisResult?.data.analysisId) return;

    setIsConverting(true);
    setError(null);

    try {
      const response = await api.post<ConvertToEtpResponse>(
        `/analysis/${analysisResult.data.analysisId}/convert`,
        {},
      );

      // Navigate to the new ETP
      navigate(`/etps/${response.data.data.etpId}`);
    } catch (err) {
      setIsConverting(false);
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: string }).message)
            : 'Erro ao converter documento. Tente novamente.';
      setError(errorMessage);
    }
  }, [analysisResult, navigate]);

  /**
   * Reset to start over
   */
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    setUploadState('idle');
  }, []);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileSearch className="h-8 w-8 text-primary" aria-hidden="true" />
            Import & Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Faça upload de um ETP existente para analisar sua qualidade e
            converter para o sistema
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Upload Area */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload de Documento</CardTitle>
                <CardDescription>
                  Selecione um arquivo PDF ou DOCX para análise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  selectedFile={selectedFile}
                  disabled={
                    uploadState === 'uploading' || uploadState === 'analyzing'
                  }
                  error={uploadState === 'error' ? error : null}
                />

                {selectedFile && uploadState === 'idle' && (
                  <Button
                    onClick={handleAnalyze}
                    className="w-full mt-4"
                    size="lg"
                  >
                    <FileSearch className="mr-2 h-5 w-5" aria-hidden="true" />
                    Analisar Documento
                  </Button>
                )}

                {(uploadState === 'uploading' ||
                  uploadState === 'analyzing') && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <RefreshCw
                        className="h-5 w-5 animate-spin text-primary"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium">
                        {uploadState === 'uploading'
                          ? 'Enviando documento...'
                          : 'Analisando qualidade...'}
                      </span>
                    </div>
                    <Progress value={undefined} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Isso pode levar alguns segundos dependendo do tamanho do
                      documento
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Como funciona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Faça upload</p>
                    <p className="text-sm text-muted-foreground">
                      Selecione um documento ETP existente (PDF ou DOCX)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Análise automática</p>
                    <p className="text-sm text-muted-foreground">
                      O sistema avalia conformidade legal, clareza e
                      fundamentação
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Converta para ETP</p>
                    <p className="text-sm text-muted-foreground">
                      Importe o documento para o sistema e continue editando
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            {/* Loading State */}
            {uploadState === 'analyzing' && (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-center">
                    <Skeleton className="h-32 w-32 rounded-full" />
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {uploadState === 'results' && analysisResult && (
              <>
                {/* Score Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Resultado da Análise</CardTitle>
                        <CardDescription>
                          {analysisResult.data.originalFilename}
                        </CardDescription>
                      </div>
                      <Badge
                        className={cn(
                          'text-white',
                          VERDICT_CONFIG[analysisResult.data.verdict]?.color ||
                            'bg-gray-500',
                        )}
                      >
                        {VERDICT_CONFIG[analysisResult.data.verdict]?.label ||
                          analysisResult.data.verdict}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Overall Score */}
                    <div className="flex flex-col items-center py-4">
                      <div
                        className={cn(
                          'text-5xl font-bold',
                          getScoreColor(analysisResult.data.overallScore),
                        )}
                      >
                        {Math.round(analysisResult.data.overallScore)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pontuação Geral
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {analysisResult.data.meetsMinimumQuality ? (
                          <>
                            <CheckCircle2
                              className="h-4 w-4 text-green-600"
                              aria-hidden="true"
                            />
                            <span className="text-sm text-green-600">
                              Atende qualidade mínima
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle
                              className="h-4 w-4 text-red-600"
                              aria-hidden="true"
                            />
                            <span className="text-sm text-red-600">
                              Não atende qualidade mínima
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Dimensões</h4>
                      {analysisResult.data.dimensions.map((dim) => (
                        <div key={dim.dimension} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              {DIMENSION_LABELS[dim.dimension] || dim.dimension}
                            </span>
                            <span
                              className={cn(
                                'font-medium',
                                getScoreColor(dim.score),
                              )}
                            >
                              {Math.round(dim.score)}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                getProgressColor(dim.score),
                              )}
                              style={{ width: `${dim.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Issues Summary */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {analysisResult.data.issueSummary.critical}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Críticos
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {analysisResult.data.issueSummary.important}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Importantes
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {analysisResult.data.issueSummary.suggestion}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sugestões
                        </p>
                      </div>
                    </div>

                    {/* Document Info */}
                    <div className="flex justify-between text-sm text-muted-foreground pt-4 border-t">
                      <span>
                        {analysisResult.data.documentInfo.wordCount.toLocaleString()}{' '}
                        palavras
                      </span>
                      <span>
                        {analysisResult.data.documentInfo.sectionCount} seções
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleDownloadReport}
                    >
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                      Baixar Relatório PDF
                    </Button>

                    <Button
                      className="w-full justify-start"
                      onClick={handleConvertToEtp}
                      disabled={isConverting}
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
                          <FileOutput
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          Converter para ETP
                          <ArrowRight
                            className="ml-auto h-4 w-4"
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={handleReset}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                      Analisar outro documento
                    </Button>
                  </CardContent>
                </Card>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}
              </>
            )}

            {/* Error State */}
            {uploadState === 'error' && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle
                        className="h-8 w-8 text-destructive"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">Erro na Análise</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {error || 'Ocorreu um erro ao processar o documento.'}
                      </p>
                    </div>
                    <Button onClick={handleReset} variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                      Tentar novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {uploadState === 'idle' && !selectedFile && (
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center text-muted-foreground py-8">
                    <FileSearch className="h-12 w-12 mb-4" aria-hidden="true" />
                    <p>Selecione um documento para ver a análise</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
