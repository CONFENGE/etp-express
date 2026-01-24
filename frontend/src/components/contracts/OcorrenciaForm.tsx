import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  OcorrenciaTipo,
  OcorrenciaGravidade,
  type CreateOcorrenciaDto,
  type Ocorrencia,
} from '@/types/contract';

export interface OcorrenciaFormProps {
  onSubmit: (data: CreateOcorrenciaDto) => Promise<void>;
  onCancel: () => void;
  initialData?: Ocorrencia;
  isLoading?: boolean;
}

const TIPO_LABELS: Record<OcorrenciaTipo, string> = {
  [OcorrenciaTipo.ATRASO]: 'Atraso',
  [OcorrenciaTipo.FALHA]: 'Falha',
  [OcorrenciaTipo.INADIMPLENCIA]: 'Inadimplência',
  [OcorrenciaTipo.OUTRO]: 'Outro',
};

const GRAVIDADE_LABELS: Record<OcorrenciaGravidade, string> = {
  [OcorrenciaGravidade.BAIXA]: 'Baixa',
  [OcorrenciaGravidade.MEDIA]: 'Média',
  [OcorrenciaGravidade.ALTA]: 'Alta',
  [OcorrenciaGravidade.CRITICA]: 'Crítica',
};

const GRAVIDADE_COLORS: Record<OcorrenciaGravidade, string> = {
  [OcorrenciaGravidade.BAIXA]: 'text-blue-600',
  [OcorrenciaGravidade.MEDIA]: 'text-yellow-600',
  [OcorrenciaGravidade.ALTA]: 'text-orange-600',
  [OcorrenciaGravidade.CRITICA]: 'text-red-600',
};

export function OcorrenciaForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: OcorrenciaFormProps) {
  const [formData, setFormData] = useState<CreateOcorrenciaDto>({
    tipo: initialData?.tipo || OcorrenciaTipo.OUTRO,
    gravidade: initialData?.gravidade || OcorrenciaGravidade.BAIXA,
    dataOcorrencia: initialData?.dataOcorrencia.split('T')[0] || '',
    descricao: initialData?.descricao || '',
    acaoCorretiva: initialData?.acaoCorretiva || '',
    prazoResolucao: initialData?.prazoResolucao?.split('T')[0] || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acaoCorretivaRequired, setAcaoCorretivaRequired] = useState(
    formData.gravidade === OcorrenciaGravidade.CRITICA,
  );

  useEffect(() => {
    setAcaoCorretivaRequired(formData.gravidade === OcorrenciaGravidade.CRITICA);
  }, [formData.gravidade]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dataOcorrencia) {
      newErrors.dataOcorrencia = 'Data da ocorrência é obrigatória';
    }
    if (!formData.descricao) {
      newErrors.descricao = 'Descrição é obrigatória';
    } else if (formData.descricao.length < 20) {
      newErrors.descricao = 'Descrição deve ter no mínimo 20 caracteres';
    }
    if (
      acaoCorretivaRequired &&
      (!formData.acaoCorretiva || formData.acaoCorretiva.trim() === '')
    ) {
      newErrors.acaoCorretiva =
        'Ação corretiva é obrigatória para ocorrências críticas';
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
    field: keyof CreateOcorrenciaDto,
    value: string | OcorrenciaTipo | OcorrenciaGravidade | undefined,
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
        {/* Tipo */}
        <div className="space-y-2">
          <Label htmlFor="tipo">
            Tipo <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.tipo}
            onValueChange={(value) =>
              handleChange('tipo', value as OcorrenciaTipo)
            }
            disabled={isLoading}
          >
            <SelectTrigger id="tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIPO_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gravidade */}
        <div className="space-y-2">
          <Label htmlFor="gravidade">
            Gravidade <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.gravidade}
            onValueChange={(value) =>
              handleChange('gravidade', value as OcorrenciaGravidade)
            }
            disabled={isLoading}
          >
            <SelectTrigger
              id="gravidade"
              className={GRAVIDADE_COLORS[formData.gravidade]}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GRAVIDADE_LABELS).map(([key, label]) => (
                <SelectItem
                  key={key}
                  value={key}
                  className={GRAVIDADE_COLORS[key as OcorrenciaGravidade]}
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Data Ocorrência */}
        <div className="space-y-2">
          <Label htmlFor="dataOcorrencia">
            Data da Ocorrência <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dataOcorrencia"
            type="date"
            value={formData.dataOcorrencia}
            onChange={(e) => handleChange('dataOcorrencia', e.target.value)}
            disabled={isLoading}
            className={errors.dataOcorrencia ? 'border-red-500' : ''}
          />
          {errors.dataOcorrencia && (
            <p className="text-sm text-red-500">{errors.dataOcorrencia}</p>
          )}
        </div>

        {/* Prazo Resolução */}
        <div className="space-y-2">
          <Label htmlFor="prazoResolucao">Prazo para Resolução</Label>
          <Input
            id="prazoResolucao"
            type="date"
            value={formData.prazoResolucao}
            onChange={(e) => handleChange('prazoResolucao', e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="descricao">
          Descrição <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="descricao"
          placeholder="Descreva a ocorrência em detalhes (mínimo 20 caracteres)..."
          value={formData.descricao}
          onChange={(e) => handleChange('descricao', e.target.value)}
          disabled={isLoading}
          rows={4}
          className={errors.descricao ? 'border-red-500' : ''}
        />
        {errors.descricao && (
          <p className="text-sm text-red-500">{errors.descricao}</p>
        )}
        <p className="text-xs text-gray-500">
          {formData.descricao.length} / 20 caracteres (mínimo)
        </p>
      </div>

      {/* Ação Corretiva */}
      <div className="space-y-2">
        <Label htmlFor="acaoCorretiva">
          Ação Corretiva{' '}
          {acaoCorretivaRequired && <span className="text-red-500">*</span>}
        </Label>
        <Textarea
          id="acaoCorretiva"
          placeholder="Descreva as ações corretivas necessárias..."
          value={formData.acaoCorretiva}
          onChange={(e) => handleChange('acaoCorretiva', e.target.value)}
          disabled={isLoading}
          rows={3}
          className={errors.acaoCorretiva ? 'border-red-500' : ''}
        />
        {errors.acaoCorretiva && (
          <p className="text-sm text-red-500">{errors.acaoCorretiva}</p>
        )}
        {acaoCorretivaRequired && (
          <p className="text-xs text-yellow-600">
            ⚠️ Obrigatório para ocorrências de gravidade CRÍTICA
          </p>
        )}
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
          {isLoading ? 'Salvando...' : 'Salvar Ocorrência'}
        </Button>
      </div>
    </form>
  );
}
