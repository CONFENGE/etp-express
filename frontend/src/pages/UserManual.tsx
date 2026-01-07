import { Link } from 'react-router';
import {
  ArrowLeft,
  BookOpen,
  Mail,
  Calendar,
  CheckCircle,
  FileText,
  Sparkles,
  Download,
  Upload,
  Users,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';

// Simple separator component since it's not in ui folder
function Separator({ className = '' }: { className?: string }) {
  return <hr className={`border-t border-border my-4 ${className}`} />;
}

export function UserManual() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl">Manual do Usuário</CardTitle>
            <p className="text-muted-foreground">{APP_NAME}</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Versão 1.0
              </span>
              <span>|</span>
              <span>Atualizado: Janeiro 2026</span>
            </div>
          </CardHeader>
        </Card>

        {/* Content */}
        <div className="space-y-8">
          {/* 1. Introdução */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                1. Introdução
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">O que é o ETP Express?</h4>
                <p className="text-muted-foreground leading-relaxed">
                  O <strong>ETP Express</strong> é uma plataforma digital
                  desenvolvida para auxiliar órgãos públicos na elaboração de{' '}
                  <strong>Estudos Técnicos Preliminares (ETP)</strong> em
                  conformidade com a <strong>Lei 14.133/2021</strong> (Nova Lei
                  de Licitações e Contratos Administrativos).
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">
                  Principais Funcionalidades
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                    <span>
                      <strong>Criação Assistida por IA:</strong> Geração
                      automática de conteúdo para cada seção do ETP
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                    <span>
                      <strong>Conformidade Legal:</strong> Estrutura baseada na
                      Lei 14.133/2021
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                    <span>
                      <strong>Exportação Profissional:</strong> Documentos em
                      PDF e DOCX prontos para uso
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                    <span>
                      <strong>Análise de Documentos:</strong> Importação e
                      avaliação de ETPs existentes
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                    <span>
                      <strong>Gestão Multi-usuário:</strong> Controle de acesso
                      por organização
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                    <span>
                      <strong>Pesquisa Governamental:</strong> Integração com
                      PNCP, Compras.gov.br, SINAPI e SICRO
                    </span>
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Requisitos do Sistema</h4>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>
                    Navegador atualizado (Chrome, Firefox, Edge ou Safari)
                  </li>
                  <li>Conexão com internet</li>
                  <li>Email institucional do órgão autorizado</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 2. Primeiros Passos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                2. Primeiros Passos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">2.1 Criando sua Conta</h4>
                <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Acesse{' '}
                    <strong className="text-primary">
                      https://confenge.com.br/etpexpress
                    </strong>
                  </li>
                  <li>
                    Clique em <strong>"Cadastre-se"</strong>
                  </li>
                  <li>
                    Preencha os campos obrigatórios:
                    <ul className="list-disc pl-5 mt-1">
                      <li>Nome completo</li>
                      <li>Email institucional (ex: nome@orgao.gov.br)</li>
                      <li>Senha (mínimo 6 caracteres)</li>
                    </ul>
                  </li>
                  <li>Aceite os termos de uso e política de privacidade</li>
                  <li>
                    Clique em <strong>"Cadastrar"</strong>
                  </li>
                </ol>
                <div className="bg-muted p-3 rounded-lg mt-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Importante:</strong> Apenas emails de domínios
                    autorizados podem se cadastrar. Se seu órgão ainda não está
                    cadastrado, entre em contato com o suporte.
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">2.2 Fazendo Login</h4>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>Digite seu email institucional</li>
                  <li>Digite sua senha</li>
                  <li>
                    Clique em <strong>"Entrar"</strong>
                  </li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">2.3 Recuperação de Senha</h4>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>
                    Na tela de login, clique em{' '}
                    <strong>"Esqueceu sua senha?"</strong>
                  </li>
                  <li>Digite seu email institucional</li>
                  <li>
                    Clique em <strong>"Enviar link de recuperação"</strong>
                  </li>
                  <li>Acesse seu email e clique no link recebido</li>
                  <li>Defina uma nova senha</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* 3. Criando um ETP */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                3. Criando um Novo ETP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">3.1 Informações Básicas</h4>
                <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                  <li>
                    No Dashboard, clique em <strong>"Novo ETP"</strong>
                  </li>
                  <li>
                    Preencha as informações iniciais:
                    <ul className="list-disc pl-5 mt-1">
                      <li>
                        <strong>Título:</strong> Nome descritivo do ETP (ex:
                        "Aquisição de Equipamentos de Informática")
                      </li>
                      <li>
                        <strong>Descrição:</strong> Breve resumo do objeto
                        (opcional)
                      </li>
                    </ul>
                  </li>
                  <li>
                    O sistema criará automaticamente o ETP com todas as 13
                    seções
                  </li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">3.2 Seções do ETP</h4>
                <p className="text-muted-foreground mb-3">
                  O ETP Express segue a estrutura definida pela Lei 14.133/2021:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Seção</th>
                        <th className="px-3 py-2 text-left">Título</th>
                        <th className="px-3 py-2 text-left">Obrigatória</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-3 py-2">I</td>
                        <td className="px-3 py-2">
                          Necessidade da Contratação
                        </td>
                        <td className="px-3 py-2">Sim</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">II</td>
                        <td className="px-3 py-2">Objetivos da Contratação</td>
                        <td className="px-3 py-2">Não</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">III</td>
                        <td className="px-3 py-2">Descrição da Solução</td>
                        <td className="px-3 py-2">Não</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">IV</td>
                        <td className="px-3 py-2">Requisitos da Contratação</td>
                        <td className="px-3 py-2">Sim</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">V</td>
                        <td className="px-3 py-2">Levantamento de Mercado</td>
                        <td className="px-3 py-2">Não</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">VI</td>
                        <td className="px-3 py-2">Estimativa de Preços</td>
                        <td className="px-3 py-2">Sim</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">VII</td>
                        <td className="px-3 py-2">
                          Justificativa para Parcelamento
                        </td>
                        <td className="px-3 py-2">Não</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">VIII</td>
                        <td className="px-3 py-2">Adequação Orçamentária</td>
                        <td className="px-3 py-2">Sim</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">IX</td>
                        <td className="px-3 py-2">Resultados Pretendidos</td>
                        <td className="px-3 py-2">Não</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">X</td>
                        <td className="px-3 py-2">
                          Providências a serem Adotadas
                        </td>
                        <td className="px-3 py-2">Não</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">XI</td>
                        <td className="px-3 py-2">
                          Possíveis Impactos Ambientais
                        </td>
                        <td className="px-3 py-2">Não</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">XII</td>
                        <td className="px-3 py-2">Declaração de Viabilidade</td>
                        <td className="px-3 py-2">Não</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">XIII</td>
                        <td className="px-3 py-2">Contratações Correlatas</td>
                        <td className="px-3 py-2">Sim</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Geração com IA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                4. Geração de Conteúdo com IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">4.1 Como Funciona</h4>
                <p className="text-muted-foreground mb-3">
                  O ETP Express utiliza <strong>Inteligência Artificial</strong>{' '}
                  para auxiliar na redação das seções do ETP:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                    <span>
                      Pesquisa informações em fontes governamentais oficiais
                      (PNCP, Compras.gov.br, SINAPI, SICRO)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                    <span>
                      Gera textos em conformidade com a Lei 14.133/2021
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                    <span>
                      O conteúdo é uma sugestão que deve ser revisada e adaptada
                    </span>
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">4.2 Gerando uma Seção</h4>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>Navegue até a seção desejada</li>
                  <li>
                    Clique no botão <strong>"Gerar com IA"</strong>
                  </li>
                  <li>
                    Aguarde o processamento (indicador de progresso será
                    exibido)
                  </li>
                  <li>Revise o conteúdo gerado</li>
                  <li>Edite conforme necessário</li>
                  <li>
                    Clique em <strong>"Salvar"</strong>
                  </li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">
                  4.3 Dicas para Melhores Resultados
                </h4>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>Preencha o título do ETP de forma descritiva</li>
                  <li>
                    Complete as seções anteriores antes de gerar as seguintes
                  </li>
                  <li>Forneça contexto na descrição do ETP</li>
                  <li>Revise sempre o conteúdo gerado</li>
                  <li>Adapte à realidade do seu órgão</li>
                </ul>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-3">
                  <p className="text-sm text-amber-800">
                    <strong>Aviso Legal:</strong> O conteúdo gerado por IA é uma
                    sugestão. A responsabilidade final pelo documento é do
                    servidor responsável pela elaboração do ETP.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Exportação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Download className="h-5 w-5" />
                5. Exportação de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Após concluir seu ETP, você pode exportá-lo em dois formatos:
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Exportar para PDF</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Cabeçalho com identificação</li>
                    <li>Todas as seções preenchidas</li>
                    <li>Formatação profissional</li>
                    <li>Numeração de páginas</li>
                  </ul>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Exportar para DOCX</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Edição no Microsoft Word</li>
                    <li>Ajustes de formatação</li>
                    <li>Adição de assinaturas</li>
                    <li>Impressão personalizada</li>
                  </ul>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Dica:</strong> Use o formato DOCX se precisar fazer
                  ajustes finais antes da publicação oficial.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 6. Import & Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Upload className="h-5 w-5" />
                6. Import & Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                O módulo de Import & Analysis permite importar e analisar ETPs
                existentes.
              </p>

              <div>
                <h4 className="font-semibold mb-3">Importando Documentos</h4>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>
                    No menu lateral, clique em{' '}
                    <strong>"Import & Analysis"</strong>
                  </li>
                  <li>Arraste um arquivo ou clique para selecionar</li>
                  <li>
                    Formatos aceitos: <strong>PDF</strong> ou{' '}
                    <strong>DOCX</strong>
                  </li>
                  <li>
                    Clique em <strong>"Analisar Documento"</strong>
                  </li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Análise de Qualidade</h4>
                <p className="text-muted-foreground mb-3">
                  O sistema avalia o documento em três dimensões:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Dimensão</th>
                        <th className="px-3 py-2 text-left">O que avalia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-3 py-2 font-semibold">
                          Conformidade Legal
                        </td>
                        <td className="px-3 py-2">
                          Aderência à Lei 14.133/2021
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold">
                          Clareza e Legibilidade
                        </td>
                        <td className="px-3 py-2">Qualidade da redação</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold">
                          Qualidade da Fundamentação
                        </td>
                        <td className="px-3 py-2">Embasamento técnico</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 7. Gestão de Usuários */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5" />
                7. Gestão de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Esta funcionalidade está disponível
                  apenas para usuários com perfil de Gestor de Domínio.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Criando Usuários</h4>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>
                    Acesse <strong>"Gerenciamento" &gt; "Usuários"</strong>
                  </li>
                  <li>
                    Clique em <strong>"Novo Usuário"</strong>
                  </li>
                  <li>
                    Preencha os dados (nome, email do mesmo domínio, cargo)
                  </li>
                  <li>
                    Clique em <strong>"Criar"</strong>
                  </li>
                  <li>O usuário receberá um email com instruções de acesso</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* 8. FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                8. Perguntas Frequentes (FAQ)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Acesso e Conta</h4>
                <div className="space-y-3 text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">
                      P: Não consigo me cadastrar. O que fazer?
                    </p>
                    <p className="text-sm">
                      R: Verifique se está usando seu email institucional.
                      Apenas domínios autorizados podem se cadastrar.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      P: Posso usar meu email pessoal?
                    </p>
                    <p className="text-sm">
                      R: Não. O ETP Express exige email institucional do órgão
                      público autorizado.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Criação de ETPs</h4>
                <div className="space-y-3 text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">
                      P: Preciso preencher todas as seções?
                    </p>
                    <p className="text-sm">
                      R: Não. Apenas as seções obrigatórias (I, IV, VI, VIII e
                      XIII) são necessárias.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      P: O sistema salva automaticamente?
                    </p>
                    <p className="text-sm">
                      R: Não. Você deve clicar em "Salvar" após editar cada
                      seção.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Geração com IA</h4>
                <div className="space-y-3 text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">
                      P: A IA substitui o trabalho do servidor?
                    </p>
                    <p className="text-sm">
                      R: Não. A IA é uma ferramenta de auxílio que gera
                      sugestões. O servidor é responsável por revisar e validar
                      todo o conteúdo.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      P: De onde vêm as informações geradas?
                    </p>
                    <p className="text-sm">
                      R: A IA consulta fontes governamentais oficiais como PNCP,
                      Compras.gov.br, SINAPI e SICRO.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 9. Suporte */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Mail className="h-5 w-5" />
                9. Suporte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Canais de Atendimento</h4>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <strong>Email:</strong> suporte@confenge.com.br
                </p>
                <p className="text-muted-foreground mt-2">
                  <strong>Horário:</strong> Segunda a Sexta, das 8h às 18h
                  (horário de Brasília)
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">
                  Antes de Entrar em Contato
                </h4>
                <p className="text-muted-foreground mb-2">
                  Para agilizar o atendimento, tenha em mãos:
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  <li>Seu email de cadastro</li>
                  <li>Descrição detalhada do problema</li>
                  <li>Prints de tela (se aplicável)</li>
                  <li>Navegador e versão utilizados</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card className="bg-muted/50">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                <strong>{APP_NAME}</strong> - Simplificando a elaboração de
                Estudos Técnicos Preliminares
              </p>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                © 2026 CONFENGE. Todos os direitos reservados.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
