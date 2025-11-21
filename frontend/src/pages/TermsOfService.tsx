import { Link } from 'react-router-dom';
import { ArrowLeft, FileCheck, Mail, Calendar, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';

// Simple separator component since it's not in ui folder
function Separator({ className = '' }: { className?: string }) {
  return <hr className={`border-t border-border my-4 ${className}`} />;
}

export function TermsOfService() {
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
              <FileCheck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl">Termos de Uso</CardTitle>
            <p className="text-muted-foreground">{APP_NAME}</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Versão 1.0
              </span>
              <span>|</span>
              <span>Vigência: 20/11/2025</span>
            </div>
          </CardHeader>
        </Card>

        {/* Content */}
        <div className="space-y-8">
          {/* 1. Definições */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">1. Definições</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Termo</th>
                      <th className="px-4 py-2 text-left">Definição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2 font-semibold">ETP Express</td>
                      <td className="px-4 py-2">
                        Plataforma digital de geração automatizada de ETPs
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-semibold">Usuário</td>
                      <td className="px-4 py-2">
                        Pessoa natural cadastrada no Sistema
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-semibold">ETP</td>
                      <td className="px-4 py-2">
                        Estudo Técnico Preliminar (Lei 14.133/2021)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-semibold">
                        Conteúdo Gerado
                      </td>
                      <td className="px-4 py-2">
                        Textos produzidos pela inteligência artificial
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 2. Aceitação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">2. Aceitação dos Termos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Ao criar uma conta no {APP_NAME}, você declara que:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Leu, compreendeu e concorda com estes Termos de Uso</li>
                <li>
                  Leu e compreendeu a{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Política de Privacidade
                  </Link>
                </li>
                <li>É maior de 18 anos e possui capacidade jurídica plena</li>
                <li>Forneceu informações verdadeiras e precisas no cadastro</li>
                <li>Utilizará o Sistema de forma legal e ética</li>
              </ul>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Importante:</strong> Caso não concorde com qualquer
                  parte destes Termos, você não deve utilizar o ETP Express.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Descrição dos Serviços */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                3. Descrição dos Serviços
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">
                  Funcionalidades Principais
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Criação de ETPs com formulário guiado</li>
                  <li>Geração automatizada de seções com IA</li>
                  <li>Pesquisa de contratos similares para fundamentação</li>
                  <li>Edição e validação de conteúdo gerado</li>
                  <li>Exportação em formatos PDF e DOCX</li>
                  <li>Histórico e versionamento de documentos</li>
                </ul>
              </div>

              <Separator />

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-semibold mb-2 text-red-800 dark:text-red-200">
                  Limitações do Serviço
                </h4>
                <ul className="list-disc pl-5 text-sm space-y-1 text-red-700 dark:text-red-300">
                  <li>
                    O Sistema é uma ferramenta de <strong>auxílio</strong>, não
                    substitui análise técnica humana
                  </li>
                  <li>
                    O Usuário é <strong>responsável</strong> pela validação do
                    conteúdo final
                  </li>
                  <li>
                    O Sistema <strong>não presta consultoria</strong> jurídica
                    ou técnica
                  </li>
                  <li>
                    A precisão depende da qualidade das informações fornecidas
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 4. Cadastro e Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                4. Cadastro e Conta de Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">
                  Responsabilidade pela Conta
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Você é responsável por:
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>Manter a confidencialidade de sua senha</li>
                  <li>Todas as atividades realizadas em sua conta</li>
                  <li>Notificar imediatamente sobre uso não autorizado</li>
                  <li>Atualizar seus dados cadastrais quando necessário</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Suspensão de Conta</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Podemos suspender ou encerrar sua conta se:
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>Você violar estes Termos de Uso</li>
                  <li>Detectarmos atividade fraudulenta ou suspeita</li>
                  <li>Você solicitar o encerramento da conta</li>
                  <li>Houver inatividade superior a 2 anos</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 5. Uso Aceitável */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">5. Uso Aceitável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold mb-2 text-green-800 dark:text-green-200">
                  Condutas Permitidas ✅
                </h4>
                <ul className="list-disc pl-5 text-sm space-y-1 text-green-700 dark:text-green-300">
                  <li>Criar quantos ETPs necessitar para fins legítimos</li>
                  <li>Editar, revisar e validar o conteúdo gerado</li>
                  <li>Exportar seus ETPs nos formatos disponíveis</li>
                  <li>Utilizar o conteúdo gerado em licitações públicas</li>
                  <li>Compartilhar o resultado final com sua equipe</li>
                </ul>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-semibold mb-2 text-red-800 dark:text-red-200">
                  Condutas Proibidas ❌
                </h4>
                <ul className="list-disc pl-5 text-sm space-y-1 text-red-700 dark:text-red-300">
                  <li>Utilizar o Sistema para fins ilegais ou fraudulentos</li>
                  <li>Tentar burlar mecanismos de segurança</li>
                  <li>Realizar engenharia reversa do Sistema</li>
                  <li>Copiar, reproduzir ou revender a tecnologia</li>
                  <li>Inserir conteúdo ofensivo ou discriminatório</li>
                  <li>Utilizar o Sistema para spam ou abuso</li>
                  <li>Automatizar acesso via bots não autorizados</li>
                  <li>Sobrecarregar o Sistema com requisições excessivas</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 6. Propriedade Intelectual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                6. Propriedade Intelectual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">
                  Propriedade do Conteúdo Gerado
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">
                          Tipo de Conteúdo
                        </th>
                        <th className="px-4 py-2 text-left">Propriedade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2 font-semibold">
                          Conteúdo do Usuário (inputs)
                        </td>
                        <td className="px-4 py-2">Você mantém a propriedade</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-semibold">
                          Conteúdo Gerado (IA)
                        </td>
                        <td className="px-4 py-2">
                          Você recebe direitos de uso ilimitado
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-semibold">
                          Templates e estruturas
                        </td>
                        <td className="px-4 py-2">
                          ETP Express (licenciados para uso)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
                  Concessão de Licença
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Ao gerar conteúdo no ETP Express, você recebe uma{' '}
                  <strong>
                    licença perpétua, mundial, irrevogável e livre de royalties
                  </strong>{' '}
                  para usar, modificar, distribuir e comercializar o conteúdo
                  gerado.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 7. Garantias e Limitações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                7. Garantias e Limitações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
                  Isenção de Garantias
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                  O ETP Express é fornecido{' '}
                  <strong>"NO ESTADO EM QUE SE ENCONTRA"</strong> e
                  <strong> "CONFORME DISPONIBILIDADE"</strong>.
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold">
                  Não garantimos:
                </p>
                <ul className="list-disc pl-5 text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                  <li>Disponibilidade ininterrupta (uptime 100%)</li>
                  <li>Precisão absoluta do conteúdo gerado por IA</li>
                  <li>Ausência de erros ou bugs</li>
                  <li>Conformidade com requisitos específicos de cada órgão</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">
                  Responsabilidade do Usuário
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  O Usuário é <strong>integralmente responsável</strong> por:
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  <li>Validar a precisão técnica do conteúdo gerado</li>
                  <li>Revisar conformidade com legislação aplicável</li>
                  <li>Verificar adequação aos requisitos do órgão</li>
                  <li>
                    Assegurar que o ETP está completo e correto antes de
                    submeter
                  </li>
                </ul>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">
                  Limitação de Responsabilidade
                </p>
                <p className="text-xs text-muted-foreground">
                  Na máxima extensão permitida pela lei, não nos
                  responsabilizamos por danos diretos, indiretos, incidentais ou
                  consequentes, incluindo perda de dados, lucros ou
                  oportunidades. Nossa responsabilidade máxima é limitada ao
                  valor pago nos últimos 12 meses (atualmente R$ 0, pois o
                  serviço é gratuito).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 8. Privacidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                8. Privacidade e Proteção de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                O tratamento de seus dados pessoais é regido por nossa{' '}
                <Link
                  to="/privacy"
                  className="text-primary hover:underline font-semibold"
                >
                  Política de Privacidade
                </Link>
                , em conformidade com a LGPD (Lei 13.709/2018).
              </p>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">
                  Transferência Internacional
                </h4>
                <p className="text-xs text-muted-foreground">
                  Ao aceitar estes Termos, você consente expressamente com a
                  transferência internacional de dados para os Estados Unidos
                  (Railway, OpenAI, Perplexity).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm">Seus Direitos</h4>
                <p className="text-xs text-muted-foreground">
                  Você possui direitos garantidos pela LGPD, incluindo acesso,
                  correção, exclusão, portabilidade e revogação de
                  consentimento.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Para exercê-los, entre em contato:{' '}
                  <span className="font-semibold">
                    privacidade@etpexpress.com.br
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 9. Rescisão */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">9. Rescisão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Rescisão pelo Usuário</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Você pode encerrar sua conta a qualquer momento através das
                  configurações da conta.
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Efeitos:</strong> Seus dados serão excluídos conforme
                  Política de Privacidade. ETPs serão mantidos por 30 dias
                  (backup) e depois eliminados permanentemente.
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">
                  Rescisão pelo ETP Express
                </h4>
                <p className="text-sm text-muted-foreground">
                  Podemos encerrar sua conta se você violar estes Termos,
                  detectarmos fraude/abuso, ou após inatividade superior a 2
                  anos (com aviso prévio de 30 dias).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 10. Disposições Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">10. Disposições Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Scale className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Lei Aplicável</h4>
                  <p className="text-sm text-muted-foreground">
                    Estes Termos são regidos pelas leis da República Federativa
                    do Brasil.
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2 text-sm">
                  Legislação de Referência
                </h4>
                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                  <li>Código Civil Brasileiro (Lei 10.406/2002)</li>
                  <li>Marco Civil da Internet (Lei 12.965/2014)</li>
                  <li>Lei Geral de Proteção de Dados (Lei 13.709/2018)</li>
                  <li>Código de Defesa do Consumidor (Lei 8.078/1990)</li>
                  <li>Lei de Licitações e Contratos (Lei 14.133/2021)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 11. Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">11. Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Para dúvidas, sugestões ou reclamações sobre estes Termos de
                Uso:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="font-semibold">
                    suporte@etpexpress.com.br
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Prazo de resposta: Até 15 dias úteis
                </p>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Assuntos específicos:</p>
                <ul className="space-y-1 pl-4">
                  <li>• Privacidade e LGPD: privacidade@etpexpress.com.br</li>
                  <li>• Problemas técnicos: suporte@etpexpress.com.br</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card className="bg-muted/50">
            <CardContent className="py-6 text-center">
              <p className="text-sm font-semibold mb-2">
                Reconhecimento e Consentimento
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Ao criar uma conta no {APP_NAME}, você declara que leu
                integralmente estes Termos de Uso, compreendeu todas as
                disposições, concorda em cumprir todas as obrigações e aceita as
                limitações descritas.
              </p>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                Esta política é regida pela legislação brasileira, especialmente
                a LGPD (Lei 13.709/2018), Marco Civil da Internet (Lei
                12.965/2014) e Lei de Licitações (Lei 14.133/2021).
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
