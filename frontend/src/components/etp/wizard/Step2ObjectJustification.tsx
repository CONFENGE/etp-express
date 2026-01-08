import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/FormField';
import {
  ETPWizardFormData,
  OBJETO_MIN_LENGTH,
  OBJETO_MAX_LENGTH,
  DESCRICAO_DETALHADA_MAX_LENGTH,
  UNIDADE_MEDIDA_MAX_LENGTH,
  JUSTIFICATIVA_MIN_LENGTH,
  JUSTIFICATIVA_MAX_LENGTH,
  NECESSIDADE_MAX_LENGTH,
  BENEFICIOS_MAX_LENGTH,
} from '@/schemas/etpWizardSchema';

interface Step2ObjectJustificationProps {
  form: UseFormReturn<ETPWizardFormData>;
}

export function Step2ObjectJustification({
  form,
}: Step2ObjectJustificationProps) {
  const {
    register,
    formState: { errors, touchedFields },
    watch,
  } = form;

  const objetoValue = watch('objeto') || '';
  const descricaoDetalhadaValue = watch('descricaoDetalhada') || '';
  const unidadeMedidaValue = watch('unidadeMedida') || '';
  const justificativaValue = watch('justificativaContratacao') || '';
  const necessidadeValue = watch('necessidadeAtendida') || '';
  const beneficiosValue = watch('beneficiosEsperados') || '';

  return (
    <div className="space-y-4">
      <FormField
        label="Objeto da Contratação"
        name="objeto"
        required
        error={errors.objeto?.message}
        isValid={
          !errors.objeto &&
          touchedFields.objeto &&
          objetoValue.length >= OBJETO_MIN_LENGTH
        }
        charCount={{ current: objetoValue.length, max: OBJETO_MAX_LENGTH }}
        helpText="Descrição resumida do objeto a ser contratado"
      >
        <Textarea
          id="objeto"
          placeholder="Ex: Contratação de empresa especializada em desenvolvimento de sistemas web"
          rows={2}
          {...register('objeto')}
        />
      </FormField>

      <FormField
        label="Descrição Detalhada"
        name="descricaoDetalhada"
        error={errors.descricaoDetalhada?.message}
        isValid={
          !errors.descricaoDetalhada &&
          touchedFields.descricaoDetalhada &&
          descricaoDetalhadaValue.length > 0
        }
        charCount={{
          current: descricaoDetalhadaValue.length,
          max: DESCRICAO_DETALHADA_MAX_LENGTH,
        }}
        helpText="Descrição técnica detalhada do objeto"
      >
        <Textarea
          id="descricaoDetalhada"
          placeholder="Descreva detalhadamente as especificações técnicas do objeto..."
          rows={4}
          {...register('descricaoDetalhada')}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Quantidade Estimada"
          name="quantidadeEstimada"
          error={errors.quantidadeEstimada?.message}
          isValid={
            !errors.quantidadeEstimada && touchedFields.quantidadeEstimada
          }
          helpText="Quantidade a ser contratada"
        >
          <Input
            id="quantidadeEstimada"
            type="number"
            min={1}
            placeholder="Ex: 12"
            {...register('quantidadeEstimada', { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          label="Unidade de Medida"
          name="unidadeMedida"
          error={errors.unidadeMedida?.message}
          isValid={
            !errors.unidadeMedida &&
            touchedFields.unidadeMedida &&
            unidadeMedidaValue.length > 0
          }
          charCount={{
            current: unidadeMedidaValue.length,
            max: UNIDADE_MEDIDA_MAX_LENGTH,
          }}
          helpText="Ex: unidade, mês, hora, m²"
        >
          <Input
            id="unidadeMedida"
            placeholder="Ex: mês"
            {...register('unidadeMedida')}
          />
        </FormField>
      </div>

      <FormField
        label="Justificativa da Contratação"
        name="justificativaContratacao"
        error={errors.justificativaContratacao?.message}
        isValid={
          !errors.justificativaContratacao &&
          touchedFields.justificativaContratacao &&
          justificativaValue.length >= JUSTIFICATIVA_MIN_LENGTH
        }
        charCount={{
          current: justificativaValue.length,
          max: JUSTIFICATIVA_MAX_LENGTH,
        }}
        helpText={`Justificativa técnica e legal (min: ${JUSTIFICATIVA_MIN_LENGTH} caracteres)`}
      >
        <Textarea
          id="justificativaContratacao"
          placeholder="Descreva a justificativa técnica e legal para a contratação..."
          rows={4}
          {...register('justificativaContratacao')}
        />
      </FormField>

      <FormField
        label="Necessidade Atendida"
        name="necessidadeAtendida"
        error={errors.necessidadeAtendida?.message}
        isValid={
          !errors.necessidadeAtendida &&
          touchedFields.necessidadeAtendida &&
          necessidadeValue.length > 0
        }
        charCount={{
          current: necessidadeValue.length,
          max: NECESSIDADE_MAX_LENGTH,
        }}
        helpText="Descrição da necessidade que será atendida"
      >
        <Textarea
          id="necessidadeAtendida"
          placeholder="Ex: Atender a demanda de 10.000 usuários internos..."
          rows={3}
          {...register('necessidadeAtendida')}
        />
      </FormField>

      <FormField
        label="Benefícios Esperados"
        name="beneficiosEsperados"
        error={errors.beneficiosEsperados?.message}
        isValid={
          !errors.beneficiosEsperados &&
          touchedFields.beneficiosEsperados &&
          beneficiosValue.length > 0
        }
        charCount={{
          current: beneficiosValue.length,
          max: BENEFICIOS_MAX_LENGTH,
        }}
        helpText="Benefícios esperados com a contratação"
      >
        <Textarea
          id="beneficiosEsperados"
          placeholder="Ex: Redução de 30% no tempo de processamento..."
          rows={3}
          {...register('beneficiosEsperados')}
        />
      </FormField>
    </div>
  );
}
