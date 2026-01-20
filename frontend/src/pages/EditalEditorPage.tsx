import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { AutoSaveIndicator } from '@/components/etp/AutoSaveIndicator';
import { useEditalStore } from '@/store/editalStore';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useToast } from '@/hooks/useToast';
import { SkeletonEditor } from '@/components/common/LoadingState';
import { logger } from '@/lib/logger';
import { ArrowLeft, Save } from 'lucide-react';

/**
 * Página de edição de Edital.
 *
 * Permite editar campos principais de um edital gerado:
 * - Identificação (número, objeto)
 * - Descrição detalhada do objeto (rich text)
 * - Condições de participação (rich text)
 *
 * Features:
 * - Auto-save a cada 3 segundos de inatividade
 * - Indicador visual de status de salvamento
 * - Breadcrumb navigation
 * - Loading state com skeleton
 *
 * Issue #1280 - [Edital-d] Editor de edital no frontend
 * Milestone: M14 - Geração de Edital
 */
export function EditalEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentEdital, fetchEdital, updateEdital, isLoading } = useEditalStore();
  const { success, error } = useToast();

  // Form state
  const [numero, setNumero] = useState('');
  const [objeto, setObjeto] = useState('');
  const [descricaoObjeto, setDescricaoObjeto] = useState('');
  const [condicoesParticipacao, setCondicoesParticipacao] = useState('');

  // Track last saved state
  const [lastSavedState, setLastSavedState] = useState({
    numero: '',
    objeto: '',
    descricaoObjeto: '',
    condicoesParticipacao: '',
  });

  // Check if form is dirty
  const isDirty =
    numero !== lastSavedState.numero ||
    objeto !== lastSavedState.objeto ||
    descricaoObjeto !== lastSavedState.descricaoObjeto ||
    condicoesParticipacao !== lastSavedState.condicoesParticipacao;

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!id || !isDirty) return;

    logger.info('[EditalEditor] Auto-saving edital', { id });

    await updateEdital(id, {
      numero,
      objeto,
      descricaoObjeto: descricaoObjeto || null,
      condicoesParticipacao: condicoesParticipacao || null,
    });

    setLastSavedState({ numero, objeto, descricaoObjeto, condicoesParticipacao });
  }, [id, numero, objeto, descricaoObjeto, condicoesParticipacao, isDirty, updateEdital]);

  // Auto-save hook
  const autoSave = useAutoSave(descricaoObjeto, {
    delay: 3000, // 3 segundos de debounce
    enabled: isDirty && Boolean(id),
    onSave: performAutoSave,
    onSuccess: () => {
      logger.info('[EditalEditor] Auto-save success');
    },
    onError: (err) => {
      error('Erro ao salvar automaticamente');
      logger.error('[EditalEditor] Auto-save failed', { error: err });
    },
  });

  // Fetch edital on mount
  useEffect(() => {
    if (!id) {
      error('ID do edital não informado');
      navigate('/dashboard');
      return;
    }

    fetchEdital(id).catch((err) => {
      error('Erro ao carregar edital');
      logger.error('[EditalEditor] Failed to fetch edital', { id, error: err });
    });
  }, [id, fetchEdital, error, navigate]);

  // Update form state when edital loads
  useEffect(() => {
    if (currentEdital) {
      setNumero(currentEdital.numero || '');
      setObjeto(currentEdital.objeto || '');
      setDescricaoObjeto(currentEdital.descricaoObjeto || '');
      setCondicoesParticipacao(currentEdital.condicoesParticipacao || '');

      setLastSavedState({
        numero: currentEdital.numero || '',
        objeto: currentEdital.objeto || '',
        descricaoObjeto: currentEdital.descricaoObjeto || '',
        condicoesParticipacao: currentEdital.condicoesParticipacao || '',
      });
    }
  }, [currentEdital]);

  // Manual save function
  const handleManualSave = async () => {
    if (!id) return;

    try {
      await performAutoSave();
      success('Edital salvo com sucesso');
    } catch (err) {
      error('Erro ao salvar edital');
      logger.error('[EditalEditor] Manual save failed', { error: err });
    }
  };

  // Loading state
  if (isLoading || !currentEdital) {
    return (
      <MainLayout>
        <SkeletonEditor />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header with Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Editais', href: '/editais' },
                { label: currentEdital.numero || 'Editar', href: `/editais/${id}/edit` },
              ]}
            />
            <h1 className="text-3xl font-bold">Editor de Edital</h1>
          </div>

          <div className="flex items-center gap-3">
            <AutoSaveIndicator
              status={autoSave.status}
              lastSavedAt={autoSave.lastSavedAt}
              isOnline={autoSave.isOnline}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/editais')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              size="sm"
              onClick={handleManualSave}
              disabled={!isDirty || autoSave.status === 'saving'}
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Editor Form */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação do Edital</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Número do Edital */}
            <div className="space-y-2">
              <Label htmlFor="numero">
                Número do Edital <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="001/2024-PREGAO"
                maxLength={50}
              />
              <p className="text-sm text-muted-foreground">
                Identificação única do edital no órgão
              </p>
            </div>

            {/* Objeto */}
            <div className="space-y-2">
              <Label htmlFor="objeto">
                Objeto da Licitação <span className="text-destructive">*</span>
              </Label>
              <Input
                id="objeto"
                value={objeto}
                onChange={(e) => setObjeto(e.target.value)}
                placeholder="Contratação de serviços de..."
                maxLength={500}
              />
              <p className="text-sm text-muted-foreground">
                Descrição resumida do que será contratado (Art. 25, I)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Descrição Detalhada */}
        <Card>
          <CardHeader>
            <CardTitle>Descrição Detalhada do Objeto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="descricaoObjeto">
                Descrição Completa
              </Label>
              <RichTextEditor
                id="descricaoObjeto"
                content={descricaoObjeto}
                onChange={setDescricaoObjeto}
                placeholder="Descreva detalhadamente o objeto da contratação..."
                minHeight="300px"
              />
              <p className="text-sm text-muted-foreground">
                Especificações técnicas detalhadas do objeto
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Condições de Participação */}
        <Card>
          <CardHeader>
            <CardTitle>Condições de Participação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="condicoesParticipacao">
                Requisitos para Participação
              </Label>
              <RichTextEditor
                id="condicoesParticipacao"
                content={condicoesParticipacao}
                onChange={setCondicoesParticipacao}
                placeholder="Defina as condições para participação na licitação..."
                minHeight="250px"
              />
              <p className="text-sm text-muted-foreground">
                Requisitos para participar da licitação (Art. 25, IV) - Ex: porte da empresa, regularidade fiscal
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
