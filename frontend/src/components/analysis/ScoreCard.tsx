import { useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type AnalysisDimensionScore,
  type AnalysisVerdict,
  type IssueSummary,
  type DocumentInfo,
  DIMENSION_LABELS,
  VERDICT_CONFIG,
} from '@/types/analysis';

/**
 * Props for ScoreCard component
 */
export interface ScoreCardProps {
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
  dimensions: AnalysisDimensionScore[];
  /**
   * Issue summary by severity
   */
  issueSummary: IssueSummary;
  /**
   * Document metadata
   */
  documentInfo: DocumentInfo;
  /**
   * Original filename
   */
  filename?: string;
  /**
   * Additional class names
   */
  className?: string;
}

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get progress bar color based on score
 */
function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Get stroke color for SVG circle based on score
 */
function getStrokeColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green-500
  if (score >= 60) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

/**
 * Circular progress gauge component
 */
function CircularGauge({
  score,
  size = 140,
  strokeWidth = 10,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn('text-4xl font-bold', getScoreColor(score))}
          aria-label={`Pontuação: ${Math.round(score)} de 100`}
        >
          {Math.round(score)}
        </span>
        <span className="text-xs text-muted-foreground">de 100</span>
      </div>
    </div>
  );
}

/**
 * ScoreCard Component
 *
 * Displays analysis results with a circular score gauge, dimension breakdown,
 * issue summary, and verdict badge.
 *
 * @example
 * ```tsx
 * <ScoreCard
 * overallScore={78}
 * meetsMinimumQuality={true}
 * verdict="Aprovado com ressalvas"
 * dimensions={[
 * { dimension: 'legal', score: 75, passed: true },
 * { dimension: 'clareza', score: 82, passed: true },
 * { dimension: 'fundamentacao', score: 70, passed: true }
 * ]}
 * issueSummary={{ critical: 1, important: 3, suggestion: 5 }}
 * documentInfo={{ wordCount: 1500, sectionCount: 8 }}
 * />
 * ```
 */
export function ScoreCard({
  overallScore,
  meetsMinimumQuality,
  verdict,
  dimensions,
  issueSummary,
  documentInfo,
  filename,
  className,
}: ScoreCardProps) {
  const verdictConfig = VERDICT_CONFIG[verdict];

  const totalIssues = useMemo(
    () =>
      issueSummary.critical + issueSummary.important + issueSummary.suggestion,
    [issueSummary],
  );

  return (
    <GlassSurface
      intensity="medium"
      className={cn(
        'overflow-hidden shadow-lg group cursor-pointer',
        className,
      )}
      style={{
        transition: `
          transform var(--duration-normal) var(--ease-apple-standard),
          box-shadow var(--duration-normal) var(--ease-apple-standard)
        `,
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
        e.currentTarget.style.boxShadow =
          'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))';
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '';
      }}
      onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
      }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Resultado da Análise</CardTitle>
            {filename && (
              <p
                className="text-sm text-muted-foreground mt-1 truncate max-w-[250px]"
                title={filename}
              >
                {filename}
              </p>
            )}
          </div>
          <Badge className={cn('text-white', verdictConfig.bgColor)}>
            {verdictConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score Gauge */}
        <div className="flex flex-col items-center py-4">
          <CircularGauge score={overallScore} />
          <p className="text-sm text-muted-foreground mt-3">Pontuação Geral</p>

          {/* Quality Threshold Indicator */}
          <div className="flex items-center gap-2 mt-2">
            {meetsMinimumQuality ? (
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
                <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                <span className="text-sm text-red-600">
                  Não atende qualidade mínima
                </span>
              </>
            )}
          </div>
        </div>

        {/* Dimension Scores */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm flex items-center gap-2">
            Dimensões Avaliadas
            <span className="text-xs text-muted-foreground font-normal">
              ({dimensions.length})
            </span>
          </h4>
          {dimensions.map((dim) => (
            <div key={dim.dimension} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>
                    {DIMENSION_LABELS[dim.dimension] || dim.dimension}
                  </span>
                  {dim.passed ? (
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-green-600"
                      aria-label="Aprovado"
                    />
                  ) : (
                    <AlertTriangle
                      className="h-3.5 w-3.5 text-yellow-600"
                      aria-label="Atenção necessária"
                    />
                  )}
                </div>
                <span className={cn('font-medium', getScoreColor(dim.score))}>
                  {Math.round(dim.score)}%
                </span>
              </div>
              <div
                className="h-2 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={dim.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${DIMENSION_LABELS[dim.dimension]}: ${Math.round(dim.score)}%`}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    getProgressColor(dim.score),
                  )}
                  style={{ width: `${dim.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Issues Summary */}
        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
            Problemas Identificados
            <span className="text-xs text-muted-foreground font-normal">
              ({totalIssues} total)
            </span>
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">
                {issueSummary.critical}
              </div>
              <p className="text-xs text-red-600/80 mt-1">Críticos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">
                {issueSummary.important}
              </div>
              <p className="text-xs text-yellow-600/80 mt-1">Importantes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {issueSummary.suggestion}
              </div>
              <p className="text-xs text-blue-600/80 mt-1">Sugestões</p>
            </div>
          </div>
        </div>

        {/* Document Info */}
        <div className="flex justify-between text-sm text-muted-foreground pt-4 border-t">
          <span>{documentInfo.wordCount.toLocaleString('pt-BR')} palavras</span>
          <span>{documentInfo.sectionCount} seções</span>
        </div>
      </CardContent>
    </GlassSurface>
  );
}
