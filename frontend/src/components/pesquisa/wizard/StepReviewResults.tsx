import { useCallback, useState, useMemo } from 'react';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePesquisaPrecosStore } from '@/store/pesquisaPrecosStore';
import type { PesquisaWizardStepProps } from './CreatePesquisaPrecosWizard';
import type { PriceResult, PesquisaItem } from '@/schemas/pesquisaPrecosSchema';
import { PriceSourceType } from '@/schemas/pesquisaPrecosSchema';
import { PriceComparisonTable } from './PriceComparisonTable';
import { PriceEditModal } from './PriceEditModal';

/**
 * Step 5 - Review results and select final prices
 *
 * Features:
 * - Display price comparison table
 * - Allow selecting preferred price for each item
 * - Add/edit manual quotations
 * - Add justifications
 * - Save final pesquisa
 *
 * @see Issue #1509 - Step 5 implementation
 */
export function StepReviewResults({ form }: PesquisaWizardStepProps) {
  const { watch, setValue, getValues } = form;

  // Form data
  const itemsRaw = watch('items');
  const resultsRaw = watch('results');
  const selectedPricesRaw = watch('selectedPrices');
  const justificationsRaw = watch('justifications');

  // Memoize to prevent unnecessary re-renders
  const items = useMemo(() => itemsRaw || [], [itemsRaw]);
  const results = useMemo(() => resultsRaw || [], [resultsRaw]);
  const selectedPrices = useMemo(() => selectedPricesRaw || {}, [selectedPricesRaw]);
  const justifications = useMemo(() => justificationsRaw || {}, [justificationsRaw]);

  // Store access
  const { currentPesquisa, updatePesquisa } = usePesquisaPrecosStore();

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<PesquisaItem | null>(null);
  const [editResult, setEditResult] = useState<PriceResult | undefined>(undefined);
  const [editMode, setEditMode] = useState<'edit' | 'add'>('add');

  // Global justification
  const [globalJustification, setGlobalJustification] = useState('');

  // Calculate completion stats
  const completionStats = useMemo(() => {
    const itemsWithSelection = Object.keys(selectedPrices).filter(
      (k) => selectedPrices[k] > 0,
    ).length;
    const totalItems = items.length;
    const percentage =
      totalItems > 0 ? Math.round((itemsWithSelection / totalItems) * 100) : 0;

    return {
      itemsWithSelection,
      totalItems,
      percentage,
      isComplete: itemsWithSelection === totalItems && totalItems > 0,
    };
  }, [selectedPrices, items]);

  // Handle price selection
  const handleSelectPrice = useCallback(
    (itemId: string, price: number, source: PriceSourceType) => {
      const currentSelected = getValues('selectedPrices') || {};
      setValue('selectedPrices', {
        ...currentSelected,
        [itemId]: price,
      });

      // Auto-add justification if source is not the median
      const itemResults = results.filter((r) => r.itemId === itemId);
      const prices = itemResults
        .filter((r) => r.price !== null)
        .map((r) => r.price as number);

      if (prices.length > 0) {
        const sorted = [...prices].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median =
          sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];

        // If selected price is not median, suggest justification
        if (Math.abs(price - median) > 0.01) {
          const sourceName =
            source === PriceSourceType.MANUAL
              ? 'cotacao manual'
              : source.toUpperCase();

          const currentJustifications = getValues('justifications') || {};
          if (!currentJustifications[itemId]) {
            setValue('justifications', {
              ...currentJustifications,
              [itemId]: `Preco selecionado da fonte ${sourceName}${
                price < median
                  ? ' - menor preco encontrado'
                  : ' - justificativa necessaria'
              }`,
            });
          }
        }
      }
    },
    [getValues, setValue, results],
  );

  // Handle open edit modal
  const handleEditPrice = useCallback(
    (itemId: string, result?: PriceResult) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      setEditItem(item);
      setEditResult(result);
      setEditMode(result ? 'edit' : 'add');
      setEditModalOpen(true);
    },
    [items],
  );

  // Handle add manual price
  const handleAddManual = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      setEditItem(item);
      setEditResult(undefined);
      setEditMode('add');
      setEditModalOpen(true);
    },
    [items],
  );

  // Handle save from modal
  const handleSavePrice = useCallback(
    (
      itemId: string,
      data: {
        price: number;
        source: PriceSourceType;
        reference?: string;
        date?: string;
      },
      justification?: string,
    ) => {
      const currentResults = getValues('results') || [];

      // Find existing result for this item and source
      const existingIndex = currentResults.findIndex(
        (r) => r.itemId === itemId && r.source === data.source,
      );

      const newResult: PriceResult = {
        itemId,
        source: data.source,
        price: data.price,
        reference: data.reference ?? null,
        date: data.date ?? null,
        isManual: data.source === PriceSourceType.MANUAL,
      };

      let newResults: PriceResult[];
      if (existingIndex >= 0) {
        newResults = [...currentResults];
        newResults[existingIndex] = newResult;
      } else {
        newResults = [...currentResults, newResult];
      }

      setValue('results', newResults);

      // Also select this price
      const currentSelected = getValues('selectedPrices') || {};
      setValue('selectedPrices', {
        ...currentSelected,
        [itemId]: data.price,
      });

      // Add justification if provided
      if (justification) {
        const currentJustifications = getValues('justifications') || {};
        setValue('justifications', {
          ...currentJustifications,
          [itemId]: justification,
        });
      }
    },
    [getValues, setValue],
  );

  // Handle global justification change
  const handleGlobalJustificationChange = useCallback(
    (value: string) => {
      setGlobalJustification(value);

      // Apply to all items without individual justification
      const currentJustifications = getValues('justifications') || {};
      const updatedJustifications = { ...currentJustifications };

      items.forEach((item) => {
        if (!updatedJustifications[item.id] && value) {
          updatedJustifications[item.id] = value;
        }
      });

      setValue('justifications', updatedJustifications);
    },
    [getValues, setValue, items],
  );

  // Handle save to backend
  const handleSaveToBackend = useCallback(async () => {
    if (!currentPesquisa) return;

    try {
      await updatePesquisa(currentPesquisa.id, {
        results,
        selectedPrices,
        justifications,
        status: 'completed',
      });
    } catch {
      // Error handled by store
    }
  }, [currentPesquisa, updatePesquisa, results, selectedPrices, justifications]);

  // Check if results are empty
  const hasResults = results.length > 0;
  const hasItems = items.length > 0;

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
        <p className="text-sm font-medium">Revisao de Resultados</p>
        <p className="text-xs text-muted-foreground mt-1">
          Revise os precos encontrados, selecione o preco para cada item e
          adicione justificativas quando necessario.
        </p>
      </div>

      {/* Completion status */}
      <div
        className={`p-3 rounded-lg border ${
          completionStats.isComplete
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            {completionStats.isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <span
              className={`text-sm font-medium ${
                completionStats.isComplete ? 'text-green-700' : 'text-amber-700'
              }`}
            >
              {completionStats.isComplete
                ? 'Todos os itens com preco selecionado!'
                : `${completionStats.itemsWithSelection} de ${completionStats.totalItems} itens com preco selecionado`}
            </span>
          </div>
          <span
            className={`text-lg font-bold ${
              completionStats.isComplete ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {completionStats.percentage}%
          </span>
        </div>
      </div>

      {/* Price comparison table */}
      {hasItems && hasResults ? (
        <div className="border rounded-lg overflow-hidden">
          <PriceComparisonTable
            items={items}
            results={results}
            selectedPrices={selectedPrices}
            onSelectPrice={handleSelectPrice}
            onEditPrice={handleEditPrice}
            onAddManual={handleAddManual}
          />
        </div>
      ) : hasItems && !hasResults ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Nenhum resultado encontrado</AlertTitle>
          <AlertDescription>
            A pesquisa nao retornou precos. Voce pode adicionar cotacoes manuais
            clicando no botao &quot;Adicionar&quot; para cada item.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sem itens para pesquisar</AlertTitle>
          <AlertDescription>
            Volte ao passo anterior para definir os itens da pesquisa.
          </AlertDescription>
        </Alert>
      )}

      {/* Global justification */}
      {hasItems && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <Label htmlFor="globalJustification" className="text-sm font-medium">
            Justificativa Global (opcional)
          </Label>
          <Textarea
            id="globalJustification"
            value={globalJustification}
            onChange={(e) => handleGlobalJustificationChange(e.target.value)}
            placeholder="Justificativa que sera aplicada a todos os itens sem justificativa individual..."
            rows={2}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Esta justificativa sera usada para itens que nao possuem justificativa
            individual.
          </p>
        </div>
      )}

      {/* Info alert */}
      {hasResults && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Clique em um preco para seleciona-lo. Use o botao de edicao para
            adicionar cotacoes manuais ou justificativas individuais.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-2)',
        }}
      >
        {currentPesquisa && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveToBackend}
              disabled={!completionStats.isComplete}
            >
              <FileText className="w-4 h-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!completionStats.isComplete}
              onClick={() => {
                // Export PDF will be handled by parent
                window.open(
                  `/api/pesquisa-precos/${currentPesquisa.id}/export/pdf`,
                  '_blank',
                );
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <PriceEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        item={editItem}
        existingResult={editResult}
        onSave={handleSavePrice}
        mode={editMode}
      />
    </div>
  );
}
