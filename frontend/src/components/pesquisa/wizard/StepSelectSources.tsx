import { useCallback } from 'react';
import {
  Database,
  Building,
  Truck,
  FileText,
  User,
  CheckCircle2,
  Circle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  PRICE_SOURCES,
  PriceSourceType,
} from '@/schemas/pesquisaPrecosSchema';
import type { PesquisaWizardStepProps } from './CreatePesquisaPrecosWizard';

/**
 * Get icon for price source
 */
function getSourceIcon(sourceId: PriceSourceType) {
  switch (sourceId) {
    case PriceSourceType.PNCP:
      return <Building className="w-5 h-5 text-blue-600" />;
    case PriceSourceType.SINAPI:
      return <Database className="w-5 h-5 text-green-600" />;
    case PriceSourceType.SICRO:
      return <Truck className="w-5 h-5 text-orange-600" />;
    case PriceSourceType.ATAS:
      return <FileText className="w-5 h-5 text-purple-600" />;
    case PriceSourceType.MANUAL:
      return <User className="w-5 h-5 text-gray-600" />;
    default:
      return <Database className="w-5 h-5 text-muted-foreground" />;
  }
}

/**
 * Get extended description for each source
 */
function getSourceExtendedDescription(sourceId: PriceSourceType): string {
  switch (sourceId) {
    case PriceSourceType.PNCP:
      return 'Consulta automatica ao Portal Nacional de Contratacoes Publicas para precos de contratos similares.';
    case PriceSourceType.SINAPI:
      return 'Sistema Nacional de Pesquisa de Custos e Indices da Construcao Civil mantido pela Caixa/IBGE.';
    case PriceSourceType.SICRO:
      return 'Sistema de Custos Referenciais de Obras mantido pelo DNIT para infraestrutura de transportes.';
    case PriceSourceType.ATAS:
      return 'Precos de atas de registro de precos vigentes na base do PNCP.';
    case PriceSourceType.MANUAL:
      return 'Permite adicionar cotacoes obtidas diretamente com fornecedores.';
    default:
      return '';
  }
}

/**
 * Step 3 - Select price sources to query
 *
 * Features:
 * - Checkbox-style cards for each source
 * - Visual indicator for automatic vs manual sources
 * - Extended description on hover/tooltip
 * - Validation: minimum 1 source selected
 *
 * @see Issue #1508 - Steps 3-4 implementation
 */
export function StepSelectSources({ form }: PesquisaWizardStepProps) {
  const { watch, setValue, formState, getValues } = form;
  const selectedSourcesRaw = watch('selectedSources');
  const selectedSources = selectedSourcesRaw || [];

  // Handle source toggle
  const handleSourceToggle = useCallback(
    (sourceId: PriceSourceType) => {
      const current = getValues('selectedSources') || [];
      const isSelected = current.includes(sourceId);

      if (isSelected) {
        // Remove source
        setValue(
          'selectedSources',
          current.filter((s) => s !== sourceId),
        );
      } else {
        // Add source
        setValue('selectedSources', [...current, sourceId]);
      }
    },
    [getValues, setValue],
  );

  // Handle select all automatic sources
  const handleSelectAllAutomatic = useCallback(() => {
    const automaticSources = PRICE_SOURCES.filter((s) => s.isAutomatic).map(
      (s) => s.id,
    );
    setValue('selectedSources', automaticSources);
  }, [setValue]);

  // Check if all automatic sources are selected
  const allAutomaticSelected = PRICE_SOURCES.filter(
    (s) => s.isAutomatic,
  ).every((s) => selectedSources.includes(s.id));

  // Get validation error
  const sourcesError =
    formState.errors.selectedSources?.message ||
    (formState.errors.selectedSources as { root?: { message?: string } })?.root
      ?.message;

  // Count selected sources
  const automaticCount = selectedSources.filter((s) =>
    PRICE_SOURCES.find((ps) => ps.id === s && ps.isAutomatic),
  ).length;
  const manualCount = selectedSources.filter(
    (s) => !PRICE_SOURCES.find((ps) => ps.id === s && ps.isAutomatic),
  ).length;

  return (
    <TooltipProvider>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Header with quick action */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <Label className="text-sm font-medium">
              Selecione as Fontes de Precos
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Escolha uma ou mais fontes para pesquisar precos. Fontes
              automaticas consultam APIs governamentais.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSelectAllAutomatic}
            className={cn(
              'text-xs px-2 py-1 rounded-md transition-colors',
              allAutomaticSelected
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {allAutomaticSelected ? 'Todas automaticas selecionadas' : 'Selecionar todas automaticas'}
          </button>
        </div>

        {/* Validation error */}
        {sourcesError && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>{sourcesError}</AlertDescription>
          </Alert>
        )}

        {/* Sources list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {PRICE_SOURCES.map((source) => {
            const isSelected = selectedSources.includes(source.id);

            return (
              <Tooltip key={source.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleSourceToggle(source.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50',
                    )}
                  >
                    {/* Selection indicator */}
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {getSourceIcon(source.id)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <span className="font-medium text-sm">
                          {source.name}
                        </span>
                        <Badge
                          variant={source.isAutomatic ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {source.isAutomatic ? 'Automatico' : 'Manual'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {source.description}
                      </p>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">
                    {getSourceExtendedDescription(source.id)}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Selection summary */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            paddingTop: 'var(--space-2)',
          }}
          className="border-t"
        >
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {selectedSources.length === 0 ? (
                <span className="text-amber-600">
                  Selecione pelo menos uma fonte para continuar
                </span>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {selectedSources.length}
                  </span>{' '}
                  {selectedSources.length === 1
                    ? 'fonte selecionada'
                    : 'fontes selecionadas'}
                  {automaticCount > 0 && (
                    <span className="text-green-600">
                      {' '}
                      ({automaticCount} automatica
                      {automaticCount > 1 ? 's' : ''})
                    </span>
                  )}
                  {manualCount > 0 && (
                    <span className="text-gray-600">
                      {' '}
                      ({manualCount} manual)
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Info about automatic sources */}
        {automaticCount > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              As fontes automaticas consultam APIs governamentais em tempo real.
              O tempo de resposta pode variar de acordo com a disponibilidade
              dos sistemas.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TooltipProvider>
  );
}
