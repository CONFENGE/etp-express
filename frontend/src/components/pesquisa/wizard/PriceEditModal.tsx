import { useCallback, useState, useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PriceSourceType, PRICE_SOURCES } from '@/schemas/pesquisaPrecosSchema';
import type { PesquisaItem, PriceResult } from '@/schemas/pesquisaPrecosSchema';

/**
 * Schema for price edit form
 */
const priceEditSchema = z.object({
  price: z
    .number({ invalid_type_error: 'Informe um valor numerico' })
    .min(0.01, 'Preco deve ser maior que zero'),
  source: z.nativeEnum(PriceSourceType),
  reference: z.string().optional(),
  date: z.string().optional(),
  justification: z.string().optional(),
});

type PriceEditFormData = z.infer<typeof priceEditSchema>;

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PesquisaItem | null;
  existingResult?: PriceResult;
  onSave: (
    itemId: string,
    data: {
      price: number;
      source: PriceSourceType;
      reference?: string;
      date?: string;
    },
    justification?: string,
  ) => void;
  mode: 'edit' | 'add';
}

/**
 * PriceEditModal - Modal for editing or adding manual price quotations
 *
 * Features:
 * - Add new manual price
 * - Edit existing price
 * - Add justification for price choice
 * - Format currency input
 *
 * @see Issue #1509 - Step 5 implementation
 */
export function PriceEditModal({
  isOpen,
  onClose,
  item,
  existingResult,
  onSave,
  mode,
}: PriceEditModalProps) {
  const titleId = useId();
  const descId = useId();
  const [priceInput, setPriceInput] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PriceEditFormData>({
    resolver: zodResolver(priceEditSchema),
    defaultValues: {
      price: existingResult?.price ?? undefined,
      source: existingResult?.source ?? PriceSourceType.MANUAL,
      reference: existingResult?.reference ?? '',
      date: existingResult?.date ?? new Date().toISOString().split('T')[0],
      justification: '',
    },
  });

  const selectedSource = watch('source');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && item) {
      if (existingResult) {
        reset({
          price: existingResult.price ?? undefined,
          source: existingResult.source,
          reference: existingResult.reference ?? '',
          date: existingResult.date ?? new Date().toISOString().split('T')[0],
          justification: '',
        });
        setPriceInput(existingResult.price?.toFixed(2).replace('.', ',') ?? '');
      } else {
        reset({
          price: undefined,
          source: PriceSourceType.MANUAL,
          reference: '',
          date: new Date().toISOString().split('T')[0],
          justification: '',
        });
        setPriceInput('');
      }
    }
  }, [isOpen, item, existingResult, reset]);

  // Handle price input formatting
  const handlePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      // Remove non-numeric characters except comma and period
      value = value.replace(/[^\d,.]/g, '');

      // Replace period with comma for display
      value = value.replace('.', ',');

      // Only allow one comma
      const parts = value.split(',');
      if (parts.length > 2) {
        value = parts[0] + ',' + parts.slice(1).join('');
      }

      // Limit decimal places to 2
      if (parts.length === 2 && parts[1].length > 2) {
        value = parts[0] + ',' + parts[1].substring(0, 2);
      }

      setPriceInput(value);

      // Parse for form
      const numericValue = parseFloat(value.replace(',', '.'));
      if (!isNaN(numericValue)) {
        setValue('price', numericValue, { shouldValidate: true });
      }
    },
    [setValue],
  );

  // Handle form submission
  const onSubmit = useCallback(
    (data: PriceEditFormData) => {
      if (!item) return;

      onSave(
        item.id,
        {
          price: data.price,
          source: data.source,
          reference: data.reference,
          date: data.date,
        },
        data.justification,
      );
      onClose();
    },
    [item, onSave, onClose],
  );

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[500px]"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>
            {mode === 'add' ? 'Adicionar Cotacao Manual' : 'Editar Preco'}
          </DialogTitle>
          <DialogDescription id={descId}>
            {mode === 'add'
              ? 'Informe os dados da cotacao obtida com fornecedor.'
              : 'Altere o preco e adicione uma justificativa.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              paddingTop: 'var(--space-2)',
              paddingBottom: 'var(--space-4)',
            }}
          >
            {/* Item info */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{item.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Quantidade: {item.quantity} {item.unit}
              </p>
            </div>

            {/* Source selector */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <Label htmlFor="source">Fonte</Label>
              <Select
                value={selectedSource}
                onValueChange={(value) =>
                  setValue('source', value as PriceSourceType)
                }
              >
                <SelectTrigger id="source">
                  <SelectValue placeholder="Selecione a fonte" />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_SOURCES.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price input */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <Label htmlFor="price">Preco Unitario (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={priceInput}
                  onChange={handlePriceChange}
                  className="pl-10 font-mono"
                />
                <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              {errors.price && (
                <p className="text-xs text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>

            {/* Reference */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <Label htmlFor="reference">Referencia (opcional)</Label>
              <Input
                id="reference"
                {...register('reference')}
                placeholder="Ex: Proposta Comercial #123, NF-e 456"
              />
            </div>

            {/* Date */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <Label htmlFor="date">Data da Cotacao</Label>
              <Input id="date" type="date" {...register('date')} />
            </div>

            {/* Justification */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <Label htmlFor="justification">Justificativa (opcional)</Label>
              <Textarea
                id="justification"
                {...register('justification')}
                placeholder="Justifique a escolha deste preco, se necessario..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                A justificativa sera incluida no relatorio de pesquisa de
                precos.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {mode === 'add' ? 'Adicionar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
