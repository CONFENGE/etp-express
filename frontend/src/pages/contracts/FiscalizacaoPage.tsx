import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { useFiscalizacao } from '@/hooks/useFiscalizacao';
import { MedicaoForm } from '@/components/contracts/MedicaoForm';
import { OcorrenciaForm } from '@/components/contracts/OcorrenciaForm';
import { AtesteModal } from '@/components/contracts/AtesteModal';
import {
  MedicaoStatus,
  OcorrenciaStatus,
  type Medicao,
  type Ocorrencia,
  type CreateMedicaoDto,
  type CreateOcorrenciaDto,
  type CreateAtesteDto,
  MEDICAO_STATUS_COLOR,
  OCORRENCIA_GRAVIDADE_COLOR,
  OCORRENCIA_STATUS_COLOR,
} from '@/types/contract';

export function FiscalizacaoPage() {
  const { id: contratoId } = useParams<{ id: string }>();
  const { success, error: showError } = useToast();

  const {
    loading,
    fetchMedicoes,
    createMedicao,
    fetchOcorrencias,
    createOcorrencia,
    createAteste,
  } = useFiscalizacao(contratoId || '');

  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [activeTab, setActiveTab] = useState('medicoes');
  const [showMedicaoForm, setShowMedicaoForm] = useState(false);
  const [showOcorrenciaForm, setShowOcorrenciaForm] = useState(false);
  const [atesteModalOpen, setAtesteModalOpen] = useState(false);
  const [selectedMedicao, setSelectedMedicao] = useState<Medicao | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [medicoesData, ocorrenciasData] = await Promise.all([
        fetchMedicoes(),
        fetchOcorrencias(),
      ]);
      setMedicoes(medicoesData);
      setOcorrencias(ocorrenciasData);
    } catch {
      showError('Erro ao carregar dados de fiscalização');
    }
  }, [fetchMedicoes, fetchOcorrencias, showError]);

  useEffect(() => {
    if (!contratoId) return;
    loadData();
  }, [contratoId, loadData]);

  const handleCreateMedicao = async (data: CreateMedicaoDto) => {
    try {
      await createMedicao(data);
      success('Medição criada com sucesso');
      setShowMedicaoForm(false);
      await loadData();
    } catch (err) {
      showError('Erro ao criar medição');
      throw err;
    }
  };

  const handleCreateOcorrencia = async (data: CreateOcorrenciaDto) => {
    try {
      await createOcorrencia(data);
      success('Ocorrência registrada com sucesso');
      setShowOcorrenciaForm(false);
      await loadData();
    } catch (err) {
      showError('Erro ao registrar ocorrência');
      throw err;
    }
  };

  const handleOpenAtesteModal = (medicao: Medicao) => {
    setSelectedMedicao(medicao);
    setAtesteModalOpen(true);
  };

  const handleCreateAteste = async (data: Omit<CreateAtesteDto, 'dataAteste'> & { dataAteste?: string }) => {
    if (!selectedMedicao) return;
    try {
      // Include dataAteste if not provided (default to current date)
      const atesteData: CreateAtesteDto = {
        ...data,
        dataAteste: data.dataAteste || new Date().toISOString(),
      };
      await createAteste(selectedMedicao.id, atesteData);
      success('Ateste realizado com sucesso');
      setAtesteModalOpen(false);
      setSelectedMedicao(null);
      await loadData();
    } catch {
      showError('Erro ao realizar ateste');
    }
  };

  const medicoesPendentes = medicoes.filter(
    (m) => m.status === MedicaoStatus.PENDENTE,
  );
  const ocorrenciasAbertas = ocorrencias.filter(
    (o) =>
      o.status === OcorrenciaStatus.ABERTA ||
      o.status === OcorrenciaStatus.EM_ANALISE,
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <Breadcrumb
          items={[
            { label: 'Contratos', href: '/contracts' },
            { label: 'Fiscalização', href: `/contracts/${contratoId}/fiscalizacao` },
          ]}
        />

        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Fiscalização de Contrato</h1>
            <div className="flex gap-2">
              {!showMedicaoForm && activeTab === 'medicoes' && (
                <Button onClick={() => setShowMedicaoForm(true)}>
                  Nova Medição
                </Button>
              )}
              {!showOcorrenciaForm && activeTab === 'ocorrencias' && (
                <Button onClick={() => setShowOcorrenciaForm(true)}>
                  Nova Ocorrência
                </Button>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="medicoes">
                Medições
                {medicoesPendentes.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {medicoesPendentes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ocorrencias">
                Ocorrências
                {ocorrenciasAbertas.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {ocorrenciasAbertas.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* Tab: Medições */}
            <TabsContent value="medicoes" className="mt-6 space-y-6">
              {showMedicaoForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Medição</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MedicaoForm
                      onSubmit={handleCreateMedicao}
                      onCancel={() => setShowMedicaoForm(false)}
                      isLoading={loading}
                    />
                  </CardContent>
                </Card>
              )}

              {medicoesPendentes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Medições Pendentes de Ateste</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {medicoesPendentes.map((medicao) => (
                        <div
                          key={medicao.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div>
                            <p className="font-medium">
                              Medição #{medicao.numero}
                            </p>
                            <p className="text-sm text-gray-600">
                              Período:{' '}
                              {new Date(
                                medicao.periodoInicio,
                              ).toLocaleDateString()}{' '}
                              a{' '}
                              {new Date(medicao.periodoFim).toLocaleDateString()}
                            </p>
                            <p className="text-sm font-semibold text-green-600">
                              R$ {medicao.valorMedido}
                            </p>
                            {medicao.descricao && (
                              <p className="text-sm text-gray-500 mt-1">
                                {medicao.descricao}
                              </p>
                            )}
                          </div>
                          <Button onClick={() => handleOpenAtesteModal(medicao)}>
                            Atestar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Todas as Medições</CardTitle>
                </CardHeader>
                <CardContent>
                  {medicoes.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma medição registrada
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {medicoes.map((medicao) => (
                        <div
                          key={medicao.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                Medição #{medicao.numero}
                              </p>
                              <Badge
                                className={MEDICAO_STATUS_COLOR[medicao.status]}
                              >
                                {medicao.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(
                                medicao.periodoInicio,
                              ).toLocaleDateString()}{' '}
                              -{' '}
                              {new Date(medicao.periodoFim).toLocaleDateString()}
                            </p>
                            <p className="text-sm font-semibold text-green-600">
                              R$ {medicao.valorMedido}
                            </p>
                          </div>
                          {medicao.dataAteste && (
                            <p className="text-xs text-gray-500">
                              Atestado em{' '}
                              {new Date(medicao.dataAteste).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Ocorrências */}
            <TabsContent value="ocorrencias" className="mt-6 space-y-6">
              {showOcorrenciaForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Ocorrência</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OcorrenciaForm
                      onSubmit={handleCreateOcorrencia}
                      onCancel={() => setShowOcorrenciaForm(false)}
                      isLoading={loading}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Ocorrências</CardTitle>
                </CardHeader>
                <CardContent>
                  {ocorrencias.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma ocorrência registrada
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ocorrencias.map((ocorrencia) => (
                        <div
                          key={ocorrencia.id}
                          className="rounded-lg border p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  className={
                                    OCORRENCIA_GRAVIDADE_COLOR[
                                      ocorrencia.gravidade
                                    ]
                                  }
                                >
                                  {ocorrencia.gravidade}
                                </Badge>
                                <Badge
                                  className={
                                    OCORRENCIA_STATUS_COLOR[ocorrencia.status]
                                  }
                                >
                                  {ocorrencia.status}
                                </Badge>
                                <p className="text-xs text-gray-500">
                                  {ocorrencia.tipo}
                                </p>
                              </div>
                              <p className="text-sm mb-1">
                                {ocorrencia.descricao}
                              </p>
                              {ocorrencia.acaoCorretiva && (
                                <p className="text-xs text-gray-600 mt-2">
                                  <strong>Ação Corretiva:</strong>{' '}
                                  {ocorrencia.acaoCorretiva}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-xs text-gray-500">
                              <p>
                                {new Date(
                                  ocorrencia.dataOcorrencia,
                                ).toLocaleDateString()}
                              </p>
                              {ocorrencia.prazoResolucao && (
                                <p className="text-red-500 font-semibold mt-1">
                                  Prazo:{' '}
                                  {new Date(
                                    ocorrencia.prazoResolucao,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Histórico */}
            <TabsContent value="historico" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico Completo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-500 py-8">
                    Histórico completo de fiscalização em desenvolvimento
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Ateste Modal */}
      <AtesteModal
        isOpen={atesteModalOpen}
        onClose={() => {
          setAtesteModalOpen(false);
          setSelectedMedicao(null);
        }}
        onSubmit={handleCreateAteste}
        medicao={selectedMedicao}
        isLoading={loading}
      />
    </MainLayout>
  );
}
