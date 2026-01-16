import { useEffect, useState, useMemo } from 'react';
import { Search, FileText, FileCheck, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useETPStore } from '@/store/etpStore';
import { useTRStore } from '@/store/trStore';
import type { PesquisaWizardStepProps } from './CreatePesquisaPrecosWizard';
import type { ETP } from '@/types/etp';
import type { TermoReferencia } from '@/types/termo-referencia';

/**
 * Step 1 - Select ETP or TR as base for price research
 *
 * Features:
 * - Toggle between ETP and TR list
 * - Search/filter documents
 * - Preview selected item
 * - Only shows approved/completed items
 *
 * @see Issue #1507 - Steps 1-2 implementation
 */
export function StepSelectBase({ form }: PesquisaWizardStepProps) {
  const { watch, setValue } = form;
  const baseType = watch('baseType');
  const baseId = watch('baseId');

  // Store states
  const { etps, isLoading: etpsLoading, fetchETPs } = useETPStore();
  const { trs, isLoading: trsLoading, fetchTRs } = useTRStore();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data on mount
  useEffect(() => {
    if (etps.length === 0) {
      fetchETPs();
    }
    if (trs.length === 0) {
      fetchTRs();
    }
  }, [etps.length, trs.length, fetchETPs, fetchTRs]);

  // Filter ETPs - only show completed or review status
  const filteredEtps = useMemo(() => {
    return etps
      .filter(
        (etp) => etp.status === 'completed' || etp.status === 'review',
      )
      .filter(
        (etp) =>
          !searchTerm ||
          etp.title.toLowerCase().includes(searchTerm.toLowerCase()),
      );
  }, [etps, searchTerm]);

  // Filter TRs - only show approved or review status
  const filteredTrs = useMemo(() => {
    return trs
      .filter(
        (tr) => tr.status === 'approved' || tr.status === 'review',
      )
      .filter(
        (tr) =>
          !searchTerm ||
          tr.objeto.toLowerCase().includes(searchTerm.toLowerCase()),
      );
  }, [trs, searchTerm]);

  // Handle base type change
  const handleBaseTypeChange = (type: 'etp' | 'tr') => {
    setValue('baseType', type);
    setValue('baseId', null); // Reset selection when changing type
    setSearchTerm('');
  };

  // Handle item selection
  const handleSelectItem = (id: string) => {
    setValue('baseId', id);
  };

  // Get selected item details
  const selectedEtp = baseType === 'etp' && baseId
    ? etps.find((e) => e.id === baseId) ?? null
    : null;
  const selectedTr = baseType === 'tr' && baseId
    ? trs.find((t) => t.id === baseId) ?? null
    : null;

  const isLoading = etpsLoading || trsLoading;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      {/* Base Type Selection */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        <Label className="text-sm font-medium">
          Selecione o tipo de documento base
        </Label>
        <RadioGroup
          value={baseType ?? undefined}
          onValueChange={(value) => handleBaseTypeChange(value as 'etp' | 'tr')}
          className="grid grid-cols-2 gap-4"
        >
          <Label
            htmlFor="base-etp"
            className={cn(
              'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
              baseType === 'etp'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50',
            )}
          >
            <RadioGroupItem value="etp" id="base-etp" />
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <span className="font-medium">ETP</span>
              <p className="text-xs text-muted-foreground">
                Estudo Tecnico Preliminar
              </p>
            </div>
          </Label>
          <Label
            htmlFor="base-tr"
            className={cn(
              'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
              baseType === 'tr'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50',
            )}
          >
            <RadioGroupItem value="tr" id="base-tr" />
            <FileCheck className="w-5 h-5 text-green-600" />
            <div>
              <span className="font-medium">Termo de Referencia</span>
              <p className="text-xs text-muted-foreground">
                Documento de contratacao
              </p>
            </div>
          </Label>
        </RadioGroup>
      </div>

      {/* Document Selection */}
      {baseType && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Buscar ${baseType === 'etp' ? 'ETP' : 'TR'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 'var(--space-10)' }}
            />
          </div>

          {/* Document List */}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[200px] border rounded-lg overflow-y-auto">
              <div className="p-2">
                {baseType === 'etp' ? (
                  filteredEtps.length === 0 ? (
                    <EmptyState type="etp" hasSearch={!!searchTerm} />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                      }}
                    >
                      {filteredEtps.map((etp) => (
                        <ETPListItem
                          key={etp.id}
                          etp={etp}
                          isSelected={baseId === etp.id}
                          onSelect={() => handleSelectItem(etp.id)}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  filteredTrs.length === 0 ? (
                    <EmptyState type="tr" hasSearch={!!searchTerm} />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                      }}
                    >
                      {filteredTrs.map((tr) => (
                        <TRListItem
                          key={tr.id}
                          tr={tr}
                          isSelected={baseId === tr.id}
                          onSelect={() => handleSelectItem(tr.id)}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Item Preview */}
      {(selectedEtp || selectedTr) && (
        <SelectedItemPreview etp={selectedEtp} tr={selectedTr} />
      )}
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface ETPListItemProps {
  etp: ETP;
  isSelected: boolean;
  onSelect: () => void;
}

function ETPListItem({ etp, isSelected, onSelect }: ETPListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center justify-between p-3 rounded-md text-left transition-colors',
        isSelected
          ? 'bg-primary/10 border border-primary'
          : 'hover:bg-muted',
      )}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm truncate max-w-[250px]">
            {etp.title || 'ETP sem titulo'}
          </p>
          <p className="text-xs text-muted-foreground">
            Progresso: {etp.progress}%
          </p>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <Badge
          variant={etp.status === 'completed' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {etp.status === 'completed' ? 'Concluido' : 'Em revisao'}
        </Badge>
        {isSelected && <ChevronRight className="w-4 h-4 text-primary" />}
      </div>
    </button>
  );
}

interface TRListItemProps {
  tr: TermoReferencia;
  isSelected: boolean;
  onSelect: () => void;
}

function TRListItem({ tr, isSelected, onSelect }: TRListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center justify-between p-3 rounded-md text-left transition-colors',
        isSelected
          ? 'bg-primary/10 border border-primary'
          : 'hover:bg-muted',
      )}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <FileCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm truncate max-w-[250px]">
            {tr.objeto || 'TR sem objeto'}
          </p>
          <p className="text-xs text-muted-foreground">
            Versao {tr.versao}
          </p>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <Badge
          variant={tr.status === 'approved' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {tr.status === 'approved' ? 'Aprovado' : 'Em revisao'}
        </Badge>
        {isSelected && <ChevronRight className="w-4 h-4 text-primary" />}
      </div>
    </button>
  );
}

interface EmptyStateProps {
  type: 'etp' | 'tr';
  hasSearch: boolean;
}

function EmptyState({ type, hasSearch }: EmptyStateProps) {
  const label = type === 'etp' ? 'ETPs' : 'Termos de Referencia';

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      {type === 'etp' ? (
        <FileText className="w-8 h-8 text-muted-foreground mb-2" />
      ) : (
        <FileCheck className="w-8 h-8 text-muted-foreground mb-2" />
      )}
      <p className="text-sm text-muted-foreground">
        {hasSearch
          ? `Nenhum ${label} encontrado com este termo`
          : `Nenhum ${label} aprovado ou em revisao disponivel`}
      </p>
    </div>
  );
}

interface SelectedItemPreviewProps {
  etp: ETP | null;
  tr: TermoReferencia | null;
}

function SelectedItemPreview({ etp, tr }: SelectedItemPreviewProps) {
  if (etp) {
    return (
      <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
          }}
        >
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">ETP Selecionado</p>
            <p className="text-sm text-muted-foreground mt-1">
              {etp.title || 'Sem titulo'}
            </p>
            {etp.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {etp.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {etp.sections.length} secoes | Progresso: {etp.progress}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (tr) {
    return (
      <div className="p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
          }}
        >
          <FileCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Termo de Referencia Selecionado</p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {tr.objeto || 'Sem objeto definido'}
            </p>
            {tr.valorEstimado && (
              <p className="text-xs text-muted-foreground mt-1">
                Valor estimado: R$ {tr.valorEstimado.toLocaleString('pt-BR')}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Versao {tr.versao} | Status:{' '}
              {tr.status === 'approved' ? 'Aprovado' : 'Em revisao'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
