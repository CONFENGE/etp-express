import { Link } from 'react-router';
import {
  ArrowLeft,
  Shield,
  Mail,
  Calendar,
  ExternalLink,
  Lock,
  Globe,
  Clock,
  UserCheck,
  Database,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';

// Simple separator component since it's not in ui folder
function Separator({ className = '' }: { className?: string }) {
  return <hr className={`border-t border-border my-4 ${className}`} />;
}

// Responsive table wrapper that converts to definition list on mobile
function ResponsiveTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: { cells: React.ReactNode[]; highlight?: boolean }[];
}) {
  return (
    <>
      {/* Desktop table - hidden on mobile */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="px-4 py-3 text-left font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={row.highlight ? 'bg-muted/30' : ''}>
                {row.cells.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className={`px-4 py-3 ${cellIdx === 0 ? 'font-medium' : ''}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards - shown only on mobile */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`p-4 rounded-lg border ${row.highlight ? 'bg-muted/30' : 'bg-card'}`}
          >
            {row.cells.map((cell, cellIdx) => (
              <div key={cellIdx} className="mb-2 last:mb-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {headers[cellIdx]}
                </span>
                <div className="mt-1 text-sm">{cell}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Sticky header for navigation */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
        <div className="container mx-auto max-w-4xl px-4 py-3">
          <Button variant="ghost" asChild size="sm">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
        {/* Hero Header */}
        <Card className="mb-6 sm:mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
            <CardHeader className="text-center py-8 sm:py-12">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                Politica de Privacidade
              </CardTitle>
              <p className="text-muted-foreground mt-2">{APP_NAME}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Versao 2.0
                </span>
                <span className="hidden sm:inline">|</span>
                <span>Atualizada: 22/11/2025</span>
              </div>
            </CardHeader>
          </div>
        </Card>

        {/* Content */}
        <div className="space-y-6 sm:space-y-8">
          {/* 1. Identificacao do Controlador */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  1
                </span>
                Identificacao do Controlador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-semibold text-sm mb-1">
                    Controlador de Dados
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ETP Express - Sistema de Geracao de Estudos Tecnicos
                    Preliminares
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-semibold text-sm mb-1">
                    Contato para Protecao de Dados
                  </p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    privacidade@confenge.com.br
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Introducao */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  2
                </span>
                Introducao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                O ETP Express esta comprometido com a protecao da privacidade e
                dos dados pessoais de seus usuarios. Esta Politica de
                Privacidade descreve como coletamos, usamos, armazenamos,
                compartilhamos e protegemos suas informacoes pessoais em
                conformidade com a Lei Geral de Protecao de Dados (LGPD - Lei
                13.709/2018).
              </p>
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Compromisso LGPD:</strong> Seguimos rigorosamente os
                  principios de finalidade, adequacao, necessidade,
                  transparencia, seguranca e prevencao.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Dados Coletados */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  3
                </span>
                <Database className="h-5 w-5" />
                Dados Pessoais Coletados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 text-sm sm:text-base">
                  Dados de Cadastro
                </h4>
                <ResponsiveTable
                  headers={['Dado', 'Obrigatorio', 'Finalidade']}
                  rows={[
                    {
                      cells: [
                        'Nome completo',
                        'Sim',
                        'Identificacao do usuario',
                      ],
                    },
                    {
                      cells: ['Email', 'Sim', 'Autenticacao e comunicacao'],
                    },
                    {
                      cells: ['Senha', 'Sim', 'Acesso seguro a conta'],
                      highlight: true,
                    },
                    {
                      cells: [
                        'Orgao/Instituicao',
                        'Nao',
                        'Contextualizacao dos ETPs',
                      ],
                    },
                    {
                      cells: ['Cargo', 'Nao', 'Contextualizacao dos ETPs'],
                    },
                  ]}
                />
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3 text-sm sm:text-base">
                  Dados de Uso
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="bg-muted p-3 rounded-lg">
                    <h5 className="font-semibold text-sm">Endereco IP</h5>
                    <p className="text-xs text-muted-foreground">
                      Seguranca e prevencao de fraudes
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <h5 className="font-semibold text-sm">
                      Data/hora de acesso
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      Auditoria e logs
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <h5 className="font-semibold text-sm">User Agent</h5>
                    <p className="text-xs text-muted-foreground">
                      Diagnostico tecnico
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <h5 className="font-semibold text-sm">Acoes no sistema</h5>
                    <p className="text-xs text-muted-foreground">
                      Melhoria do servico
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Finalidades */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  4
                </span>
                Finalidades do Tratamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 text-sm sm:text-base">
                    Execucao do Servico
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>Autenticacao e acesso ao sistema</li>
                    <li>Criacao e gerenciamento de ETPs</li>
                    <li>Geracao de secoes com IA</li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm sm:text-base">
                    Seguranca
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>Prevencao de fraudes</li>
                    <li>Auditoria de acoes</li>
                    <li>Conformidade legal</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Base Legal */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  5
                </span>
                Base Legal para Tratamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTable
                headers={['Finalidade', 'Base Legal', 'Artigo LGPD']}
                rows={[
                  {
                    cells: [
                      'Autenticacao e ETPs',
                      'Execucao de contrato',
                      'Art. 7, V',
                    ],
                  },
                  {
                    cells: ['Consentimento LGPD', 'Consentimento', 'Art. 7, I'],
                    highlight: true,
                  },
                  {
                    cells: [
                      'Transferencia internacional',
                      'Consentimento especifico',
                      'Art. 33',
                    ],
                  },
                  {
                    cells: [
                      'Logs de auditoria',
                      'Obrigacao legal',
                      'Art. 7, II',
                    ],
                  },
                ]}
              />
            </CardContent>
          </Card>

          {/* 6. Compartilhamento */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  6
                </span>
                <Server className="h-5 w-5" />
                Compartilhamento de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 text-sm sm:text-base">
                  Provedores de Inteligencia Artificial
                </h4>
                <ResponsiveTable
                  headers={['Provedor', 'Pais', 'Finalidade']}
                  rows={[
                    {
                      cells: [
                        <span key="openai" className="font-semibold">
                          OpenAI
                        </span>,
                        'Estados Unidos',
                        'Geracao de texto com IA',
                      ],
                    },
                    {
                      cells: [
                        <span key="exa" className="font-semibold">
                          Exa
                        </span>,
                        'Estados Unidos',
                        'Pesquisa de contratos',
                      ],
                    },
                    {
                      cells: [
                        <span key="railway" className="font-semibold">
                          Railway
                        </span>,
                        'Estados Unidos',
                        'Hospedagem',
                      ],
                    },
                  ]}
                />
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Importante:</strong> Dados pessoais diretos (nome,
                  email) NAO sao enviados aos provedores de IA. Apenas o
                  conteudo dos ETPs e processado.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 7. Transferencia Internacional */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  7
                </span>
                <Globe className="h-5 w-5" />
                Transferencia Internacional de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Seus dados sao transferidos para os Estados Unidos, onde estao
                localizados os servidores de nossos provedores. Esta
                transferencia e realizada com base no seu{' '}
                <strong>consentimento especifico</strong> (LGPD Art. 33, VIII).
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-3 text-sm sm:text-base">
                  Garantias aplicadas
                </h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Padroes de seguranca adequados
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Conexoes criptografadas (HTTPS/TLS)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Clausulas contratuais de protecao
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 8. Retencao */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  8
                </span>
                <Clock className="h-5 w-5" />
                Retencao de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTable
                headers={['Tipo de Dado', 'Periodo de Retencao']}
                rows={[
                  {
                    cells: ['Dados de conta', 'Conta ativa + 5 anos'],
                  },
                  {
                    cells: ['ETPs e secoes', 'Enquanto conta ativa'],
                  },
                  {
                    cells: ['Logs de auditoria', '90 dias'],
                    highlight: true,
                  },
                  {
                    cells: ['Analytics', '1 ano (anonimizado apos 30 dias)'],
                  },
                ]}
              />
            </CardContent>
          </Card>

          {/* 9. Direitos do Titular */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  9
                </span>
                <UserCheck className="h-5 w-5" />
                Seus Direitos como Titular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-sm sm:text-base">
                Conforme a LGPD (Art. 18), voce possui os seguintes direitos:
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">
                    Confirmacao e acesso
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    Confirmar se tratamos seus dados e obter copia
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Correcao</h5>
                  <p className="text-xs text-muted-foreground">
                    Corrigir dados incompletos ou desatualizados
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Portabilidade</h5>
                  <p className="text-xs text-muted-foreground">
                    Receber seus dados em formato estruturado
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Eliminacao</h5>
                  <p className="text-xs text-muted-foreground">
                    Solicitar exclusao de dados
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Revogacao</h5>
                  <p className="text-xs text-muted-foreground">
                    Revogar consentimento a qualquer momento
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Informacao</h5>
                  <p className="text-xs text-muted-foreground">
                    Saber com quem compartilhamos seus dados
                  </p>
                </div>
              </div>

              <Separator />

              <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-lg border border-primary/20">
                <h4 className="font-semibold mb-2 text-sm sm:text-base">
                  Como Exercer Seus Direitos
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Entre em contato pelo email abaixo com o assunto "[LGPD]
                  Solicitacao de [direito]":
                </p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm sm:text-base">
                    privacidade@confenge.com.br
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Prazo de resposta: 15 dias uteis
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 10. Seguranca */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  10
                </span>
                <Lock className="h-5 w-5" />
                Seguranca dos Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold mb-2 text-green-800 dark:text-green-200 text-sm sm:text-base">
                    Medidas Tecnicas
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>Criptografia em transito (HTTPS/TLS)</li>
                    <li>Criptografia em repouso (PostgreSQL)</li>
                    <li>Hashing de senhas (bcrypt)</li>
                    <li>Tokens JWT com expiracao</li>
                    <li>Rate limiting contra ataques</li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200 text-sm sm:text-base">
                    Medidas Organizacionais
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>Acesso restrito por necessidade</li>
                    <li>Logs de auditoria</li>
                    <li>Procedimentos de resposta a incidentes</li>
                    <li>Rotacao periodica de secrets</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 11. Contato */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  11
                </span>
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm sm:text-base">
                Para duvidas, solicitacoes ou reclamacoes:
              </p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm sm:text-base">
                  privacidade@confenge.com.br
                </span>
              </div>
              <Separator />
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Caso nao esteja satisfeito com nossa resposta, voce pode
                  contatar a ANPD:
                </p>
                <a
                  href="https://www.gov.br/anpd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary underline text-sm hover:text-primary/80 transition-colors"
                >
                  www.gov.br/anpd
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-primary/20">
            <CardContent className="py-6 sm:py-8 text-center">
              <p className="text-sm sm:text-base font-semibold mb-3">
                Reconhecimento e Consentimento
              </p>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed max-w-2xl mx-auto">
                Ao utilizar o {APP_NAME}, voce declara ter lido e concordado com
                esta Politica de Privacidade.
              </p>
              <Separator className="my-4 max-w-md mx-auto" />
              <p className="text-xs text-muted-foreground max-w-xl mx-auto">
                Esta politica e regida pela legislacao brasileira, especialmente
                a LGPD (Lei 13.709/2018).
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Back to top */}
        <div className="mt-8 text-center pb-8">
          <Button variant="outline" asChild>
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
