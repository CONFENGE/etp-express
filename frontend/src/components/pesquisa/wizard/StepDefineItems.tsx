import { useEffect, useMemo, useCallback } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Plus, Trash2, AlertCircle, Package, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useETPStore } from '@/store/etpStore';
import { useTRStore } from '@/store/trStore';
import type { PesquisaWizardStepProps } from './CreatePesquisaPrecosWizard';
import type { PesquisaItem } from '@/schemas/pesquisaPrecosSchema';

/**
 * Step 2 - Define items to research prices for
 *
 * Features:
 * - Extract items automatically from ETP/TR
 * - Add items manually
 * - Edit description/quantity/unit
 * - Remove items
 * - Validation: minimum 1 item to proceed
 *
 * @see Issue #1507 - Steps 1-2 implementation
 */
export function StepDefineItems({ form }: PesquisaWizardStepProps) {
  const { watch, control, formState } = form;
  const baseType = watch('baseType');
  const baseId = watch('baseId');

  // Field array for items
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Store states
  const { etps, isLoading: etpsLoading, fetchETP } = useETPStore();
  const { trs, isLoading: trsLoading, fetchTR } = useTRStore();

  // Get selected document
  const selectedEtp = useMemo(
    () => (baseType === 'etp' && baseId ? etps.find((e) => e.id === baseId) : null),
    [baseType, baseId, etps],
  );

  const selectedTr = useMemo(
    () => (baseType === 'tr' && baseId ? trs.find((t) => t.id === baseId) : null),
    [baseType, baseId, trs],
  );

  // Auto-extract items from selected document on mount/change
  useEffect(() => {
    if (!baseId || fields.length > 0) return;

    // Extract items from ETP sections
    if (baseType === 'etp' && selectedEtp) {
      const extractedItems = extractItemsFromETP(selectedEtp);
      extractedItems.forEach((item) => append(item));
    }

    // Extract items from TR
    if (baseType === 'tr' && selectedTr) {
      const extractedItems = extractItemsFromTR(selectedTr);
      extractedItems.forEach((item) => append(item));
    }
  }, [baseId, baseType, selectedEtp, selectedTr, append, fields.length]);

  // Fetch full document if needed
  useEffect(() => {
    if (baseType === 'etp' && baseId && !selectedEtp) {
      fetchETP(baseId);
    }
    if (baseType === 'tr' && baseId && !selectedTr) {
      fetchTR(baseId);
    }
  }, [baseType, baseId, selectedEtp, selectedTr, fetchETP, fetchTR]);

  // Add new manual item
  const handleAddItem = useCallback(() => {
    const newItem: PesquisaItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit: 'un',
    };
    append(newItem);
  }, [append]);

  // Get validation error for items
  const itemsError = formState.errors.items?.message || formState.errors.items?.root?.message;

  const isLoading = etpsLoading || trsLoading;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      {/* Header with add button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Label className="text-sm font-medium">Itens para Pesquisa</Label>
          <p className="text-xs text-muted-foreground mt-1">
            {fields.length === 0
              ? 'Adicione pelo menos um item para pesquisar precos'
              : `${fields.length} ${fields.length === 1 ? 'item' : 'itens'} definidos`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar Item
        </Button>
      </div>

      {/* Validation error */}
      {itemsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{itemsError}</AlertDescription>
        </Alert>
      )}

      {/* No base document selected warning */}
      {!baseId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione um ETP ou TR no passo anterior para extrair itens automaticamente,
            ou adicione itens manualmente.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Carregando documento...
          </span>
        </div>
      )}

      {/* Items list */}
      {!isLoading && (
        <div className="h-[250px] pr-4 overflow-y-auto">
          {fields.length === 0 ? (
            <EmptyItemsState onAddItem={handleAddItem} />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              {fields.map((field, index) => (
                <ItemRow
                  key={field.id}
                  index={index}
                  form={form}
                  onRemove={() => remove(index)}
                  canRemove={fields.length > 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface ItemRowProps {
  index: number;
  form: PesquisaWizardStepProps['form'];
  onRemove: () => void;
  canRemove: boolean;
}

function ItemRow({ index, form, onRemove, canRemove }: ItemRowProps) {
  const { register, formState } = form;
  const errors = formState.errors.items?.[index];

  return (
    <div
      className={cn(
        'p-4 border rounded-lg transition-colors',
        errors ? 'border-destructive/50 bg-destructive/5' : 'border-border',
      )}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 'var(--space-3)',
        }}
      >
        {/* Description */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          <Label htmlFor={`items.${index}.description`} className="text-xs">
            Descricao do Item
          </Label>
          <Input
            id={`items.${index}.description`}
            {...register(`items.${index}.description`)}
            placeholder="Ex: Computador Desktop Core i5"
            className={cn(errors?.description && 'border-destructive')}
          />
          {errors?.description && (
            <span className="text-xs text-destructive">
              {errors.description.message}
            </span>
          )}
        </div>

        {/* Remove button */}
        <div className="flex items-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={!canRemove}
            className="text-muted-foreground hover:text-destructive"
            title={canRemove ? 'Remover item' : 'Minimo 1 item necessario'}
            aria-label={canRemove ? 'Remover item' : 'Minimo 1 item necessario'}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quantity and Unit */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          <Label htmlFor={`items.${index}.quantity`} className="text-xs">
            Quantidade
          </Label>
          <Input
            id={`items.${index}.quantity`}
            type="number"
            min="0.01"
            step="0.01"
            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
            className={cn(errors?.quantity && 'border-destructive')}
          />
          {errors?.quantity && (
            <span className="text-xs text-destructive">
              {errors.quantity.message}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          <Label htmlFor={`items.${index}.unit`} className="text-xs">
            Unidade
          </Label>
          <Input
            id={`items.${index}.unit`}
            {...register(`items.${index}.unit`)}
            placeholder="un, m, kg, L"
            className={cn(errors?.unit && 'border-destructive')}
          />
          {errors?.unit && (
            <span className="text-xs text-destructive">
              {errors.unit.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmptyItemsStateProps {
  onAddItem: () => void;
}

function EmptyItemsState({ onAddItem }: EmptyItemsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg">
      <Package className="w-12 h-12 text-muted-foreground mb-3" />
      <p className="text-sm font-medium">Nenhum item definido</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Adicione itens manualmente ou selecione um ETP/TR no passo anterior
        para extrai-los automaticamente.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAddItem}
        className="mt-4"
      >
        <Plus className="w-4 h-4 mr-1" />
        Adicionar Primeiro Item
      </Button>
    </div>
  );
}

// ============================================
// Helper functions for extracting items
// ============================================

import type { ETP } from '@/types/etp';
import type { TermoReferencia } from '@/types/termo-referencia';

/**
 * Extract potential items from ETP sections
 * Looks for cost estimation sections and extracts items
 */
function extractItemsFromETP(etp: ETP): PesquisaItem[] {
  const items: PesquisaItem[] = [];

  // Look for section with cost estimation (usually section 8 or similar)
  const costSection = etp.sections.find(
    (s) =>
      s.sectionNumber === 8 ||
      s.title.toLowerCase().includes('custo') ||
      s.title.toLowerCase().includes('estimativa'),
  );

  if (costSection?.content) {
    // Try to extract items from structured content
    // This is a basic extraction - can be improved with more sophisticated parsing
    const lines = costSection.content.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      // Skip lines that look like headers or labels
      if (line.length < 5 || line.startsWith('#')) continue;

      // Try to match patterns like "Item: description" or "- description"
      const match = line.match(/^(?:[-•*]|\d+[.)]?)\s*(.+)/);
      if (match && match[1].length > 3) {
        items.push({
          id: crypto.randomUUID(),
          description: match[1].trim().substring(0, 200),
          quantity: 1,
          unit: 'un',
        });
      }
    }
  }

  // If no items found, create a default item based on ETP title
  if (items.length === 0 && etp.title) {
    items.push({
      id: crypto.randomUUID(),
      description: etp.title,
      quantity: 1,
      unit: 'un',
    });
  }

  // Limit to 10 items to avoid overwhelming the user
  return items.slice(0, 10);
}

/**
 * Extract items from Termo de Referencia
 * Uses object description and specifications
 */
function extractItemsFromTR(tr: TermoReferencia): PesquisaItem[] {
  const items: PesquisaItem[] = [];

  // Primary item from TR object
  if (tr.objeto) {
    items.push({
      id: crypto.randomUUID(),
      description: tr.objeto.substring(0, 200),
      quantity: 1,
      unit: 'un',
    });
  }

  // Try to extract from technical specifications
  if (tr.especificacoesTecnicas && typeof tr.especificacoesTecnicas === 'object') {
    const specs = tr.especificacoesTecnicas as Record<string, unknown>;
    if (Array.isArray(specs.items)) {
      for (const item of specs.items.slice(0, 9)) {
        if (typeof item === 'object' && item !== null) {
          const specItem = item as Record<string, unknown>;
          items.push({
            id: crypto.randomUUID(),
            description: String(specItem.description || specItem.name || '').substring(0, 200),
            quantity: Number(specItem.quantity) || 1,
            unit: String(specItem.unit || 'un'),
          });
        }
      }
    }
  }

  // Limit to 10 items
  return items.slice(0, 10);
}
