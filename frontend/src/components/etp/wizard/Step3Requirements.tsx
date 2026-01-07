import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/FormField';
import {
  ETPWizardFormData,
  REQUISITOS_TECNICOS_MAX_LENGTH,
  REQUISITOS_QUALIFICACAO_MAX_LENGTH,
  SUSTENTABILIDADE_MAX_LENGTH,
  GARANTIA_MAX_LENGTH,
} from '@/schemas/etpWizardSchema';

interface Step3RequirementsProps {
  form: UseFormReturn<ETPWizardFormData>;
}

export function Step3Requirements({ form }: Step3RequirementsProps) {
  const {
    register,
    formState: { errors, touchedFields },
    watch,
  } = form;

  const requisitosTecnicosValue = watch('requisitosTecnicos') || '';
  const requisitosQualificacaoValue = watch('requisitosQualificacao') || '';
  const criteriosSustentabilidadeValue =
    watch('criteriosSustentabilidade') || '';
  const garantiaExigidaValue = watch('garantiaExigida') || '';

  return (
    <div className="space-y-4">
      <FormField
        label="Requisitos Técnicos"
        name="requisitosTecnicos"
        error={errors.requisitosTecnicos?.message}
        isValid={
          !errors.requisitosTecnicos &&
          touchedFields.requisitosTecnicos &&
          requisitosTecnicosValue.length > 0
        }
        charCount={{
          current: requisitosTecnicosValue.length,
          max: REQUISITOS_TECNICOS_MAX_LENGTH,
        }}
        helpText="Especificações técnicas mínimas do objeto"
      >
        <Textarea
          id="requisitosTecnicos"
          placeholder="Ex: Sistema deve suportar 10.000 usuários simultâneos; Tempo de resposta máximo de 2 segundos..."
          rows={4}
          {...register('requisitosTecnicos')}
        />
      </FormField>

      <FormField
        label="Requisitos de Qualificação"
        name="requisitosQualificacao"
        error={errors.requisitosQualificacao?.message}
        isValid={
          !errors.requisitosQualificacao &&
          touchedFields.requisitosQualificacao &&
          requisitosQualificacaoValue.length > 0
        }
        charCount={{
          current: requisitosQualificacaoValue.length,
          max: REQUISITOS_QUALIFICACAO_MAX_LENGTH,
        }}
        helpText="Qualificação técnica exigida do fornecedor"
      >
        <Textarea
          id="requisitosQualificacao"
          placeholder="Ex: Empresa deve possuir certificação ISO 9001; Equipe mínima de 5 desenvolvedores seniores..."
          rows={4}
          {...register('requisitosQualificacao')}
        />
      </FormField>

      <FormField
        label="Criterios de Sustentabilidade"
        name="criteriosSustentabilidade"
        error={errors.criteriosSustentabilidade?.message}
        isValid={
          !errors.criteriosSustentabilidade &&
          touchedFields.criteriosSustentabilidade &&
          criteriosSustentabilidadeValue.length > 0
        }
        charCount={{
          current: criteriosSustentabilidadeValue.length,
          max: SUSTENTABILIDADE_MAX_LENGTH,
        }}
        helpText="Critérios de sustentabilidade ambiental (IN SLTI/MP n. 01/2010)"
      >
        <Textarea
          id="criteriosSustentabilidade"
          placeholder="Ex: Utilização de materiais recicláveis; Equipamentos com certificação Energy Star..."
          rows={3}
          {...register('criteriosSustentabilidade')}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Garantia Exigida"
          name="garantiaExigida"
          error={errors.garantiaExigida?.message}
          isValid={
            !errors.garantiaExigida &&
            touchedFields.garantiaExigida &&
            garantiaExigidaValue.length > 0
          }
          charCount={{
            current: garantiaExigidaValue.length,
            max: GARANTIA_MAX_LENGTH,
          }}
          helpText="Garantia exigida na contratação"
        >
          <Input
            id="garantiaExigida"
            placeholder="Ex: 12 meses contra defeitos"
            {...register('garantiaExigida')}
          />
        </FormField>

        <FormField
          label="Prazo de Execução (dias)"
          name="prazoExecucao"
          error={errors.prazoExecucao?.message}
          isValid={!errors.prazoExecucao && touchedFields.prazoExecucao}
          helpText="Prazo em dias para execução"
        >
          <Input
            id="prazoExecucao"
            type="number"
            min={1}
            placeholder="Ex: 180"
            {...register('prazoExecucao', { valueAsNumber: true })}
          />
        </FormField>
      </div>
    </div>
  );
}
