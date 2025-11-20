import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Mail, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';

// Simple separator component since it's not in ui folder
function Separator({ className = '' }: { className?: string }) {
  return <hr className={`border-t border-border my-4 ${className}`} />;
}

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl">Política de Privacidade</CardTitle>
            <p className="text-muted-foreground">{APP_NAME}</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Versão 1.0
              </span>
              <span>|</span>
              <span>Vigência: 19/11/2025</span>
            </div>
          </CardHeader>
        </Card>

        {/* Content */}
        <div className="space-y-8">
          {/* 1. Identificação do Controlador */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">1. Identificação do Controlador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold">Controlador de Dados:</p>
                <p>ETP Express - Sistema de Geração de Estudos Técnicos Preliminares</p>
              </div>
              <div>
                <p className="font-semibold">Contato para Proteção de Dados:</p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  privacidade@etpexpress.com.br
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Introdução */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">2. Introdução</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                O ETP Express está comprometido com a proteção da privacidade e dos dados pessoais de seus usuários.
                Esta Política de Privacidade descreve como coletamos, usamos, armazenamos, compartilhamos e protegemos
                suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
              </p>
            </CardContent>
          </Card>

          {/* 3. Dados Coletados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">3. Dados Pessoais Coletados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Dados de Cadastro</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Dado</th>
                        <th className="px-4 py-2 text-left">Obrigatório</th>
                        <th className="px-4 py-2 text-left">Finalidade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2">Nome completo</td>
                        <td className="px-4 py-2">Sim</td>
                        <td className="px-4 py-2">Identificação do usuário</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Email</td>
                        <td className="px-4 py-2">Sim</td>
                        <td className="px-4 py-2">Autenticação e comunicação</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Senha</td>
                        <td className="px-4 py-2">Sim</td>
                        <td className="px-4 py-2">Acesso seguro à conta</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Órgão/Instituição</td>
                        <td className="px-4 py-2">Não</td>
                        <td className="px-4 py-2">Contextualização dos ETPs</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Cargo</td>
                        <td className="px-4 py-2">Não</td>
                        <td className="px-4 py-2">Contextualização dos ETPs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Dados de Uso</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Endereço IP - Segurança e prevenção de fraudes</li>
                  <li>Data/hora de acesso - Auditoria e logs</li>
                  <li>User Agent (navegador) - Diagnóstico técnico</li>
                  <li>Ações no sistema - Melhoria do serviço</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 4. Finalidades */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">4. Finalidades do Tratamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">Execução do Serviço</h4>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>Autenticação e acesso ao sistema</li>
                  <li>Criação e gerenciamento de ETPs</li>
                  <li>Geração de seções com inteligência artificial</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Segurança</h4>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>Prevenção de fraudes</li>
                  <li>Auditoria de ações</li>
                  <li>Conformidade legal</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 5. Base Legal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">5. Base Legal para Tratamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Finalidade</th>
                      <th className="px-4 py-2 text-left">Base Legal</th>
                      <th className="px-4 py-2 text-left">Artigo LGPD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2">Autenticação e ETPs</td>
                      <td className="px-4 py-2">Execução de contrato</td>
                      <td className="px-4 py-2">Art. 7º, V</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Consentimento LGPD</td>
                      <td className="px-4 py-2">Consentimento</td>
                      <td className="px-4 py-2">Art. 7º, I</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Transferência internacional</td>
                      <td className="px-4 py-2">Consentimento específico</td>
                      <td className="px-4 py-2">Art. 33</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Logs de auditoria</td>
                      <td className="px-4 py-2">Obrigação legal</td>
                      <td className="px-4 py-2">Art. 7º, II</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 6. Compartilhamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">6. Compartilhamento de Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Provedores de Inteligência Artificial</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Provedor</th>
                        <th className="px-4 py-2 text-left">País</th>
                        <th className="px-4 py-2 text-left">Finalidade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2 font-semibold">OpenAI</td>
                        <td className="px-4 py-2">Estados Unidos</td>
                        <td className="px-4 py-2">Geração de texto com IA</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-semibold">Perplexity</td>
                        <td className="px-4 py-2">Estados Unidos</td>
                        <td className="px-4 py-2">Pesquisa de contratos</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-semibold">Railway</td>
                        <td className="px-4 py-2">Estados Unidos</td>
                        <td className="px-4 py-2">Hospedagem</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  <strong>Importante:</strong> Dados pessoais diretos (nome, email) NÃO são enviados aos provedores de IA.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 7. Transferência Internacional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">7. Transferência Internacional de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Seus dados são transferidos para os Estados Unidos, onde estão localizados os servidores
                de nossos provedores. Esta transferência é realizada com base no seu
                <strong> consentimento específico</strong> (LGPD Art. 33, VIII).
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Garantias aplicadas:</h4>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  <li>Padrões de segurança adequados</li>
                  <li>Conexões criptografadas (HTTPS/TLS)</li>
                  <li>Cláusulas contratuais de proteção de dados</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 8. Retenção */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">8. Retenção de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Tipo de Dado</th>
                      <th className="px-4 py-2 text-left">Período</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2">Dados de conta</td>
                      <td className="px-4 py-2">Conta ativa + 5 anos</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">ETPs e seções</td>
                      <td className="px-4 py-2">Enquanto conta ativa</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Logs de auditoria</td>
                      <td className="px-4 py-2">90 dias</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Analytics</td>
                      <td className="px-4 py-2">1 ano (anonimizado após 30 dias)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 9. Direitos do Titular */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">9. Seus Direitos como Titular</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Conforme a LGPD (Art. 18), você possui os seguintes direitos:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Confirmação e acesso</h5>
                  <p className="text-xs text-muted-foreground">Confirmar se tratamos seus dados e obter cópia</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Correção</h5>
                  <p className="text-xs text-muted-foreground">Corrigir dados incompletos ou desatualizados</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Portabilidade</h5>
                  <p className="text-xs text-muted-foreground">Receber seus dados em formato estruturado</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Eliminação</h5>
                  <p className="text-xs text-muted-foreground">Solicitar exclusão de dados</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Revogação</h5>
                  <p className="text-xs text-muted-foreground">Revogar consentimento a qualquer momento</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <h5 className="font-semibold text-sm">Informação</h5>
                  <p className="text-xs text-muted-foreground">Saber com quem compartilhamos seus dados</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Como Exercer Seus Direitos</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Entre em contato pelo email abaixo com o assunto "[LGPD] Solicitação de [direito]":
                </p>
                <p className="flex items-center gap-2 font-semibold">
                  <Mail className="h-4 w-4" />
                  privacidade@etpexpress.com.br
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Prazo de resposta: 15 dias úteis
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 10. Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">10. Segurança dos Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Medidas Técnicas</h4>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    <li>Criptografia em trânsito (HTTPS/TLS)</li>
                    <li>Criptografia em repouso (PostgreSQL)</li>
                    <li>Hashing de senhas (bcrypt)</li>
                    <li>Tokens JWT com expiração</li>
                    <li>Rate limiting contra ataques</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Medidas Organizacionais</h4>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    <li>Acesso restrito por necessidade</li>
                    <li>Logs de auditoria</li>
                    <li>Procedimentos de resposta a incidentes</li>
                    <li>Rotação periódica de secrets</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 11. Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">11. Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-2">
                  Para dúvidas, solicitações ou reclamações:
                </p>
                <p className="flex items-center gap-2 font-semibold">
                  <Mail className="h-4 w-4" />
                  privacidade@etpexpress.com.br
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Caso não esteja satisfeito com nossa resposta, você pode contatar a ANPD:
                </p>
                <a
                  href="https://www.gov.br/anpd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline text-sm"
                >
                  www.gov.br/anpd
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card className="bg-muted/50">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Ao utilizar o {APP_NAME}, você declara ter lido e concordado com esta Política de Privacidade.
              </p>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                Esta política é regida pela legislação brasileira, especialmente a LGPD (Lei 13.709/2018).
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Back to top */}
        <div className="mt-8 text-center">
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
