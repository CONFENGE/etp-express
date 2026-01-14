import { UseFormReturn, Controller } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/FormField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ETPWizardFormData,
  RISCOS_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
} from '@/schemas/etpWizardSchema';

interface Step5RisksProps {
  form: UseFormReturn<ETPWizardFormData>;
}

const RISCO_OPTIONS = [
  {
    value: 'BAIXO',
    label: 'Baixo',
    description: 'Impacto mínimo, alta probabilidade de sucesso',
  },
  {
    value: 'MEDIO',
    label: 'Médio',
    description: 'Impacto moderado, requer atenção e mitigação',
  },
  {
    value: 'ALTO',
    label: 'Alto',
    description: 'Impacto significativo, requer plano de contingência',
  },
];

export function Step5Risks({ form }: Step5RisksProps) {
  const {
    register,
    control,
    formState: { errors, touchedFields },
    watch,
  } = form;

  const descricaoRiscosValue = watch('descricaoRiscos') || '';
  const descriptionValue = watch('description') || '';
  const nivelRiscoValue = watch('nivelRisco');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <FormField
        label="Nível de Risco"
        name="nivelRisco"
        error={errors.nivelRisco?.message}
        isValid={!errors.nivelRisco && nivelRiscoValue !== undefined}
        helpText="Nível de risco geral da contratação"
      >
        <Controller
          name="nivelRisco"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || ''}
              onValueChange={(value) => field.onChange(value || undefined)}
            >
              <SelectTrigger id="nivelRisco">
                <SelectValue placeholder="Selecione o nível de risco" />
              </SelectTrigger>
              <SelectContent>
                {RISCO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField
        label="Descrição dos Riscos"
        name="descricaoRiscos"
        error={errors.descricaoRiscos?.message}
        isValid={
          !errors.descricaoRiscos &&
          touchedFields.descricaoRiscos &&
          descricaoRiscosValue.length > 0
        }
        charCount={{
          current: descricaoRiscosValue.length,
          max: RISCOS_MAX_LENGTH,
        }}
        helpText="Descrição detalhada dos riscos identificados"
      >
        <Textarea
          id="descricaoRiscos"
          placeholder="Ex: Risco de atraso na entrega devido a complexidade técnica; Risco de dependência de fornecedor único..."
          rows={4}
          {...register('descricaoRiscos')}
        />
      </FormField>

      <FormField
        label="Observações Adicionais"
        name="description"
        error={errors.description?.message}
        isValid={
          !errors.description &&
          touchedFields.description &&
          descriptionValue.length > 0
        }
        charCount={{
          current: descriptionValue.length,
          max: DESCRIPTION_MAX_LENGTH,
        }}
        helpText="Observações ou informações complementares"
      >
        <Textarea
          id="description"
          placeholder="Informações adicionais sobre o ETP..."
          rows={3}
          {...register('description')}
        />
      </FormField>
    </div>
  );
}
