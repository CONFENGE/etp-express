import { UseFormReturn, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/FormField';
import { DatePickerBR } from '@/components/ui/date-picker-br';
import {
  ETPWizardFormData,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  ORGAO_MAX_LENGTH,
  UNIDADE_DEMANDANTE_MAX_LENGTH,
  RESPONSAVEL_NOME_MAX_LENGTH,
  RESPONSAVEL_MATRICULA_MAX_LENGTH,
} from '@/schemas/etpWizardSchema';

interface Step1IdentificationProps {
  form: UseFormReturn<ETPWizardFormData>;
}

export function Step1Identification({ form }: Step1IdentificationProps) {
  const {
    register,
    control,
    formState: { errors, touchedFields },
    watch,
  } = form;

  const titleValue = watch('title') || '';
  const orgaoValue = watch('orgaoEntidade') || '';
  const unidadeValue = watch('unidadeDemandante') || '';
  const nomeValue = watch('responsavelTecnicoNome') || '';
  const matriculaValue = watch('responsavelTecnicoMatricula') || '';

  return (
    <div className="space-y-4">
      <FormField
        label="Título do ETP"
        name="title"
        required
        error={errors.title?.message}
        isValid={
          !errors.title &&
          touchedFields.title &&
          titleValue.length >= TITLE_MIN_LENGTH
        }
        charCount={{ current: titleValue.length, max: TITLE_MAX_LENGTH }}
        helpText="Título descritivo do Estudo Técnico Preliminar"
      >
        <Input
          id="title"
          placeholder="Ex: Contratação de Serviços de TI"
          {...register('title')}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Órgão/Entidade"
          name="orgaoEntidade"
          error={errors.orgaoEntidade?.message}
          isValid={
            !errors.orgaoEntidade &&
            touchedFields.orgaoEntidade &&
            orgaoValue.length > 0
          }
          charCount={{ current: orgaoValue.length, max: ORGAO_MAX_LENGTH }}
          helpText="Órgão ou entidade requisitante"
        >
          <Input
            id="orgaoEntidade"
            placeholder="Ex: Secretaria Municipal de Tecnologia"
            {...register('orgaoEntidade')}
          />
        </FormField>

        <FormField
          label="Código UASG"
          name="uasg"
          error={errors.uasg?.message}
          isValid={
            !errors.uasg &&
            touchedFields.uasg &&
            (watch('uasg') || '').length === 6
          }
          helpText="6 dígitos numéricos"
        >
          <Input
            id="uasg"
            placeholder="Ex: 123456"
            maxLength={6}
            {...register('uasg')}
          />
        </FormField>
      </div>

      <FormField
        label="Unidade Demandante"
        name="unidadeDemandante"
        error={errors.unidadeDemandante?.message}
        isValid={
          !errors.unidadeDemandante &&
          touchedFields.unidadeDemandante &&
          unidadeValue.length > 0
        }
        charCount={{
          current: unidadeValue.length,
          max: UNIDADE_DEMANDANTE_MAX_LENGTH,
        }}
        helpText="Unidade demandante dentro do órgão"
      >
        <Input
          id="unidadeDemandante"
          placeholder="Ex: Departamento de Infraestrutura de TI"
          {...register('unidadeDemandante')}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Nome do Responsável Técnico"
          name="responsavelTecnicoNome"
          error={errors.responsavelTecnicoNome?.message}
          isValid={
            !errors.responsavelTecnicoNome &&
            touchedFields.responsavelTecnicoNome &&
            nomeValue.length > 0
          }
          charCount={{
            current: nomeValue.length,
            max: RESPONSAVEL_NOME_MAX_LENGTH,
          }}
          helpText="Nome completo do responsável"
        >
          <Input
            id="responsavelTecnicoNome"
            placeholder="Ex: João Silva"
            {...register('responsavelTecnicoNome')}
          />
        </FormField>

        <FormField
          label="Matrícula"
          name="responsavelTecnicoMatricula"
          error={errors.responsavelTecnicoMatricula?.message}
          isValid={
            !errors.responsavelTecnicoMatricula &&
            touchedFields.responsavelTecnicoMatricula &&
            matriculaValue.length > 0
          }
          charCount={{
            current: matriculaValue.length,
            max: RESPONSAVEL_MATRICULA_MAX_LENGTH,
          }}
          helpText="Matrícula funcional (opcional)"
        >
          <Input
            id="responsavelTecnicoMatricula"
            placeholder="Ex: 12345"
            {...register('responsavelTecnicoMatricula')}
          />
        </FormField>
      </div>

      <FormField
        label="Data de Elaboração"
        name="dataElaboracao"
        error={errors.dataElaboracao?.message}
        isValid={
          !errors.dataElaboracao &&
          touchedFields.dataElaboracao &&
          (watch('dataElaboracao') || '').length > 0
        }
        helpText="Formato: DD/MM/AAAA (ex: 08/01/2026)"
      >
        <Controller
          name="dataElaboracao"
          control={control}
          render={({ field }) => (
            <DatePickerBR
              id="dataElaboracao"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
            />
          )}
        />
      </FormField>
    </div>
  );
}
