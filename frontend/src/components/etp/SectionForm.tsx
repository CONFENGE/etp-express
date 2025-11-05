import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { HelpTooltip } from '@/components/common/HelpTooltip';
import { SectionTemplate } from '@/types/etp';
import { Save } from 'lucide-react';

interface SectionFormProps {
  template: SectionTemplate;
  defaultValues?: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function SectionForm({
  template,
  defaultValues,
  onSave,
  isLoading,
}: SectionFormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: defaultValues || {},
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      {template.fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.helpText && <HelpTooltip content={field.helpText} />}
          </div>

          {field.type === 'textarea' ? (
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              rows={6}
              {...register(field.name, { required: field.required })}
            />
          ) : field.type === 'select' && field.options ? (
            <select
              id={field.name}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              {...register(field.name, { required: field.required })}
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
              {...register(field.name, { required: field.required })}
            />
          )}
        </div>
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? 'Salvando...' : 'Salvar Seção'}
        </Button>
      </div>
    </form>
  );
}
