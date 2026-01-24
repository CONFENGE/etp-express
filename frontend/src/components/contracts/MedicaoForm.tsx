import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CreateMedicaoDto, Medicao } from '@/types/contract';

export interface MedicaoFormProps {
  onSubmit: (data: CreateMedicaoDto) => Promise<void>;
  onCancel: () => void;
  initialData?: Medicao;
  isLoading?: boolean;
}

export function MedicaoForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: MedicaoFormProps) {
  const [formData, setFormData] = useState<CreateMedicaoDto>({
    periodoInicio: initialData?.periodoInicio.split('T')[0] || '',
    periodoFim: initialData?.periodoFim.split('T')[0] || '',
    valorMedido: initialData?.valorMedido || '',
    descricao: initialData?.descricao || '',
    observacoes: initialData?.observacoes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.periodoInicio) {
      newErrors.periodoInicio = 'Data de início é obrigatória';
    }
    if (!formData.periodoFim) {
      newErrors.periodoFim = 'Data de fim é obrigatória';
    }
    if (!formData.valorMedido) {
      newErrors.valorMedido = 'Valor medido é obrigatório';
    } else if (isNaN(parseFloat(formData.valorMedido))) {
      newErrors.valorMedido = 'Valor deve ser um número válido';
    } else if (parseFloat(formData.valorMedido) <= 0) {
      newErrors.valorMedido = 'Valor deve ser maior que zero';
    }

    if (
      formData.periodoInicio &&
      formData.periodoFim &&
      formData.periodoInicio > formData.periodoFim
    ) {
      newErrors.periodoFim = 'Data de fim deve ser posterior à data de início';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit(formData);
  };

  const handleChange = (
    field: keyof CreateMedicaoDto,
    value: string | undefined,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Período Início */}
        <div className="space-y-2">
          <Label htmlFor="periodoInicio">
            Período - Início <span className="text-red-500">*</span>
          </Label>
          <Input
            id="periodoInicio"
            type="date"
            value={formData.periodoInicio}
            onChange={(e) => handleChange('periodoInicio', e.target.value)}
            disabled={isLoading}
            className={errors.periodoInicio ? 'border-red-500' : ''}
          />
          {errors.periodoInicio && (
            <p className="text-sm text-red-500">{errors.periodoInicio}</p>
          )}
        </div>

        {/* Período Fim */}
        <div className="space-y-2">
          <Label htmlFor="periodoFim">
            Período - Fim <span className="text-red-500">*</span>
          </Label>
          <Input
            id="periodoFim"
            type="date"
            value={formData.periodoFim}
            onChange={(e) => handleChange('periodoFim', e.target.value)}
            disabled={isLoading}
            className={errors.periodoFim ? 'border-red-500' : ''}
          />
          {errors.periodoFim && (
            <p className="text-sm text-red-500">{errors.periodoFim}</p>
          )}
        </div>
      </div>

      {/* Valor Medido */}
      <div className="space-y-2">
        <Label htmlFor="valorMedido">
          Valor Medido (R$) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="valorMedido"
          type="text"
          placeholder="0.00"
          value={formData.valorMedido}
          onChange={(e) => handleChange('valorMedido', e.target.value)}
          disabled={isLoading}
          className={errors.valorMedido ? 'border-red-500' : ''}
        />
        {errors.valorMedido && (
          <p className="text-sm text-red-500">{errors.valorMedido}</p>
        )}
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          placeholder="Descreva os serviços executados neste período..."
          value={formData.descricao}
          onChange={(e) => handleChange('descricao', e.target.value)}
          disabled={isLoading}
          rows={4}
        />
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          placeholder="Anotações adicionais..."
          value={formData.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          disabled={isLoading}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Medição'}
        </Button>
      </div>
    </form>
  );
}
