import { useState, useEffect } from 'react';
import { useTrVersions } from '@/hooks/useTrVersions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  History,
  RotateCcw,
  GitCompare,
  Clock,
  User,
} from 'lucide-react';
import type { TrVersion, TrVersionComparisonResult } from '@/types/tr-version';

interface TRVersionHistoryProps {
  termoReferenciaId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: () => void;
}

/**
 * Component for displaying TR version history with compare and restore capabilities.
 *
 * @see #1253 - [TR-f] Versionamento e historico de TR
 */
export function TRVersionHistory({
  termoReferenciaId,
  isOpen,
  onClose,
  onRestore,
}: TRVersionHistoryProps) {
  const {
    versions,
    isLoading,
    error,
    fetchVersions,
    restoreVersion,
    compareVersions,
  } = useTrVersions();

  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [comparison, setComparison] = useState<TrVersionComparisonResult | null>(
    null,
  );
  const [isComparing, setIsComparing] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState<TrVersion | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (isOpen && termoReferenciaId) {
      fetchVersions(termoReferenciaId);
    }
  }, [isOpen, termoReferenciaId, fetchVersions]);

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
    setComparison(null);
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;
    setIsComparing(true);
    try {
      const result = await compareVersions(
        termoReferenciaId,
        selectedVersions[0],
        selectedVersions[1],
      );
      setComparison(result);
    } finally {
      setIsComparing(false);
    }
  };

  const handleRestore = async (version: TrVersion) => {
    setIsRestoring(true);
    try {
      await restoreVersion(termoReferenciaId, version.id);
      setRestoreConfirm(null);
      onRestore?.();
      onClose();
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDifferences = () => {
    if (!comparison) return null;

    const diffEntries = Object.entries(comparison.differences);

    if (diffEntries.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          Nenhuma diferenca encontrada entre as versoes selecionadas.
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-4">
        <h4 className="font-medium">
          Comparacao: Versao {comparison.version1.versionNumber} vs Versao{' '}
          {comparison.version2.versionNumber}
        </h4>
        <div className="max-h-60 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Campo</TableHead>
                <TableHead>Versao {comparison.version1.versionNumber}</TableHead>
                <TableHead>Versao {comparison.version2.versionNumber}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diffEntries.map(([field, diff]) => (
                <TableRow key={field}>
                  <TableCell className="font-medium capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-red-600">
                    {diff.old != null ? String(diff.old) : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-green-600">
                    {diff.new != null ? String(diff.new) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historico de Versoes
            </DialogTitle>
            <DialogDescription>
              Visualize, compare e restaure versoes anteriores do Termo de
              Referencia.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <EmptyState
              type="documents"
              title="Nenhuma versão encontrada"
              description="As versões são criadas automaticamente ao salvar o Termo de Referência."
              size="sm"
            />
          ) : (
            <>
              <div className="max-h-[300px] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-24">Versao</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="w-32">Autor</TableHead>
                      <TableHead className="w-40">Data</TableHead>
                      <TableHead className="w-24">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((version, index) => (
                      <TableRow
                        key={version.id}
                        className={
                          selectedVersions.includes(version.id)
                            ? 'bg-primary/10'
                            : ''
                        }
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedVersions.includes(version.id)}
                            onChange={() => handleVersionSelect(version.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={index === 0 ? 'default' : 'secondary'}
                          >
                            v{version.versionNumber}
                          </Badge>
                          {index === 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (atual)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {version.changeLog || 'Sem descricao'}
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {version.createdByName || 'Sistema'}
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(version.createdAt)}
                        </TableCell>
                        <TableCell>
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRestoreConfirm(version)}
                              title="Restaurar esta versao"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCompare}
                  disabled={selectedVersions.length !== 2 || isComparing}
                >
                  <GitCompare className="mr-2 h-4 w-4" />
                  {isComparing ? 'Comparando...' : 'Comparar Selecionadas'}
                </Button>
                {selectedVersions.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedVersions.length} de 2 versoes selecionadas
                  </span>
                )}
              </div>

              {renderDifferences()}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!restoreConfirm}
        onOpenChange={() => setRestoreConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao ira restaurar o TR para a versao{' '}
              {restoreConfirm?.versionNumber}. A versao atual sera
              automaticamente salva como backup antes da restauracao.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreConfirm && handleRestore(restoreConfirm)}
              disabled={isRestoring}
            >
              {isRestoring ? 'Restaurando...' : 'Restaurar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default TRVersionHistory;
