/**
 * Risk Matrix Component
 *
 * Displays and manages a parametrized risk analysis matrix with:
 * - Visual 3x3 probability x impact grid
 * - List of identified risks with category, level, and mitigation
 * - Global risk score indicator
 * - Add/Edit/Remove risk functionality
 *
 * @see https://github.com/CONFENGE/etp-express/issues/1160
 */

import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  RiskItem,
  RiskMatrix as RiskMatrixType,
  RiskCategory,
  RiskProbability,
  RiskImpact,
  RiskLevel,
  RiskCategoryLabels,
  ProbabilityLabels,
  ImpactLabels,
  RiskLevelLabels,
  RiskLevelColors,
  DefaultMitigationSuggestions,
  calculateRiskLevel,
} from '@/types/risk';

interface RiskMatrixProps {
  /** Current risk matrix data */
  matrix: RiskMatrixType | null;
  /** Callback when matrix changes */
  onChange: (matrix: RiskMatrixType) => void;
  /** Whether the component is read-only */
  readOnly?: boolean;
}

/** Empty risk form state */
const emptyRiskForm = {
  category: '' as RiskCategory | '',
  description: '',
  probability: '' as RiskProbability | '',
  impact: '' as RiskImpact | '',
  mitigation: '',
  responsible: '',
};

export function RiskMatrix({
  matrix,
  onChange,
  readOnly = false,
}: RiskMatrixProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<RiskItem | null>(null);
  const [riskForm, setRiskForm] = useState(emptyRiskForm);
  const [expandedRisks, setExpandedRisks] = useState<Set<string>>(new Set());

  // Calculate risk level preview
  const previewLevel = useMemo(() => {
    if (riskForm.probability && riskForm.impact) {
      return calculateRiskLevel(
        riskForm.probability as RiskProbability,
        riskForm.impact as RiskImpact,
      );
    }
    return null;
  }, [riskForm.probability, riskForm.impact]);

  // Initialize empty matrix if null
  const currentMatrix: RiskMatrixType = matrix || {
    risks: [],
    globalScore: 0,
    globalLevel: 'LOW',
    distribution: { low: 0, medium: 0, high: 0, critical: 0, total: 0 },
    calculatedAt: new Date().toISOString(),
    version: 1,
  };

  const handleOpenAddDialog = () => {
    setRiskForm(emptyRiskForm);
    setEditingRisk(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (risk: RiskItem) => {
    setRiskForm({
      category: risk.category,
      description: risk.description,
      probability: risk.probability,
      impact: risk.impact,
      mitigation: risk.mitigation,
      responsible: risk.responsible,
    });
    setEditingRisk(risk);
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setRiskForm(emptyRiskForm);
    setEditingRisk(null);
  };

  const handleSaveRisk = () => {
    if (
      !riskForm.category ||
      !riskForm.description ||
      !riskForm.probability ||
      !riskForm.impact
    ) {
      return;
    }

    const level = calculateRiskLevel(
      riskForm.probability as RiskProbability,
      riskForm.impact as RiskImpact,
    );

    let updatedRisks: RiskItem[];

    if (editingRisk) {
      // Update existing risk
      updatedRisks = currentMatrix.risks.map((r) =>
        r.id === editingRisk.id
          ? {
              ...r,
              category: riskForm.category as RiskCategory,
              description: riskForm.description,
              probability: riskForm.probability as RiskProbability,
              impact: riskForm.impact as RiskImpact,
              level,
              mitigation: riskForm.mitigation,
              responsible: riskForm.responsible,
            }
          : r,
      );
    } else {
      // Add new risk
      const newRisk: RiskItem = {
        id: crypto.randomUUID(),
        category: riskForm.category as RiskCategory,
        description: riskForm.description,
        probability: riskForm.probability as RiskProbability,
        impact: riskForm.impact as RiskImpact,
        level,
        mitigation: riskForm.mitigation,
        responsible: riskForm.responsible,
        order: currentMatrix.risks.length,
      };
      updatedRisks = [...currentMatrix.risks, newRisk];
    }

    // Recalculate matrix
    const newMatrix = recalculateMatrix(updatedRisks);
    onChange(newMatrix);
    handleCloseDialog();
  };

  const handleDeleteRisk = (riskId: string) => {
    const updatedRisks = currentMatrix.risks
      .filter((r) => r.id !== riskId)
      .map((r, index) => ({ ...r, order: index }));

    const newMatrix = recalculateMatrix(updatedRisks);
    onChange(newMatrix);
  };

  const toggleRiskExpanded = (riskId: string) => {
    setExpandedRisks((prev) => {
      const next = new Set(prev);
      if (next.has(riskId)) {
        next.delete(riskId);
      } else {
        next.add(riskId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Global Score Indicator */}
      <GlobalScoreCard
        score={currentMatrix.globalScore}
        level={currentMatrix.globalLevel}
        distribution={currentMatrix.distribution}
      />

      {/* Risk List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Riscos Identificados</CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={handleOpenAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Risco
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {currentMatrix.risks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertTriangle className="mb-2 h-8 w-8" />
              <p>Nenhum risco identificado</p>
              {!readOnly && (
                <p className="text-sm">
                  Clique em &quot;Adicionar Risco&quot; para começar
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currentMatrix.risks.map((risk) => (
                <RiskItemCard
                  key={risk.id}
                  risk={risk}
                  isExpanded={expandedRisks.has(risk.id)}
                  onToggleExpand={() => toggleRiskExpanded(risk.id)}
                  onEdit={() => handleOpenEditDialog(risk)}
                  onDelete={() => handleDeleteRisk(risk.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Risk Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRisk ? 'Editar Risco' : 'Adicionar Novo Risco'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={riskForm.category}
                onValueChange={(value) =>
                  setRiskForm((prev) => ({
                    ...prev,
                    category: value as RiskCategory,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RiskCategoryLabels) as RiskCategory[]).map(
                    (cat) => (
                      <SelectItem key={cat} value={cat}>
                        {RiskCategoryLabels[cat]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição do Risco *</Label>
              <Textarea
                id="description"
                placeholder="Descreva o risco identificado..."
                value={riskForm.description}
                onChange={(e) =>
                  setRiskForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            {/* Probability and Impact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="probability">Probabilidade *</Label>
                <Select
                  value={riskForm.probability}
                  onValueChange={(value) =>
                    setRiskForm((prev) => ({
                      ...prev,
                      probability: value as RiskProbability,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ProbabilityLabels) as RiskProbability[]).map(
                      (prob) => (
                        <SelectItem key={prob} value={prob}>
                          {ProbabilityLabels[prob]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="impact">Impacto *</Label>
                <Select
                  value={riskForm.impact}
                  onValueChange={(value) =>
                    setRiskForm((prev) => ({
                      ...prev,
                      impact: value as RiskImpact,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ImpactLabels) as RiskImpact[]).map((imp) => (
                      <SelectItem key={imp} value={imp}>
                        {ImpactLabels[imp]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Risk Level Preview */}
            {previewLevel && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Nível de Risco:
                </span>
                <RiskLevelBadge level={previewLevel} />
              </div>
            )}

            {/* Mitigation */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mitigation">Estratégia de Mitigação</Label>
                {riskForm.category && (
                  <MitigationSuggestions
                    category={riskForm.category as RiskCategory}
                    onSelect={(suggestion) =>
                      setRiskForm((prev) => ({
                        ...prev,
                        mitigation: prev.mitigation
                          ? `${prev.mitigation}\n${suggestion}`
                          : suggestion,
                      }))
                    }
                  />
                )}
              </div>
              <Textarea
                id="mitigation"
                placeholder="Descreva como o risco será mitigado..."
                value={riskForm.mitigation}
                onChange={(e) =>
                  setRiskForm((prev) => ({
                    ...prev,
                    mitigation: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            {/* Responsible */}
            <div className="grid gap-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Input
                id="responsible"
                placeholder="Nome ou cargo do responsável"
                value={riskForm.responsible}
                onChange={(e) =>
                  setRiskForm((prev) => ({
                    ...prev,
                    responsible: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRisk}
              disabled={
                !riskForm.category ||
                !riskForm.description ||
                !riskForm.probability ||
                !riskForm.impact
              }
            >
              {editingRisk ? 'Salvar Alterações' : 'Adicionar Risco'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Global Score Card Component */
function GlobalScoreCard({
  score,
  level,
  distribution,
}: {
  score: number;
  level: RiskLevel;
  distribution: RiskMatrixType['distribution'];
}) {
  const colors = RiskLevelColors[level];

  return (
    <Card className={cn('border-l-4', colors.border)}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full',
              colors.bg,
            )}
          >
            <span className={cn('text-2xl font-bold', colors.text)}>
              {score}
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Score Global de Risco
            </p>
            <RiskLevelBadge level={level} size="lg" />
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <p className="font-semibold text-green-600">{distribution.low}</p>
            <p className="text-muted-foreground">Baixo</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-yellow-600">
              {distribution.medium}
            </p>
            <p className="text-muted-foreground">Médio</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-orange-600">{distribution.high}</p>
            <p className="text-muted-foreground">Alto</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-red-600">
              {distribution.critical}
            </p>
            <p className="text-muted-foreground">Crítico</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Risk Item Card Component */
function RiskItemCard({
  risk,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  readOnly,
}: {
  risk: RiskItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  readOnly: boolean;
}) {
  const colors = RiskLevelColors[risk.level];

  return (
    <div className={cn('rounded-lg border p-4', colors.bg)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">{RiskCategoryLabels[risk.category]}</Badge>
            <RiskLevelBadge level={risk.level} />
          </div>
          <p className="text-sm">{risk.description}</p>
        </div>

        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          <Button variant="ghost" size="icon" onClick={onToggleExpand}>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Probabilidade:</span>{' '}
              <span className="font-medium">
                {ProbabilityLabels[risk.probability]}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Impacto:</span>{' '}
              <span className="font-medium">{ImpactLabels[risk.impact]}</span>
            </div>
          </div>

          {risk.mitigation && (
            <div>
              <p className="text-sm text-muted-foreground">
                Estratégia de Mitigação:
              </p>
              <p className="text-sm whitespace-pre-wrap">{risk.mitigation}</p>
            </div>
          )}

          {risk.responsible && (
            <div>
              <p className="text-sm text-muted-foreground">Responsável:</p>
              <p className="text-sm">{risk.responsible}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Risk Level Badge Component */
function RiskLevelBadge({
  level,
  size = 'sm',
}: {
  level: RiskLevel;
  size?: 'sm' | 'lg';
}) {
  const colors = RiskLevelColors[level];

  return (
    <Badge
      className={cn(
        colors.bg,
        colors.text,
        'border-0',
        size === 'lg' && 'text-base px-3 py-1',
      )}
    >
      {RiskLevelLabels[level]}
    </Badge>
  );
}

/** Mitigation Suggestions Component */
function MitigationSuggestions({
  category,
  onSelect,
}: {
  category: RiskCategory;
  onSelect: (suggestion: string) => void;
}) {
  const suggestions = DefaultMitigationSuggestions[category];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm">
            <Info className="mr-1 h-4 w-4" />
            Sugestões
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-sm p-4">
          <p className="mb-2 font-semibold">Sugestões de Mitigação:</p>
          <ul className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index}>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-left"
                  onClick={() => onSelect(suggestion)}
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {suggestion}
                </Button>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Recalculate matrix with updated risks */
function recalculateMatrix(risks: RiskItem[]): RiskMatrixType {
  const distribution = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
    total: risks.length,
  };

  const weights: Record<RiskLevel, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  let totalWeight = 0;

  for (const risk of risks) {
    switch (risk.level) {
      case 'LOW':
        distribution.low++;
        break;
      case 'MEDIUM':
        distribution.medium++;
        break;
      case 'HIGH':
        distribution.high++;
        break;
      case 'CRITICAL':
        distribution.critical++;
        break;
    }
    totalWeight += weights[risk.level];
  }

  const maxPossible = risks.length * weights.CRITICAL;
  const globalScore =
    maxPossible > 0 ? Math.round((totalWeight / maxPossible) * 100) : 0;

  let globalLevel: RiskLevel;
  if (globalScore <= 25) globalLevel = 'LOW';
  else if (globalScore <= 50) globalLevel = 'MEDIUM';
  else if (globalScore <= 75) globalLevel = 'HIGH';
  else globalLevel = 'CRITICAL';

  return {
    risks: [...risks].sort((a, b) => a.order - b.order),
    globalScore,
    globalLevel,
    distribution,
    calculatedAt: new Date().toISOString(),
    version: 1,
  };
}

export default RiskMatrix;
