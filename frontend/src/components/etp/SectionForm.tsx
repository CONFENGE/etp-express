import { memo, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { HelpTooltip } from '@/components/common/HelpTooltip';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { FormField } from '@/components/form/FormField';
import { FormProgressBar } from '@/components/form/FormProgressBar';
import { useFormProgress } from '@/hooks/useFormProgress';
import { SectionTemplate } from '@/types/etp';
import { Save } from 'lucide-react';

// Character limits
const TEXT_MAX_LENGTH = 500;
const TEXTAREA_MAX_LENGTH = 5000;
const RICHTEXT_MAX_LENGTH = 10000;

interface SectionFormProps {
  template: SectionTemplate;
  defaultValues?: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

// Build dynamic zod schema from template fields
function buildSchema(fields: SectionTemplate['fields']) {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    if (field.type === 'richtext' || field.type === 'textarea') {
      const maxLength =
        field.type === 'richtext' ? RICHTEXT_MAX_LENGTH : TEXTAREA_MAX_LENGTH;
      fieldSchema = z
        .string()
        .max(maxLength, `Máximo de ${maxLength} caracteres`);
    } else if (field.type === 'number') {
      fieldSchema = z.coerce.number().optional();
    } else if (field.type === 'select') {
      fieldSchema = z.string();
    } else {
      fieldSchema = z
        .string()
        .max(TEXT_MAX_LENGTH, `Máximo de ${TEXT_MAX_LENGTH} caracteres`);
    }

    if (field.required) {
      if (field.type === 'number') {
        fieldSchema = z.coerce.number({ required_error: 'Campo obrigatório' });
      } else {
        fieldSchema = (fieldSchema as z.ZodString).min(1, 'Campo obrigatório');
      }
    } else {
      fieldSchema = fieldSchema.optional().or(z.literal(''));
    }

    shape[field.name] = fieldSchema;
  });

  return z.object(shape);
}

// Memoized component to prevent unnecessary re-renders (#457)
export const SectionForm = memo(function SectionForm({
  template,
  defaultValues,
  onSave,
  isLoading,
}: SectionFormProps) {
  // Build schema from template
  const schema = useMemo(() => buildSchema(template.fields), [template.fields]);

  // Memoize default values to prevent useForm re-initialization (#457)
  const memoizedDefaultValues = useMemo(
    () => defaultValues || {},
    [defaultValues],
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, touchedFields },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: memoizedDefaultValues,
  });

  // Get field names for progress tracking
  const fieldNames = useMemo(
    () => template.fields.map((f) => f.name),
    [template.fields],
  );

  const requiredFields = useMemo(
    () => template.fields.filter((f) => f.required).map((f) => f.name),
    [template.fields],
  );

  // Track form progress
  const { progress, filledFields, totalFields } = useFormProgress({
    watch,
    errors,
    fieldNames,
    requiredFields,
  });

  // Memoize the submit handler wrapper (#457)
  const onSubmit = useCallback(
    (data: Record<string, unknown>) => {
      onSave(data);
    },
    [onSave],
  );

  // Get character limit for field type
  const getMaxLength = (type: string) => {
    switch (type) {
      case 'richtext':
        return RICHTEXT_MAX_LENGTH;
      case 'textarea':
        return TEXTAREA_MAX_LENGTH;
      default:
        return TEXT_MAX_LENGTH;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Progress bar */}
      <FormProgressBar
        progress={progress}
        filledFields={filledFields}
        totalFields={totalFields}
        showCompletionMessage={false}
      />

      {template.fields.map((field) => {
        const fieldError = errors[field.name];
        const isTouched = touchedFields[field.name];
        const watchedValue = watch(field.name);
        const stringValue =
          typeof watchedValue === 'string' ? watchedValue : '';
        const maxLength = getMaxLength(field.type);
        const isValid =
          !fieldError &&
          isTouched &&
          (field.required ? stringValue.length > 0 : true);

        return (
          <FormField
            key={field.name}
            label={field.label}
            name={field.name}
            required={field.required}
            error={fieldError?.message as string | undefined}
            isValid={isValid}
            charCount={
              ['textarea', 'richtext', 'text'].includes(field.type)
                ? { current: stringValue.length, max: maxLength }
                : undefined
            }
            helpText={field.helpText}
          >
            <div className="flex items-center gap-2">
              {field.type === 'richtext' ? (
                <Controller
                  name={field.name}
                  control={control}
                  rules={{ required: field.required }}
                  render={({ field: controllerField }) => (
                    <RichTextEditor
                      id={field.name}
                      content={(controllerField.value as string) || ''}
                      onChange={(html) => controllerField.onChange(html)}
                      placeholder={field.placeholder}
                      disabled={isLoading}
                      minHeight="200px"
                    />
                  )}
                />
              ) : field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  rows={6}
                  disabled={isLoading}
                  {...register(field.name)}
                />
              ) : field.type === 'select' && field.options ? (
                <select
                  id={field.name}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                  {...register(field.name)}
                >
                  <option value="">Selecione...</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  disabled={isLoading}
                  {...register(field.name)}
                />
              )}
              {field.helpText && <HelpTooltip content={field.helpText} />}
            </div>
          </FormField>
        );
      })}

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? 'Salvando...' : 'Salvar Seção'}
        </Button>
      </div>
    </form>
  );
});
