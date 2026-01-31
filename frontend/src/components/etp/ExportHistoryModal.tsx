import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Share2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { API_URL } from '@/lib/constants';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/lib/logger';
import type {
  ExportHistoryResponse,
  ShareLinkResponse,
} from '@/types/etp';

interface ExportHistoryModalProps {
  etpId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ExportHistoryModal - Display export history for an ETP
 * @see Issue #1708 - Create frontend UI for export history and sharing
 */
export function ExportHistoryModal({
  etpId,
  isOpen,
  onClose,
}: ExportHistoryModalProps) {
  const [history, setHistory] = useState<ExportHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (isOpen && etpId) {
      loadHistory();
    }
  }, [isOpen, etpId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get<ExportHistoryResponse>(
        `/export/history/${etpId}`,
      );
      setHistory(response.data);
    } catch (err) {
      logger.error('Failed to load export history', err);
      showError('Erro ao carregar histórico de exports');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (exportId: string) => {
    // Open in new tab - backend will redirect to S3 signed URL
    window.open(`${API_URL}/export/download/${exportId}`, '_blank');
  };

  const handleShare = async (exportId: string) => {
    try {
      const response = await api.get<ShareLinkResponse>(
        `/export/share/${exportId}`,
        {
          params: { expiresIn: 86400 }, // 24 hours
        },
      );

      // Copy to clipboard
      await navigator.clipboard.writeText(response.data.url);
      setCopiedId(exportId);
      success('Link copiado para a área de transferência!');

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      logger.error('Failed to generate share link', err);
      showError('Erro ao gerar link de compartilhamento');
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

  const getFormatBadge = (format: string) => {
    const colors = {
      pdf: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      docx: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      json: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    return (
      <Badge
        variant="secondary"
        className={colors[format as keyof typeof colors] || ''}
      >
        {format.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Exports</DialogTitle>
          <DialogDescription>
            Visualize e compartilhe versões anteriores dos seus exports
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : history && history.exports.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Data</th>
                    <th className="p-3 text-left text-sm font-medium">
                      Formato
                    </th>
                    <th className="p-3 text-left text-sm font-medium">
                      Versão
                    </th>
                    <th className="p-3 text-left text-sm font-medium">
                      Criado por
                    </th>
                    <th className="p-3 text-left text-sm font-medium">
                      Downloads
                    </th>
                    <th className="p-3 text-right text-sm font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.exports.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 text-sm">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="p-3">{getFormatBadge(item.format)}</td>
                      <td className="p-3 text-sm">v{item.version}</td>
                      <td className="p-3 text-sm">{item.user.name}</td>
                      <td className="p-3 text-sm">{item.downloadCount}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(item.id)}
                            title="Baixar export"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Baixar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShare(item.id)}
                            title="Compartilhar export"
                          >
                            {copiedId === item.id ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Share2 className="h-4 w-4 mr-1" />
                                Compartilhar
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination info */}
            {history.totalPages > 1 && (
              <div className="text-sm text-muted-foreground text-center">
                Página {history.page} de {history.totalPages} ({history.total}{' '}
                {history.total === 1 ? 'export' : 'exports'})
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum export encontrado para este ETP.</p>
            <p className="text-sm mt-2">
              Exporte o ETP em PDF ou DOCX para criar um histórico.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
