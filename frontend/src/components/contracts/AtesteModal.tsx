import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AtesteResultado,
  type CreateAtesteDto,
  type Medicao,
} from '@/types/contract';

export interface AtesteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAtesteDto) => Promise<void>;
  medicao: Medicao | null;
  isLoading?: boolean;
}

const RESULTADO_LABELS: Record<AtesteResultado, string> = {
  [AtesteResultado.APROVADO]: 'Aprovado',
  [AtesteResultado.APROVADO_COM_RESSALVAS]: 'Aprovado com Ressalvas',
  [AtesteResultado.REJEITADO]: 'Rejeitado',
};

const RESULTADO_COLORS: Record<AtesteResultado, string> = {
  [AtesteResultado.APROVADO]: 'text-green-600',
  [AtesteResultado.APROVADO_COM_RESSALVAS]: 'text-yellow-600',
  [AtesteResultado.REJEITADO]: 'text-red-600',
};

export function AtesteModal({
  isOpen,
  onClose,
  onSubmit,
  medicao,
  isLoading = false,
}: AtesteModalProps) {
  const [formData, setFormData] = useState<CreateAtesteDto>({
    resultado: AtesteResultado.APROVADO,
    justificativa: '',
    valorAtestado: '',
    dataAteste: new Date().toISOString().split('T')[0],
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [justificativaRequired, setJustificativaRequired] = useState(false);
  const [valorAtestadoRequired, setValorAtestadoRequired] = useState(false);

  useEffect(() => {
    const needsJustificativa =
      formData.resultado === AtesteResultado.REJEITADO ||
      formData.resultado === AtesteResultado.APROVADO_COM_RESSALVAS;
    setJustificativaRequired(needsJustificativa);

    const needsValorAtestado =
      formData.resultado === AtesteResultado.APROVADO_COM_RESSALVAS;
    setValorAtestadoRequired(needsValorAtestado);
  }, [formData.resultado]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dataAteste) {
      newErrors.dataAteste = 'Data do ateste é obrigatória';
    }
    if (justificativaRequired && !formData.justificativa?.trim()) {
      newErrors.justificativa = 'Justificativa é obrigatória';
    }
    if (valorAtestadoRequired) {
      if (!formData.valorAtestado) {
        newErrors.valorAtestado = 'Valor atestado é obrigatório';
      } else if (isNaN(parseFloat(formData.valorAtestado))) {
        newErrors.valorAtestado = 'Valor deve ser um número válido';
      } else if (
        medicao &&
        parseFloat(formData.valorAtestado) > parseFloat(medicao.valorMedido)
      ) {
        newErrors.valorAtestado =
          'Valor atestado não pode exceder o valor medido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit(formData);
    onClose();
  };

  const handleChange = (
    field: keyof CreateAtesteDto,
    value: string | AtesteResultado | undefined,
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

  if (!medicao) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Atestar Medição</DialogTitle>
          <DialogDescription>
            Medição #{medicao.numero} - R$ {medicao.valorMedido}
            <br />
            Período: {new Date(medicao.periodoInicio).toLocaleDateString()} a{' '}
            {new Date(medicao.periodoFim).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resultado */}
          <div className="space-y-2">
            <Label htmlFor="resultado">
              Resultado <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.resultado}
              onValueChange={(value) =>
                handleChange('resultado', value as AtesteResultado)
              }
              disabled={isLoading}
            >
              <SelectTrigger
                id="resultado"
                className={RESULTADO_COLORS[formData.resultado]}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESULTADO_LABELS).map(([key, label]) => (
                  <SelectItem
                    key={key}
                    value={key}
                    className={RESULTADO_COLORS[key as AtesteResultado]}
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor Atestado (apenas se COM_RESSALVAS) */}
          {valorAtestadoRequired && (
            <div className="space-y-2">
              <Label htmlFor="valorAtestado">
                Valor Atestado (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="valorAtestado"
                type="text"
                placeholder="0.00"
                value={formData.valorAtestado}
                onChange={(e) => handleChange('valorAtestado', e.target.value)}
                disabled={isLoading}
                className={errors.valorAtestado ? 'border-red-500' : ''}
              />
              {errors.valorAtestado && (
                <p className="text-sm text-red-500">{errors.valorAtestado}</p>
              )}
              <p className="text-xs text-gray-500">
                Valor medido: R$ {medicao.valorMedido}
              </p>
            </div>
          )}

          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justificativa">
              Justificativa{' '}
              {justificativaRequired && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="justificativa"
              placeholder="Justifique o resultado do ateste..."
              value={formData.justificativa}
              onChange={(e) => handleChange('justificativa', e.target.value)}
              disabled={isLoading}
              rows={4}
              className={errors.justificativa ? 'border-red-500' : ''}
            />
            {errors.justificativa && (
              <p className="text-sm text-red-500">{errors.justificativa}</p>
            )}
            {justificativaRequired && (
              <p className="text-xs text-yellow-600">
                ⚠️ Obrigatório para rejeição ou aprovação com ressalvas
              </p>
            )}
          </div>

          {/* Data Ateste */}
          <div className="space-y-2">
            <Label htmlFor="dataAteste">
              Data do Ateste <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dataAteste"
              type="date"
              value={formData.dataAteste}
              onChange={(e) => handleChange('dataAteste', e.target.value)}
              disabled={isLoading}
              className={errors.dataAteste ? 'border-red-500' : ''}
            />
            {errors.dataAteste && (
              <p className="text-sm text-red-500">{errors.dataAteste}</p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações adicionais..."
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Confirmar Ateste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
