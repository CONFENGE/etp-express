import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/FormField';
import {
  ETPWizardFormData,
  FONTE_PRECOS_MAX_LENGTH,
  DOTACAO_MAX_LENGTH,
} from '@/schemas/etpWizardSchema';

interface Step4CostsProps {
  form: UseFormReturn<ETPWizardFormData>;
}

export function Step4Costs({ form }: Step4CostsProps) {
  const {
    register,
    formState: { errors, touchedFields },
    watch,
  } = form;

  const fontePrecosValue = watch('fontePesquisaPrecos') || '';
  const dotacaoValue = watch('dotacaoOrcamentaria') || '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
