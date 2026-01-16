import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Database,
  Building,
  Truck,
  FileText,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { usePesquisaPrecosStore } from '@/store/pesquisaPrecosStore';
import {
  PRICE_SOURCES,
  PriceSourceType,
} from '@/schemas/pesquisaPrecosSchema';
import type { PesquisaWizardStepProps } from './CreatePesquisaPrecosWizard';
import type { PesquisaItem } from '@/schemas/pesquisaPrecosSchema';

/**
 * Status of each price source during collection
 */
type SourceStatus = 'pending' | 'loading' | 'success' | 'error';

interface SourceCollectionState {
  sourceId: PriceSourceType;
  status: SourceStatus;
  resultCount: number;
  errorMessage?: string;
}

/**
 * Get icon for price source
 */
function getSourceIcon(sourceId: PriceSourceType, size = 4) {
  const iconClass = `w-${size} h-${size}`;
  switch (sourceId) {
    case PriceSourceType.PNCP:
      return <Building className={cn(iconClass, 'text-blue-600')} />;
    case PriceSourceType.SINAPI:
      return <Database className={cn(iconClass, 'text-green-600')} />;
    case PriceSourceType.SICRO:
      return <Truck className={cn(iconClass, 'text-orange-600')} />;
    case PriceSourceType.ATAS:
      return <FileText className={cn(iconClass, 'text-purple-600')} />;
    default:
      return <Database className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

/**
 * Step 4 - Execute price search across selected sources
 *
 * Features:
 * - Start/retry collection button
 * - Progress bar showing overall progress
 * - Status indicator per source
 * - Error handling with retry capability
 * - Timeout handling
 *
 * @see Issue #1508 - Steps 3-4 implementation
 */
export function StepExecuteSearch({ form }: PesquisaWizardStepProps) {
  const { watch, setValue, getValues } = form;
  const itemsRaw = watch('items');
  const selectedSourcesRaw = watch('selectedSources');
  const items = useMemo(() => itemsRaw || [], [itemsRaw]);
  const selectedSources = useMemo(() => selectedSourcesRaw || [], [selectedSourcesRaw]);
  const isExecuting = watch('isExecuting');
  const executionProgress = watch('executionProgress');
  const executionErrorsRaw = watch('executionErrors');
  const executionErrors = useMemo(() => executionErrorsRaw || [], [executionErrorsRaw]);

  // Store access
  const { createPesquisa, collectPrices, currentPesquisa, error: storeError } =
    usePesquisaPrecosStore();

  // Local state for source-level tracking
  const [sourceStates, setSourceStates] = useState<SourceCollectionState[]>([]);
  const [collectionStarted, setCollectionStarted] = useState(false);
  const [totalResultsCount, setTotalResultsCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Ref for timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Memoize automatic sources for stable reference
  const automaticSources = useMemo(
    () => selectedSources.filter((s) => s !== PriceSourceType.MANUAL),
    [selectedSources],
  );

  // Initialize source states when sources change
  useEffect(() => {
    if (automaticSources.length > 0) {
      setSourceStates(
        automaticSources.map((sourceId) => ({
          sourceId,
          status: 'pending' as SourceStatus,
          resultCount: 0,
        })),
      );
    }
  }, [automaticSources]);

  // Timer for elapsed time
  useEffect(() => {
    if (isExecuting) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isExecuting]);

  // Start collection process
  const handleStartCollection = useCallback(async () => {
    const currentItems = getValues('items') || [];
    const currentSources = getValues('selectedSources') || [];

    if (currentItems.length === 0 || currentSources.length === 0) {
      return;
    }

    setCollectionStarted(true);
    setValue('isExecuting', true);
    setValue('executionProgress', 0);
    setValue('executionErrors', []);

    // Set all sources to loading
    setSourceStates((prev) =>
      prev.map((s) => ({ ...s, status: 'loading' as SourceStatus })),
    );

    try {
      // Get base type and ID from form
      const baseType = getValues('baseType');
      const baseId = getValues('baseId');

      // Create pesquisa first if not exists
      let pesquisaId = currentPesquisa?.id;

      if (!pesquisaId) {
        const pesquisa = await createPesquisa({
          etpId: baseType === 'etp' ? baseId ?? undefined : undefined,
          trId: baseType === 'tr' ? baseId ?? undefined : undefined,
          items: currentItems as PesquisaItem[],
          sources: currentSources,
        });
        pesquisaId = pesquisa.id;
      }

      // Simulate progress updates (real progress comes from backend)
      const progressInterval = setInterval(() => {
        const currentProgress = getValues('executionProgress') || 0;
        const newProgress = Math.min(currentProgress + 5, 90);
        setValue('executionProgress', newProgress);
      }, 500);

      // Execute price collection
      const result = await collectPrices(pesquisaId);

      clearInterval(progressInterval);

      // Update source states based on results
      const newSourceStates: SourceCollectionState[] = [];
      let totalResults = 0;

      for (const source of currentSources.filter(
        (s) => s !== PriceSourceType.MANUAL,
      )) {
        // Find results for this source
        const sourceResults = result.results.filter(
          (r) =>
            r.results &&
            r.results.some(
              (pr) => pr.source === source,
            ),
        );

        const resultCount = sourceResults.reduce(
          (acc, r) => acc + (r.results?.filter((pr) => pr.source === source).length || 0),
          0,
        );

        totalResults += resultCount;

        newSourceStates.push({
          sourceId: source,
          status: resultCount > 0 ? 'success' : 'error',
          resultCount,
          errorMessage:
            resultCount === 0 ? 'Nenhum preco encontrado' : undefined,
        });
      }

      setSourceStates(newSourceStates);
      setTotalResultsCount(totalResults);

      // Update form state
      setValue('executionProgress', 100);
      setValue('isExecuting', false);

      // Store results in form for next step
      const allResults = result.results.flatMap((r) => r.results || []);
      setValue('results', allResults);
    } catch (error) {
      // Handle errors
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido na coleta';

      setValue('executionErrors', [errorMessage]);
      setValue('isExecuting', false);

      // Mark all loading sources as error
      setSourceStates((prev) =>
        prev.map((s) =>
          s.status === 'loading'
            ? { ...s, status: 'error' as SourceStatus, errorMessage }
            : s,
        ),
      );
    }
  }, [
    getValues,
    setValue,
    createPesquisa,
    collectPrices,
    currentPesquisa,
  ]);

  // Retry collection
  const handleRetry = useCallback(() => {
    const currentSources = getValues('selectedSources') || [];
    setCollectionStarted(false);
    setTotalResultsCount(0);
    setValue('executionProgress', 0);
    setValue('executionErrors', []);
    setValue('results', []);
    setSourceStates(
      currentSources
        .filter((s) => s !== PriceSourceType.MANUAL)
        .map((sourceId) => ({
          sourceId,
          status: 'pending' as SourceStatus,
          resultCount: 0,
        })),
    );
  }, [getValues, setValue]);

  // Calculate overall status
  const hasErrors = sourceStates.some((s) => s.status === 'error');
  const allSuccess =
    sourceStates.length > 0 && sourceStates.every((s) => s.status === 'success');
  const isComplete = collectionStarted && !isExecuting;

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      {/* Header */}
      <div>
        <p className="text-sm font-medium">Execucao da Pesquisa</p>
        <p className="text-xs text-muted-foreground mt-1">
          {!collectionStarted
            ? 'Clique em iniciar para coletar precos das fontes selecionadas.'
            : isExecuting
              ? 'Coletando precos... Isso pode levar alguns minutos.'
              : 'Coleta concluida. Revise os resultados no proximo passo.'}
        </p>
      </div>

      {/* Progress section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
        className="p-4 border rounded-lg bg-muted/30"
      >
        {/* Progress bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <Progress value={executionProgress} className="flex-1 h-3" />
          <span className="text-sm font-medium w-12 text-right">
            {executionProgress}%
          </span>
        </div>

        {/* Status summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            {isExecuting && (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Pesquisando {items.length}{' '}
                  {items.length === 1 ? 'item' : 'itens'} em{' '}
                  {sourceStates.length}{' '}
                  {sourceStates.length === 1 ? 'fonte' : 'fontes'}...
                </span>
              </>
            )}
            {isComplete && allSuccess && (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">
                  Coleta concluida com sucesso!
                </span>
              </>
            )}
            {isComplete && hasErrors && !allSuccess && (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-600">
                  Coleta concluida com avisos
                </span>
              </>
            )}
            {!collectionStarted && (
              <span className="text-sm text-muted-foreground">
                Aguardando inicio da coleta
              </span>
            )}
          </div>

          {/* Timer */}
          {(isExecuting || isComplete) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
              }}
            >
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono">
                {formatTime(elapsedTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Source status list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Status por Fonte
        </p>

        <div className="h-[180px] overflow-y-auto pr-2">
          {sourceStates.map((sourceState) => {
            const sourceInfo = PRICE_SOURCES.find(
              (s) => s.id === sourceState.sourceId,
            );

            return (
              <div
                key={sourceState.sourceId}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border mb-2 transition-colors',
                  sourceState.status === 'loading' && 'bg-blue-50/50 border-blue-200',
                  sourceState.status === 'success' && 'bg-green-50/50 border-green-200',
                  sourceState.status === 'error' && 'bg-red-50/50 border-red-200',
                  sourceState.status === 'pending' && 'bg-muted/30',
                )}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {getSourceIcon(sourceState.sourceId)}
                </div>

                {/* Source info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {sourceInfo?.name || sourceState.sourceId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sourceState.status === 'pending' && 'Aguardando...'}
                    {sourceState.status === 'loading' && 'Consultando API...'}
                    {sourceState.status === 'success' &&
                      `${sourceState.resultCount} ${sourceState.resultCount === 1 ? 'preco encontrado' : 'precos encontrados'}`}
                    {sourceState.status === 'error' &&
                      (sourceState.errorMessage || 'Erro na consulta')}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="flex-shrink-0">
                  {sourceState.status === 'pending' && (
                    <Badge variant="secondary" className="text-xs">
                      Pendente
                    </Badge>
                  )}
                  {sourceState.status === 'loading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  )}
                  {sourceState.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  {sourceState.status === 'error' && (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results summary */}
      {isComplete && totalResultsCount > 0 && (
        <Alert className="bg-green-50/50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">
            Coleta finalizada
          </AlertTitle>
          <AlertDescription className="text-green-700">
            Foram encontrados {totalResultsCount}{' '}
            {totalResultsCount === 1 ? 'preco' : 'precos'} para os{' '}
            {items.length} {items.length === 1 ? 'item' : 'itens'} pesquisados.
            Avance para revisar os resultados.
          </AlertDescription>
        </Alert>
      )}

      {/* Error display */}
      {executionErrors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erro na coleta</AlertTitle>
          <AlertDescription>
            {executionErrors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Store error */}
      {storeError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{storeError}</AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-2)',
        }}
      >
        {!collectionStarted && (
          <Button
            type="button"
            onClick={handleStartCollection}
            disabled={
              items.length === 0 || selectedSources.length === 0 || isExecuting
            }
            size="lg"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Pesquisa
          </Button>
        )}

        {isComplete && (hasErrors || executionErrors.length > 0) && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRetry}
            disabled={isExecuting}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        )}

        {isExecuting && (
          <Button type="button" variant="ghost" disabled>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Pesquisando...
          </Button>
        )}
      </div>

      {/* Info about manual sources */}
      {selectedSources.includes(PriceSourceType.MANUAL) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Voce selecionou a opcao de cotacao manual. Apos a coleta automatica,
            voce podera adicionar cotacoes manualmente na etapa de revisao.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
