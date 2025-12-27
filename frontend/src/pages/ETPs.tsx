import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router';
import {
  PlusCircle,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  X,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { CREATE_ETP_MODAL_ID } from '@/lib/constants';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useETPs } from '@/hooks/useETPs';
import { SkeletonETPGrid } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { ETP_STATUS_LABELS, ETP_STATUS_COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { useUndoToast } from '@/hooks/useUndoToast';
import { UndoToastContainer } from '@/components/ui/undo-toast';
import { ETP } from '@/types/etp';

export function ETPs() {
  const { openModal } = useUIStore();
  const { etps, isLoading, fetchETPs, deleteETP } = useETPs();
  const [search, setSearch] = useState('');
  // Store hidden ETP IDs for optimistic UI updates
  const [hiddenEtpIds, setHiddenEtpIds] = useState<Set<string>>(new Set());
  // Undo toast hook
  const { showUndoToast, handleUndo, dismiss, activeToasts, isProcessing } =
    useUndoToast();

  /**
   * Handle ETP deletion with undo capability.
   * Implements optimistic UI: hides ETP immediately, actual delete happens after timeout.
   */
  const handleDelete = useCallback(
    (etp: ETP) => {
      // Optimistic: hide ETP from list immediately
      setHiddenEtpIds((prev) => new Set(prev).add(etp.id));

      showUndoToast({
        message: `"${etp.title}" excluído`,
        undoAction: () => {
          // Restore ETP in the list
          setHiddenEtpIds((prev) => {
            const next = new Set(prev);
            next.delete(etp.id);
            return next;
          });
        },
        onConfirm: async () => {
          // Actually delete the ETP
          await deleteETP(etp.id);
          // Clean up hidden state
          setHiddenEtpIds((prev) => {
            const next = new Set(prev);
            next.delete(etp.id);
            return next;
          });
        },
        duration: 5000,
      });
    },
    [showUndoToast, deleteETP],
  );

  useEffect(() => {
    fetchETPs();
  }, [fetchETPs]);

  const filteredETPs = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return etps.filter(
      (etp) =>
        // Filter out hidden ETPs (optimistic delete)
        !hiddenEtpIds.has(etp.id) &&
        (etp.title.toLowerCase().includes(lowerSearch) ||
          etp.description?.toLowerCase().includes(lowerSearch)),
    );
  }, [etps, search, hiddenEtpIds]);

  const handleClearSearch = () => {
    setSearch('');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meus ETPs</h1>
            <p className="text-muted-foreground">
              Gerencie seus Estudos Técnicos Preliminares
            </p>
          </div>
          <Button onClick={() => openModal(CREATE_ETP_MODAL_ID)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo ETP
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ETPs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonETPGrid count={6} />
        ) : filteredETPs.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                type={search ? 'search' : 'documents'}
                title={
                  search
                    ? 'Nenhum resultado encontrado'
                    : 'Nenhum ETP encontrado'
                }
                description={
                  search
                    ? `Nenhum ETP corresponde a "${search}". Verifique o termo ou crie um novo estudo.`
                    : 'Comece criando seu primeiro Estudo Técnico Preliminar'
                }
                action={{
                  label: search ? 'Limpar busca' : 'Criar ETP',
                  onClick: search
                    ? handleClearSearch
                    : () => openModal(CREATE_ETP_MODAL_ID),
                  icon: search ? X : PlusCircle,
                  variant: search ? 'outline' : 'default',
                }}
                size="md"
              />
              {search && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="default"
                    onClick={() => openModal(CREATE_ETP_MODAL_ID)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar novo ETP
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredETPs.map((etp) => (
              <Card key={etp.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex-1 pr-2">
                      {etp.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={ETP_STATUS_COLORS[etp.status]}>
                        {ETP_STATUS_LABELS[etp.status]}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Opções do ETP"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/etps/${etp.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(etp)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {etp.description && (
                    <CardDescription className="line-clamp-2">
                      {etp.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Progresso
                        </span>
                        <span className="text-sm font-medium">
                          {etp.progress}%
                        </span>
                      </div>
                      <Progress value={etp.progress} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Atualizado em {formatDate(etp.updatedAt)}
                      </span>
                    </div>
                    <Button asChild className="w-full" variant="outline">
                      <Link to={`/etps/${etp.id}`}>Abrir ETP</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Undo Toast Container */}
      <UndoToastContainer
        toasts={activeToasts}
        onUndo={handleUndo}
        onDismiss={dismiss}
        isProcessing={isProcessing}
      />
    </MainLayout>
  );
}
