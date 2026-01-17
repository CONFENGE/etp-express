import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/form/FormField';
import { EtpTemplateType } from '@/types/template';
import { ETPWizardFormData } from '@/schemas/etpWizardSchema';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface DynamicFieldsRendererProps {
  form: UseFormReturn<ETPWizardFormData>;
  templateType: EtpTemplateType | null;
}

interface FieldOption {
  value: string;
  label: string;
}

interface DynamicFieldConfig {
  name: string;
  label: string;
  /**
   * Field type:
   * - 'input': Single-line text input
   * - 'textarea': Multi-line text input
   * - 'textarea-array': Multi-line text that converts to/from string[] (Issue #1531)
   * - 'number': Numeric input
   * - 'select': Dropdown select
   */
  type: 'input' | 'textarea' | 'textarea-array' | 'number' | 'select';
  placeholder: string;
  helpText: string;
  required: boolean;
  maxLength?: number;
  rows?: number;
  min?: number;
  max?: number;
  options?: FieldOption[];
}

interface TemplateFieldsConfig {
  title: string;
  icon: string;
  fields: DynamicFieldConfig[];
}

/**
 * Dynamic fields configuration per template type.
 * Issue #1240 - [TMPL-1161f] Implement dynamic fields based on template
 */
const DYNAMIC_FIELDS_CONFIG: Record<EtpTemplateType, TemplateFieldsConfig> = {
  [EtpTemplateType.OBRAS]: {
    title: 'Campos Específicos - Obras e Engenharia',
    icon: '🏗️',
    fields: [
      {
        name: 'dynamicFields.artRrt',
        label: 'ART/RRT',
        type: 'input',
        placeholder: 'Ex: 1234567890',
        helpText:
          'Número da Anotação de Responsabilidade Técnica ou Registro de Responsabilidade Técnica',
        required: true,
        maxLength: 50,
      },
      {
        name: 'dynamicFields.memorialDescritivo',
        label: 'Memorial Descritivo',
        type: 'textarea',
        placeholder:
          'Descreva detalhadamente as especificações técnicas da obra...',
        helpText: 'Descrição técnica detalhada do projeto',
        required: true,
        maxLength: 10000,
        rows: 4,
      },
      {
        name: 'dynamicFields.cronogramaFisicoFinanceiro',
        label: 'Cronograma Físico-Financeiro',
        type: 'textarea',
        placeholder: 'Descreva as etapas e prazos da obra...',
        helpText: 'Cronograma com etapas, prazos e valores',
        required: true,
        maxLength: 10000,
        rows: 4,
      },
      {
        name: 'dynamicFields.bdiReferencia',
        label: 'BDI de Referência (%)',
        type: 'number',
        placeholder: 'Ex: 25.5',
        helpText:
          'Bonificação e Despesas Indiretas em percentual (conforme Acórdão TCU 2.622/2013)',
        required: false,
        min: 0,
        max: 100,
      },
      {
        name: 'dynamicFields.projetoBasico',
        label: 'Projeto Básico',
        type: 'textarea',
        placeholder: 'Informações do projeto básico...',
        helpText: 'Resumo do projeto básico (se disponível)',
        required: false,
        maxLength: 10000,
        rows: 3,
      },
      {
        name: 'dynamicFields.licencasAmbientais',
        label: 'Licenças Ambientais',
        type: 'textarea',
        placeholder: 'Licenças ambientais necessárias ou obtidas...',
        helpText: 'Licenças ambientais requeridas para a obra',
        required: false,
        maxLength: 2000,
        rows: 2,
      },
    ],
  },
  [EtpTemplateType.TI]: {
    title: 'Campos Específicos - Tecnologia da Informação',
    icon: '💻',
    fields: [
      {
        name: 'dynamicFields.especificacoesTecnicas',
        label: 'Especificações Técnicas',
        type: 'textarea',
        placeholder:
          'Ex: Sistema deve suportar 10.000 usuários simultâneos, tempo de resposta < 2s...',
        helpText: 'Especificações técnicas detalhadas do software/serviço',
        required: true,
        maxLength: 10000,
        rows: 4,
      },
      {
        name: 'dynamicFields.nivelServico',
        label: 'Níveis de Serviço (SLA)',
        type: 'textarea',
        placeholder:
          'Ex: Disponibilidade 99.9%, tempo de resposta para incidentes críticos < 4h...',
        helpText: 'Definição dos níveis de serviço esperados',
        required: true,
        maxLength: 5000,
        rows: 3,
      },
      {
        name: 'dynamicFields.metodologiaTrabalho',
        label: 'Metodologia de Trabalho',
        type: 'select',
        placeholder: 'Selecione a metodologia',
        helpText: 'Metodologia para execução do projeto',
        required: true,
        options: [
          { value: 'agil', label: 'Ágil (Scrum/Kanban)' },
          { value: 'cascata', label: 'Cascata (Waterfall)' },
          { value: 'hibrida', label: 'Híbrida' },
        ],
      },
      {
        name: 'dynamicFields.requisitosSeguranca',
        label: 'Requisitos de Segurança',
        type: 'textarea',
        placeholder: 'Ex: Conformidade com ISO 27001, criptografia AES-256...',
        helpText: 'Requisitos de segurança da informação',
        required: true,
        maxLength: 5000,
        rows: 3,
      },
      {
        name: 'dynamicFields.integracaoSistemas',
        label: 'Integrações com Sistemas',
        type: 'textarea',
        placeholder:
          'Ex: Integração via API REST com sistema X, Single Sign-On...',
        helpText: 'Sistemas que precisam ser integrados',
        required: false,
        maxLength: 5000,
        rows: 2,
      },
      {
        name: 'dynamicFields.lgpdConformidade',
        label: 'Conformidade LGPD',
        type: 'textarea',
        placeholder: 'Medidas de conformidade com a LGPD...',
        helpText:
          'Requisitos de conformidade com a Lei Geral de Proteção de Dados',
        required: false,
        maxLength: 3000,
        rows: 2,
      },
    ],
  },
  [EtpTemplateType.SERVICOS]: {
    title: 'Campos Específicos - Serviços Contínuos',
    icon: '🔧',
    fields: [
      {
        name: 'dynamicFields.produtividade',
        label: 'Produtividade',
        type: 'textarea',
        placeholder: 'Ex: 100 m²/dia por servente para limpeza de pisos...',
        helpText: 'Produtividade esperada por posto/função',
        required: true,
        maxLength: 2000,
        rows: 2,
      },
      {
        name: 'dynamicFields.postosTrabalho',
        label: 'Postos de Trabalho',
        type: 'number',
        placeholder: 'Ex: 10',
        helpText: 'Número de postos de trabalho necessários',
        required: true,
        min: 1,
      },
      {
        name: 'dynamicFields.frequenciaServico',
        label: 'Frequência do Serviço',
        type: 'input',
        placeholder: 'Ex: Segunda a sexta, 8h às 18h',
        helpText: 'Horários e dias de execução do serviço',
        required: true,
        maxLength: 500,
      },
      {
        name: 'dynamicFields.indicadoresDesempenho',
        label: 'Indicadores de Desempenho',
        type: 'textarea-array', // Issue #1531 - Backend expects string[]
        placeholder: 'Ex: Taxa de satisfação > 90%, Tempo de resposta < 4h...',
        helpText: 'KPIs para medição de desempenho (um por linha)',
        required: false,
        maxLength: 2000,
        rows: 3,
      },
      {
        name: 'dynamicFields.uniformesEpi',
        label: 'Uniformes e EPIs',
        type: 'textarea',
        placeholder:
          'Uniformes e equipamentos de proteção individual necessários...',
        helpText: 'Uniformes e EPIs que devem ser fornecidos',
        required: false,
        maxLength: 2000,
        rows: 2,
      },
      {
        name: 'dynamicFields.convencaoColetiva',
        label: 'Convenção Coletiva',
        type: 'input',
        placeholder: 'Ex: Sindicato dos Trabalhadores em Limpeza - SP',
        helpText: 'Convenção coletiva de referência para o serviço',
        required: false,
        maxLength: 500,
      },
    ],
  },
  [EtpTemplateType.MATERIAIS]: {
    title: 'Campos Específicos - Materiais e Bens',
    icon: '📦',
    fields: [
      {
        name: 'dynamicFields.especificacoesTecnicas',
        label: 'Especificações Técnicas',
        type: 'textarea',
        placeholder:
          'Ex: Processador Intel Core i7 12ª geração, 16GB RAM DDR4...',
        helpText: 'Especificações técnicas detalhadas do material/bem',
        required: true,
        maxLength: 5000,
        rows: 4,
      },
      {
        name: 'dynamicFields.garantiaMinima',
        label: 'Garantia Mínima',
        type: 'input',
        placeholder: 'Ex: 12 meses contra defeitos de fabricação',
        helpText: 'Período mínimo de garantia exigido',
        required: true,
        maxLength: 500,
      },
      {
        name: 'dynamicFields.assistenciaTecnica',
        label: 'Assistência Técnica',
        type: 'textarea',
        placeholder:
          'Ex: Assistência técnica em até 48h úteis, com cobertura nacional...',
        helpText: 'Requisitos de assistência técnica',
        required: false,
        maxLength: 2000,
        rows: 2,
      },
      {
        name: 'dynamicFields.catalogo',
        label: 'Código CATMAT/CATSER',
        type: 'input',
        placeholder: 'Ex: CATMAT 123456',
        helpText: 'Código no catálogo de materiais do governo',
        required: false,
        maxLength: 100,
      },
      {
        name: 'dynamicFields.normasAplicaveis',
        label: 'Normas Aplicáveis',
        type: 'textarea',
        placeholder: 'Ex: ABNT NBR 5410, ISO 9001...',
        helpText: 'Normas técnicas que o produto deve atender',
        required: false,
        maxLength: 2000,
        rows: 2,
      },
      {
        name: 'dynamicFields.instalacaoTreinamento',
        label: 'Instalação e Treinamento',
        type: 'textarea',
        placeholder: 'Requisitos de instalação e treinamento de usuários...',
        helpText:
          'Se aplicável, descrever requisitos de instalação e capacitação',
        required: false,
        maxLength: 3000,
        rows: 2,
      },
    ],
  },
};

/**
 * Renders dynamic form fields based on the selected template type.
 * Fields are conditionally required based on template configuration.
 *
 * Issue #1240 - [TMPL-1161f] Implement dynamic fields based on template
 */
export function DynamicFieldsRenderer({
  form,
  templateType,
}: DynamicFieldsRendererProps) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;

  // No template selected - show info message
  if (!templateType) {
    return (
      <div className="p-4 bg-muted rounded-lg text-center">
        <Info className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Selecione um template no passo anterior para ver campos específicos
        </p>
      </div>
    );
  }

  const config = DYNAMIC_FIELDS_CONFIG[templateType];
  if (!config) {
    return null;
  }

  // Helper to get nested error
  const getNestedError = (name: string) => {
    const parts = name.split('.');
    let error: unknown = errors;
    for (const part of parts) {
      error = (error as Record<string, unknown>)?.[part];
    }
    return (error as { message?: string })?.message;
  };

  // Helper to get nested value
  const getNestedValue = (name: string) => {
    const parts = name.split('.');
    let value: unknown = watch(parts[0] as keyof ETPWizardFormData);
    for (let i = 1; i < parts.length; i++) {
      value = (value as Record<string, unknown>)?.[parts[i]];
    }
    return value as string | number | string[] | undefined;
  };

  /**
   * Helper to convert array value to display string for textarea-array fields.
   * Issue #1531 - Backend returns string[], UI displays as newline-separated string.
   */
  const getDisplayValue = (
    value: string | number | string[] | undefined,
    fieldType: string,
  ): string => {
    if (value === undefined || value === null) return '';
    // For textarea-array, convert array to newline-separated string
    if (fieldType === 'textarea-array' && Array.isArray(value)) {
      return value.join('\n');
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <h3 className="font-semibold">{config.title}</h3>
          <p className="text-sm text-muted-foreground">
            Campos específicos para este tipo de contratação
          </p>
        </div>
      </div>

      {/* Required Fields Info */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="destructive" className="text-xs">
          Obrigatório
        </Badge>
        <span className="text-muted-foreground">
          Campos marcados são obrigatórios para este tipo de ETP
        </span>
      </div>

      {/* Dynamic Fields */}
      <div className="space-y-4">
        {config.fields.map((field) => {
          const fieldValue = getNestedValue(field.name);
          const displayValue = getDisplayValue(fieldValue, field.type);
          const error = getNestedError(field.name);

          return (
            <FormField
              key={field.name}
              label={field.label}
              name={field.name}
              required={field.required}
              helpText={field.helpText}
              error={error}
              charCount={
                field.maxLength
                  ? {
                      current: displayValue.length,
                      max: field.maxLength,
                    }
                  : undefined
              }
            >
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  rows={field.rows || 3}
                  {...register(field.name as keyof ETPWizardFormData)}
                />
              ) : field.type === 'textarea-array' ? (
                // Issue #1531 - textarea-array: displays string[], stores as newline-separated string
                // Zod schema transforms string → string[] on parse
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  rows={field.rows || 3}
                  defaultValue={displayValue}
                  {...register(field.name as keyof ETPWizardFormData)}
                />
              ) : field.type === 'select' ? (
                <Select
                  value={String(fieldValue) || ''}
                  onValueChange={(value) =>
                    setValue(field.name as keyof ETPWizardFormData, value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'number' ? (
                <Input
                  id={field.name}
                  type="number"
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  {...register(field.name as keyof ETPWizardFormData, {
                    valueAsNumber: true,
                  })}
                />
              ) : (
                <Input
                  id={field.name}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  {...register(field.name as keyof ETPWizardFormData)}
                />
              )}
            </FormField>
          );
        })}
      </div>
    </div>
  );
}
