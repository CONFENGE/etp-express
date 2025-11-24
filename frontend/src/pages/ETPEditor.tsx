import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, Download, Eye } from 'lucide-react';
import { useETPs } from '@/hooks/useETPs';
import { useToast } from '@/hooks/useToast';
import { LoadingState } from '@/components/common/LoadingState';
import { SECTION_TEMPLATES, REQUIRED_SECTIONS } from '@/types/etp';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function ETPEditor() {
  const { id } = useParams<{ id: string }>();
  const { currentETP, fetchETP, updateETP, isLoading } = useETPs();
  const { success, error } = useToast();
  const [activeSection, setActiveSection] = useState(1);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (id) {
      fetchETP(id);
    }
  }, [id, fetchETP]);

  useEffect(() => {
    if (currentETP) {
      const section = currentETP.sections.find(
        (s) => s.sectionNumber === activeSection,
      );
      setContent(section?.content || '');
    }
  }, [currentETP, activeSection]);

  const handleSave = async () => {
    if (!currentETP || !id) return;

    try {
      await updateETP(id, {
        sections: currentETP.sections.map((s) =>
          s.sectionNumber === activeSection ? { ...s, content } : s,
        ),
      });
      success('Seção salva com sucesso!');
    } catch {
      error('Erro ao salvar seção');
    }
  };

  if (isLoading || !currentETP) {
    return (
      <MainLayout>
        <LoadingState message="Carregando ETP..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{currentETP.title}</h1>
            <p className="text-muted-foreground">{currentETP.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso Geral</span>
              <span className="text-sm text-muted-foreground">
                {currentETP.progress}%
              </span>
            </div>
            <Progress value={currentETP.progress} />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Seções do ETP</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={String(activeSection)}
                onValueChange={(v) => setActiveSection(Number(v))}
              >
                <TabsList className="grid grid-cols-7 lg:grid-cols-13 h-auto">
                  {SECTION_TEMPLATES.map((template) => (
                    <TabsTrigger
                      key={template.number}
                      value={String(template.number)}
                      className="text-xs px-2 relative"
                    >
                      {template.number}
                      {REQUIRED_SECTIONS.includes(template.number) && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {SECTION_TEMPLATES.map((template) => (
                  <TabsContent
                    key={template.number}
                    value={String(template.number)}
                    className="space-y-4 mt-6"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {template.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                          {template.isRequired && (
                            <Badge variant="destructive" className="mt-2">
                              Obrigatória
                            </Badge>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          <Sparkles className="mr-2 h-4 w-4" />
                          Gerar com IA
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label>Conteúdo</Label>
                          <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={`Digite o conteúdo da seção ${template.title}...`}
                            className="min-h-[300px] mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sugestões da IA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Clique em "Gerar com IA" para obter sugestões automatizadas
                  baseadas em contratações similares.
                </p>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    Revise criticamente antes de aceitar sugestões da IA
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Contratações Similares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Nenhuma contratação similar encontrada ainda.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
