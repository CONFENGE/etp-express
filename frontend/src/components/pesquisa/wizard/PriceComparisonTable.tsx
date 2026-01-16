import { useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Minus,
  Edit2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Database,
  Building,
  Truck,
  FileText,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PesquisaItem, PriceResult } from '@/schemas/pesquisaPrecosSchema';
import { PriceSourceType, PRICE_SOURCES } from '@/schemas/pesquisaPrecosSchema';

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
    case PriceSourceType.MANUAL:
      return <User className={cn(iconClass, 'text-gray-600')} />;
    default:
      return <Database className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

/**
 * Format currency for display
 */
function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Calculate statistics for an array of prices
 */
function calculateStats(prices: (number | null)[]): {
  min: number | null;
  max: number | null;
  median: number | null;
  average: number | null;
} {
  const validPrices = prices.filter((p): p is number => p !== null && p > 0);

  if (validPrices.length === 0) {
    return { min: null, max: null, median: null, average: null };
  }

  const sorted = [...validPrices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const average = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;

  let median: number;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }

  return { min, max, median, average };
}

interface PriceComparisonTableProps {
  items: PesquisaItem[];
  results: PriceResult[];
  selectedPrices: Record<string, number>;
  onSelectPrice: (itemId: string, price: number, source: PriceSourceType) => void;
  onEditPrice: (itemId: string, result?: PriceResult) => void;
  onAddManual: (itemId: string) => void;
}

/**
 * PriceComparisonTable - Displays prices from different sources in a comparison table
 *
 * Features:
 * - Shows all items with prices from each source
 * - Highlights min/max prices
 * - Shows median and average
 * - Allows selecting the chosen price
 * - Allows editing/adding manual prices
 *
 * @see Issue #1509 - Step 5 implementation
 */
export function PriceComparisonTable({
  items,
  results,
  selectedPrices,
  onSelectPrice,
  onEditPrice,
  onAddManual,
}: PriceComparisonTableProps) {
  // Get unique sources that have results
  const activeSources = useMemo(() => {
    const sourcesWithResults = new Set<PriceSourceType>();
    results.forEach((r) => {
      if (r.price !== null) {
        sourcesWithResults.add(r.source);
      }
    });
    // Always include MANUAL as an option
    sourcesWithResults.add(PriceSourceType.MANUAL);
    return PRICE_SOURCES.filter((s) => sourcesWithResults.has(s.id));
  }, [results]);

  // Group results by item
  const resultsByItem = useMemo(() => {
    const grouped = new Map<string, Map<PriceSourceType, PriceResult>>();

    items.forEach((item) => {
      grouped.set(item.id, new Map());
    });

    results.forEach((result) => {
      const itemResults = grouped.get(result.itemId);
      if (itemResults) {
        itemResults.set(result.source, result);
      }
    });

    return grouped;
  }, [items, results]);

  // Calculate stats per item
  const statsPerItem = useMemo(() => {
    const stats = new Map<
      string,
      ReturnType<typeof calculateStats> & { priceCount: number }
    >();

    items.forEach((item) => {
      const itemResults = resultsByItem.get(item.id);
      const prices: (number | null)[] = [];

      if (itemResults) {
        itemResults.forEach((result) => {
          prices.push(result.price);
        });
      }

      const itemStats = calculateStats(prices);
      stats.set(item.id, {
        ...itemStats,
        priceCount: prices.filter((p) => p !== null && p > 0).length,
      });
    });

    return stats;
  }, [items, resultsByItem]);

  return (
    <TooltipProvider>
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                Item
              </TableHead>
              {activeSources.map((source) => (
                <TableHead key={source.id} className="text-center min-w-[120px]">
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                    }}
                  >
                    {getSourceIcon(source.id)}
                    <span className="text-xs">{source.name}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center min-w-[100px]">Mediana</TableHead>
              <TableHead className="text-center min-w-[130px]">
                Escolhido
              </TableHead>
              <TableHead className="text-center min-w-[80px]">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const itemResults = resultsByItem.get(item.id);
              const itemStats = statsPerItem.get(item.id);
              const selectedPrice = selectedPrices[item.id];
              const hasSelection = selectedPrice !== undefined && selectedPrice > 0;

              return (
                <TableRow key={item.id}>
                  {/* Item info */}
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                      }}
                    >
                      <span className="text-sm line-clamp-2">
                        {item.description}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  </TableCell>

                  {/* Price cells for each source */}
                  {activeSources.map((source) => {
                    const result = itemResults?.get(source.id);
                    const price = result?.price ?? null;
                    const isMin = price !== null && price === itemStats?.min;
                    const isMax = price !== null && price === itemStats?.max;
                    const isSelected =
                      selectedPrice !== undefined &&
                      price !== null &&
                      Math.abs(selectedPrice - price) < 0.01;

                    return (
                      <TableCell key={source.id} className="text-center">
                        {price !== null && price > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectPrice(item.id, price, source.id)
                                }
                                className={cn(
                                  'px-2 py-1 rounded-md text-sm font-medium transition-all',
                                  'hover:bg-primary/10 cursor-pointer',
                                  isSelected && 'bg-primary/20 ring-2 ring-primary',
                                  isMin && !isSelected && 'text-green-600 bg-green-50',
                                  isMax && !isSelected && 'text-red-600 bg-red-50',
                                )}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {isMin && !isMax && (
                                    <ArrowDown className="w-3 h-3 text-green-600" />
                                  )}
                                  {isMax && !isMin && (
                                    <ArrowUp className="w-3 h-3 text-red-600" />
                                  )}
                                  {formatCurrency(price)}
                                  {isSelected && (
                                    <CheckCircle2 className="w-3 h-3 text-primary ml-1" />
                                  )}
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <p>Clique para selecionar este preco</p>
                                {result?.reference && (
                                  <p className="text-muted-foreground mt-1">
                                    Ref: {result.reference}
                                  </p>
                                )}
                                {result?.date && (
                                  <p className="text-muted-foreground">
                                    Data: {result.date}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : source.id === PriceSourceType.MANUAL ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onAddManual(item.id)}
                            className="text-xs h-7"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Adicionar
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">
                            <Minus className="w-4 h-4 inline" />
                          </span>
                        )}
                      </TableCell>
                    );
                  })}

                  {/* Median */}
                  <TableCell className="text-center">
                    {itemStats?.median !== null ? (
                      <Badge variant="secondary" className="font-mono">
                        {formatCurrency(itemStats?.median ?? null)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Selected price */}
                  <TableCell className="text-center">
                    {hasSelection ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 'var(--space-1)',
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-700">
                          {formatCurrency(selectedPrice)}
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 'var(--space-1)',
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-600 text-xs">
                          Selecione
                        </span>
                      </div>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditPrice(item.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 'var(--space-3)',
            marginTop: 'var(--space-3)',
          }}
          className="border-t"
        >
          <div className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ArrowDown className="w-3 h-3 text-green-600" />
              Menor preco
            </span>
            <span className="mx-2">|</span>
            <span className="inline-flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-red-600" />
              Maior preco
            </span>
            <span className="mx-2">|</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              Selecionado
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Itens com preco escolhido: </span>
            <span className="font-medium">
              {Object.keys(selectedPrices).filter((k) => selectedPrices[k] > 0).length}
            </span>
            <span className="text-muted-foreground"> / {items.length}</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
