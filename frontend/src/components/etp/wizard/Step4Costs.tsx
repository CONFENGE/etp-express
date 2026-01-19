import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/FormField';
import {
  ETPWizardFormData,
  FONTE_PRECOS_MAX_LENGTH,
  DOTACAO_MAX_LENGTH,
} from '@/schemas/etpWizardSchema';
import { usePriceAlert } from '@/hooks/usePriceAlert';
import { PriceAlertBadge } from './PriceAlertBadge';

/**
 * Default UF for price benchmark when not available from org data.
 * Uses DF (Distrito Federal) as federal government default.
 */
const DEFAULT_UF = 'DF';

interface Step4CostsProps {
  form: UseFormReturn<ETPWizardFormData>;
}

/**
 * Step 4 (Costs) of the ETP creation wizard.
 *
 * This step collects cost-related information including:
 * - Unit price (valorUnitario)
 * - Estimated total value (valorEstimado)
 * - Price research sources (fontePesquisaPrecos)
 * - Budget allocation (dotacaoOrcamentaria)
 *
 * Issue #1274: Integrates with the overprice alert system to provide
 * real-time feedback when users enter prices. The alert checks the
 * unit price against regional benchmarks and displays:
 * - Alert level (OK, ATTENTION, WARNING, CRITICAL)
 * - Median price from benchmark data
 * - Suggested price range
 *
 * The alerts are purely informative and do NOT block form submission.
 */
export function Step4Costs({ form }: Step4CostsProps) {
  const {
    register,
    formState: { errors, touchedFields },
    watch,
  } = form;

  const fontePrecosValue = watch('fontePesquisaPrecos') || '';
  const dotacaoValue = watch('dotacaoOrcamentaria') || '';

  // Watch fields needed for price alert
  const valorUnitario = watch('valorUnitario');
  const objeto = watch('objeto'); // Used as item description for benchmark lookup

  // Initialize price alert hook
  const priceAlert = usePriceAlert({
    debounceMs: 500,
    minPrice: 1,
    persistAlert: false, // Don't persist during wizard - only on final save
  });

  // Check price against benchmark when valorUnitario changes
  useEffect(() => {
    if (
      valorUnitario &&
      valorUnitario > 0 &&
      objeto &&
      objeto.trim().length > 0
    ) {
      priceAlert.checkPrice(valorUnitario, objeto, DEFAULT_UF);
    } else {
      priceAlert.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorUnitario, objeto]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--space-4)',
        }}
        className="md:grid-cols-2"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <FormField
            label="Valor Unitário (R$)"
            name="valorUnitario"
            error={errors.valorUnitario?.message}
            isValid={!errors.valorUnitario && touchedFields.valorUnitario}
            helpText="Valor unitário do item/serviço"
          >
            <Input
              id="valorUnitario"
              type="number"
              min={0}
              step="0.01"
              placeholder="Ex: 5000.00"
              {...register('valorUnitario', { valueAsNumber: true })}
            />
          </FormField>

          {/* Price Alert Badge - Issue #1274 */}
          <PriceAlertBadge
            alertLevel={priceAlert.alertLevel}
            medianPrice={priceAlert.medianPrice}
            suggestedRange={priceAlert.suggestedRange}
            percentageAbove={priceAlert.percentageAbove}
            sampleCount={priceAlert.alert?.benchmarkSampleCount}
            benchmarkUf={priceAlert.alert?.benchmarkUf}
            isLoading={priceAlert.isLoading}
          />
        </div>

        <FormField
          label="Valor Estimado Total (R$)"
          name="valorEstimado"
          error={errors.valorEstimado?.message}
          isValid={!errors.valorEstimado && touchedFields.valorEstimado}
          helpText="Valor total estimado da contratação"
        >
          <Input
            id="valorEstimado"
            type="number"
            min={0}
            step="0.01"
            placeholder="Ex: 500000.00"
            {...register('valorEstimado', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <FormField
        label="Fonte de Pesquisa de Preços"
        name="fontePesquisaPrecos"
        error={errors.fontePesquisaPrecos?.message}
        isValid={
          !errors.fontePesquisaPrecos &&
          touchedFields.fontePesquisaPrecos &&
          fontePrecosValue.length > 0
        }
        charCount={{
          current: fontePrecosValue.length,
          max: FONTE_PRECOS_MAX_LENGTH,
        }}
        helpText="Fontes utilizadas para pesquisa de preços"
      >
        <Textarea
          id="fontePesquisaPrecos"
          placeholder="Ex: Painel de Preços do Governo Federal; SINAPI referência 03/2024; 3 cotações de mercado anexas ao processo..."
          rows={3}
          {...register('fontePesquisaPrecos')}
        />
      </FormField>

      <FormField
        label="Dotação Orçamentária"
        name="dotacaoOrcamentaria"
        error={errors.dotacaoOrcamentaria?.message}
        isValid={
          !errors.dotacaoOrcamentaria &&
          touchedFields.dotacaoOrcamentaria &&
          dotacaoValue.length > 0
        }
        charCount={{ current: dotacaoValue.length, max: DOTACAO_MAX_LENGTH }}
        helpText="Código da dotação orçamentária"
      >
        <Input
          id="dotacaoOrcamentaria"
          placeholder="Ex: 02.031.0001.2001.339039"
          {...register('dotacaoOrcamentaria')}
        />
      </FormField>
    </div>
  );
}
