import { UseFormReturn } from 'react-hook-form';
import { ETPWizardFormData } from '@/schemas/etpWizardSchema';
import { TemplateSelector } from '@/components/etp/TemplateSelector';
import { EtpTemplate } from '@/types/template';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface Step0TemplateSelectionProps {
  form: UseFormReturn<ETPWizardFormData>;
}

/**
 * Step 0 of the ETP Creation Wizard: Template Selection.
 * Issue #1239 - Integrate TemplateSelector into CreateETPWizard
 * Issue #1240 - Store templateType for dynamic fields
 *
 * Features:
 * - Displays TemplateSelector component with available templates
 * - Option to proceed without a template (blank document)
 * - Selected template persists in form state
 * - Stores templateType for dynamic fields rendering
 */
export function Step0TemplateSelection({ form }: Step0TemplateSelectionProps) {
  const { setValue, watch } = form;
  const selectedTemplateId = watch('templateId');

  const handleTemplateSelect = (template: EtpTemplate) => {
    setValue('templateId', template.id, { shouldValidate: true });
    setValue('templateType', template.type, { shouldValidate: true });
  };

  const handleBlankDocument = () => {
    setValue('templateId', null, { shouldValidate: true });
    setValue('templateType', null, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h4 className="text-lg font-medium mb-2">Escolha um modelo de ETP</h4>
        <p className="text-sm text-muted-foreground">
          Selecione um template pre-configurado para acelerar a criacao do seu
          ETP, ou comece com um documento em branco.
        </p>
      </div>

      <TemplateSelector
        selectedTemplateId={selectedTemplateId ?? null}
        onSelect={handleTemplateSelect}
      />

      <div className="border-t pt-4">
        <Button
          type="button"
          variant={selectedTemplateId === null ? 'secondary' : 'outline'}
          className="w-full"
          onClick={handleBlankDocument}
        >
          <FileText className="w-4 h-4 mr-2" />
          Iniciar com documento em branco
        </Button>
        {selectedTemplateId === null && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Documento em branco selecionado - todos os campos serao opcionais
          </p>
        )}
      </div>
    </div>
  );
}
