import { useEffect, useState, useCallback } from 'react';
import { History, X, ChevronLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVersions } from '@/hooks/useVersions';
import { useToast } from '@/hooks/useToast';
import { VersionTimeline } from './VersionTimeline';
import { VersionDiff } from './VersionDiff';
import type { EtpVersion, VersionComparisonResult } from '@/types/version';
import { Skeleton } from '@/components/ui/skeleton';

interface VersionHistoryProps {
  etpId: string;
  currentVersion?: number;
  onVersionRestored?: () => void;
}

type ViewMode = 'timeline' | 'view' | 'compare';

export function VersionHistory({
  etpId,
  currentVersion,
  onVersionRestored,
}: VersionHistoryProps): React.ReactElement {
  const {
    versions,
    isLoading,
    error,
    fetchVersions,
    compareVersions,
    restoreVersion,
    clearError,
  } = useVersions();
  const { success, error: showError } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedVersion, setSelectedVersion] = useState<EtpVersion | null>(
    null,
  );
  const [compareVersion, setCompareVersion] = useState<string>('');
  const [comparison, setComparison] = useState<VersionComparisonResult | null>(
    null,
  );
  const [isComparing, setIsComparing] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<EtpVersion | null>(
    null,
  );
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch versions when dialog opens
  useEffect(() => {
    if (isOpen && etpId) {
      fetchVersions(etpId);
    }
  }, [isOpen, etpId, fetchVersions]);

  // Clear error when closing dialog
  useEffect(() => {
    if (!isOpen) {
      clearError();
      setViewMode('timeline');
      setSelectedVersion(null);
      setComparison(null);
      setCompareVersion('');
    }
  }, [isOpen, clearError]);

  const handleViewVersion = useCallback((version: EtpVersion) => {
    setSelectedVersion(version);
    setViewMode('view');
  }, []);

  const handleCompareVersion = useCallback((version: EtpVersion) => {
    setSelectedVersion(version);
    setViewMode('compare');
    setCompareVersion('');
    setComparison(null);
  }, []);

  const handleStartComparison = useCallback(async () => {
    if (!selectedVersion || !compareVersion) return;

    setIsComparing(true);
    try {
      const result = await compareVersions(selectedVersion.id, compareVersion);
      setComparison(result);
    } catch {
      showError('Erro ao comparar versoes');
    } finally {
      setIsComparing(false);
    }
  }, [selectedVersion, compareVersion, compareVersions, showError]);

  const handleRestoreClick = useCallback((version: EtpVersion) => {
    setVersionToRestore(version);
    setRestoreDialogOpen(true);
  }, []);

  const handleConfirmRestore = useCallback(async () => {
    if (!versionToRestore) return;

    setIsRestoring(true);
    try {
      await restoreVersion(versionToRestore.id);
      success(
        `Versao ${versionToRestore.versionNumber} restaurada com sucesso!`,
      );
      setRestoreDialogOpen(false);
      setIsOpen(false);
      onVersionRestored?.();
    } catch {
      showError('Erro ao restaurar versao');
    } finally {
      setIsRestoring(false);
    }
  }, [versionToRestore, restoreVersion, success, showError, onVersionRestored]);

  const handleBack = useCallback(() => {
    setViewMode('timeline');
    setSelectedVersion(null);
    setComparison(null);
    setCompareVersion('');
  }, []);

  const renderContent = (): React.ReactElement => {
    if (isLoading && versions.length === 0) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-3 w-3 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchVersions(etpId)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    switch (viewMode) {
      case 'view':
        return selectedVersion ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <span className="text-muted-foreground">
                Versao {selectedVersion.versionNumber}
              </span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedVersion.snapshot.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium">
                    {selectedVersion.snapshot.status}
                  </span>
                </div>
                {selectedVersion.snapshot.objeto && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Objeto:
                    </span>
                    <p className="mt-1">{selectedVersion.snapshot.objeto}</p>
                  </div>
                )}
                {selectedVersion.snapshot.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Descricao:
                    </span>
                    <p className="mt-1">
                      {selectedVersion.snapshot.description}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">
                    Secoes: {selectedVersion.snapshot.sections.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div />
        );

      case 'compare':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <span className="text-muted-foreground">
                Comparar v{selectedVersion?.versionNumber} com...
              </span>
            </div>

            {!comparison && (
              <div className="flex items-center gap-4">
                <Select
                  value={compareVersion}
                  onValueChange={setCompareVersion}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione uma versao" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions
                      .filter((v) => v.id !== selectedVersion?.id)
                      .map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          v{v.versionNumber} -{' '}
                          {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStartComparison}
                  disabled={!compareVersion || isComparing}
                >
                  {isComparing ? 'Comparando...' : 'Comparar'}
                </Button>
              </div>
            )}

            {comparison && (
              <VersionDiff comparison={comparison} isLoading={isComparing} />
            )}
          </div>
        );

      default:
        return (
          <VersionTimeline
            versions={versions}
            currentVersion={currentVersion}
            onViewVersion={handleViewVersion}
            onCompareVersion={handleCompareVersion}
            onRestoreVersion={handleRestoreClick}
            isLoading={isLoading}
            selectedVersionId={selectedVersion?.id}
          />
        );
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historico de Versoes
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
              Ver historico
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {versions.length > 0
              ? `${versions.length} versoes salvas`
              : 'Carregue para ver versoes'}
          </p>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historico de Versoes
            </DialogTitle>
            <DialogDescription>
              Visualize, compare e restaure versoes anteriores do ETP
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">{renderContent()}</div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versao?</AlertDialogTitle>
            <AlertDialogDescription>
              Voce esta prestes a restaurar a versao{' '}
              <strong>v{versionToRestore?.versionNumber}</strong>. Um backup da
              versao atual sera criado automaticamente antes da restauracao.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isRestoring ? 'Restaurando...' : 'Restaurar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
