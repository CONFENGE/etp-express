import { memo } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TRSectionTemplate, TermoReferencia } from '@/types/termo-referencia';

/**
 * Content component for TR Editor sections.
 *
 * Renders the appropriate input for each section field.
 * Handles text areas for most fields, number input for valor.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 */

interface TREditorContentProps {
  /** Section templates */
  sections: TRSectionTemplate[];
  /** Current TR data */
  currentTR: TermoReferencia;
  /** Handler for field value changes */
  onFieldChange: (field: keyof TermoReferencia, value: string | number) => void;
}

export const TREditorContent = memo(function TREditorContent({
  sections,
  currentTR,
  onFieldChange,
}: TREditorContentProps) {
  const renderFieldInput = (section: TRSectionTemplate) => {
    const value = currentTR[section.field];

    // Special handling for monetary value fields
    if (section.field === 'valorEstimado') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="valorEstimado">Valor Estimado (R$)</Label>
            <Input
              id="valorEstimado"
              type="number"
              step="0.01"
              min="0"
              value={(value as number) || ''}
              onChange={(e) =>
                onFieldChange('valorEstimado', parseFloat(e.target.value) || 0)
              }
              placeholder="Ex: 150000.00"
              className="mt-1"
              data-testid="field-valorEstimado"
            />
          </div>
          <div>
            <Label htmlFor="dotacaoOrcamentaria">Dotacao Orcamentaria</Label>
            <Input
              id="dotacaoOrcamentaria"
              type="text"
              value={(currentTR.dotacaoOrcamentaria as string) || ''}
              onChange={(e) =>
                onFieldChange('dotacaoOrcamentaria', e.target.value)
              }
              placeholder="Ex: 02.031.0001.2001.339039"
              className="mt-1"
              data-testid="field-dotacaoOrcamentaria"
            />
          </div>
          <div>
            <Label htmlFor="prazoVigencia">Prazo de Vigencia (dias)</Label>
            <Input
              id="prazoVigencia"
              type="number"
              min="1"
              value={(currentTR.prazoVigencia as number) || ''}
              onChange={(e) =>
                onFieldChange('prazoVigencia', parseInt(e.target.value) || 0)
              }
              placeholder="Ex: 365"
              className="mt-1"
              data-testid="field-prazoVigencia"
            />
          </div>
        </div>
      );
    }

    // Special handling for obrigacoes section - shows both fields
    if (section.field === 'obrigacoesContratante') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="obrigacoesContratante">
              Obrigacoes do Contratante
            </Label>
            <Textarea
              id="obrigacoesContratante"
              value={(currentTR.obrigacoesContratante as string) || ''}
              onChange={(e) =>
                onFieldChange('obrigacoesContratante', e.target.value)
              }
              placeholder="Liste as obrigacoes do orgao publico..."
              className="mt-1 min-h-[150px]"
              data-testid="field-obrigacoesContratante"
            />
          </div>
          <div>
            <Label htmlFor="obrigacoesContratada">
              Obrigacoes da Contratada
            </Label>
            <Textarea
              id="obrigacoesContratada"
              value={(currentTR.obrigacoesContratada as string) || ''}
              onChange={(e) =>
                onFieldChange('obrigacoesContratada', e.target.value)
              }
              placeholder="Liste as obrigacoes do fornecedor..."
              className="mt-1 min-h-[150px]"
              data-testid="field-obrigacoesContratada"
            />
          </div>
        </div>
      );
    }

    // Default: text area for all other fields
    return (
      <Textarea
        id={section.field}
        value={(value as string) || ''}
        onChange={(e) => onFieldChange(section.field, e.target.value)}
        placeholder={section.placeholder}
        className="min-h-[250px]"
        data-testid={`field-${section.field}`}
      />
    );
  };

  return (
    <>
      {sections.map((section) => (
        <TabsContent
          key={section.number}
          value={String(section.number)}
          className="mt-4"
          data-testid={`content-${section.number}`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{section.title}</h3>
              {section.isRequired && (
                <Badge variant="destructive" className="text-xs">
                  Obrigatorio
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {section.description}
            </p>
            <div className="mt-2">{renderFieldInput(section)}</div>
          </div>
        </TabsContent>
      ))}
    </>
  );
});
