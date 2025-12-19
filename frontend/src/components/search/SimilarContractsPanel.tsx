import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { REFERENCE_WARNING_MESSAGE } from '@/lib/constants';
import { SimilarContract } from '@/types/etp';
import { formatCurrency } from '@/lib/utils';

interface SimilarContractsPanelProps {
  contracts: SimilarContract[];
}

export function SimilarContractsPanel({
  contracts,
}: SimilarContractsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Contratações Similares</CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma contratação similar encontrada ainda.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                {REFERENCE_WARNING_MESSAGE}
              </p>
            </div>

            <div className="space-y-3">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="p-3 border rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium line-clamp-2">
                      {contract.title}
                    </h4>
                    <Badge variant="secondary" className="ml-2 flex-shrink-0">
                      {Math.round(contract.similarity * 100)}%
                    </Badge>
                  </div>

                  {contract.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {contract.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {contract.year && <span>Ano: {contract.year}</span>}
                    {contract.value && (
                      <span>{formatCurrency(contract.value)}</span>
                    )}
                    {contract.organ && (
                      <span className="truncate">{contract.organ}</span>
                    )}
                  </div>

                  <button className="flex items-center gap-1 text-xs text-primary underline mt-2">
                    <ExternalLink className="h-3 w-3" />
                    Ver detalhes
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
