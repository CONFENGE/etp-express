/**
 * ContractsFilterBar Component (#1660)
 *
 * Provides filtering controls for contracts table:
 * - Status (multi-select)
 * - Fornecedor (autocomplete)
 * - Valor (min/max range)
 * - Vigência (date range)
 *
 * Active filters shown as badges with clear option.
 */

import { useState } from 'react';
import { X, Filter, Search } from 'lucide-react';
import { ContractFilters, ContratoStatus, CONTRATO_STATUS_LABEL } from '@/types/contract';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ContractsFilterBarProps {
  filters: ContractFilters;
  onChange: (filters: ContractFilters) => void;
}

export function ContractsFilterBar({ filters, onChange }: ContractsFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    (filters.status && filters.status.length > 0) ||
    filters.fornecedor ||
    filters.valorMin !== undefined ||
    filters.valorMax !== undefined ||
    filters.vigenciaInicio ||
    filters.vigenciaFim;

  const activeFilterCount =
    (filters.status?.length || 0) +
    (filters.fornecedor ? 1 : 0) +
    (filters.valorMin !== undefined ? 1 : 0) +
    (filters.valorMax !== undefined ? 1 : 0) +
    (filters.vigenciaInicio ? 1 : 0) +
    (filters.vigenciaFim ? 1 : 0);

  const handleClearAll = () => {
    onChange({});
    setIsOpen(false);
  };

  const handleStatusChange = (status: ContratoStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];

    onChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const handleRemoveFilter = (key: keyof ContractFilters) => {
    const updated = { ...filters };
    delete updated[key];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Filter Trigger */}
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filtros</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-auto p-1 text-xs"
                  >
                    Limpar todos
                  </Button>
                )}
              </div>

              {/* Status Filter (Multi-select) */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(ContratoStatus).map((status) => (
                    <label
                      key={status}
                      className="flex items-center space-x-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.status?.includes(status) || false}
                        onChange={() => handleStatusChange(status)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span>{CONTRATO_STATUS_LABEL[status]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Fornecedor Filter */}
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fornecedor"
                    placeholder="Buscar por nome ou CNPJ..."
                    value={filters.fornecedor || ''}
                    onChange={(e) =>
                      onChange({
                        ...filters,
                        fornecedor: e.target.value || undefined,
                      })
                    }
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Valor Range Filter */}
              <div className="space-y-2">
                <Label>Faixa de Valor (R$)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Mínimo"
                    value={filters.valorMin || ''}
                    onChange={(e) =>
                      onChange({
                        ...filters,
                        valorMin: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={filters.valorMax || ''}
                    onChange={(e) =>
                      onChange({
                        ...filters,
                        valorMax: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>

              {/* Vigência Date Range Filter */}
              <div className="space-y-2">
                <Label>Período de Vigência</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="date"
                      value={filters.vigenciaInicio || ''}
                      onChange={(e) =>
                        onChange({
                          ...filters,
                          vigenciaInicio: e.target.value || undefined,
                        })
                      }
                      aria-label="Data de início"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={filters.vigenciaFim || ''}
                      onChange={(e) =>
                        onChange({
                          ...filters,
                          vigenciaFim: e.target.value || undefined,
                        })
                      }
                      aria-label="Data de término"
                    />
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.status?.map((status) => (
            <FilterBadge
              key={status}
              label={`Status: ${CONTRATO_STATUS_LABEL[status]}`}
              onRemove={() => {
                const updated = filters.status!.filter((s) => s !== status);
                onChange({
                  ...filters,
                  status: updated.length > 0 ? updated : undefined,
                });
              }}
            />
          ))}
          {filters.fornecedor && (
            <FilterBadge
              label={`Fornecedor: ${filters.fornecedor}`}
              onRemove={() => handleRemoveFilter('fornecedor')}
            />
          )}
          {filters.valorMin !== undefined && (
            <FilterBadge
              label={`Valor mín: R$ ${filters.valorMin.toLocaleString('pt-BR')}`}
              onRemove={() => handleRemoveFilter('valorMin')}
            />
          )}
          {filters.valorMax !== undefined && (
            <FilterBadge
              label={`Valor máx: R$ ${filters.valorMax.toLocaleString('pt-BR')}`}
              onRemove={() => handleRemoveFilter('valorMax')}
            />
          )}
          {filters.vigenciaInicio && (
            <FilterBadge
              label={`Início: ${new Date(filters.vigenciaInicio).toLocaleDateString('pt-BR')}`}
              onRemove={() => handleRemoveFilter('vigenciaInicio')}
            />
          )}
          {filters.vigenciaFim && (
            <FilterBadge
              label={`Término: ${new Date(filters.vigenciaFim).toLocaleDateString('pt-BR')}`}
              onRemove={() => handleRemoveFilter('vigenciaFim')}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface FilterBadgeProps {
  label: string;
  onRemove: () => void;
}

function FilterBadge({ label, onRemove }: FilterBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
      {label}
      <button
        onClick={onRemove}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
        aria-label={`Remover filtro: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
