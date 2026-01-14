import { UseFormReturn } from 'react-hook-form';
import { ETPWizardFormData } from '@/schemas/etpWizardSchema';
import { DynamicFieldsRenderer } from '../DynamicFieldsRenderer';
import { EtpTemplateType } from '@/types/template';

interface Step4DynamicFieldsProps {
  form: UseFormReturn<ETPWizardFormData>;
}

/**
 * Step 4 of the ETP Creation Wizard - Dynamic Fields based on template.
 * Renders template-specific fields using DynamicFieldsRenderer.
 *
 * Issue #1240 - [TMPL-1161f] Implement dynamic fields based on template
 */
export function Step4DynamicFields({ form }: Step4DynamicFieldsProps) {
  const templateType = form.watch('templateType') as EtpTemplateType | null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <DynamicFieldsRenderer form={form} templateType={templateType} />
    </div>
  );
}
