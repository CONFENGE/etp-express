# Business Model - Public API de Preços

**Versão:** 1.0.0
**Última Atualização:** 2026-01-31
**Issue Rastreamento:** #1275, #1690

---

## Visão Geral

A **Public API de Preços** do ETP Express oferece acesso programático a dados de inteligência de mercado para estimativa de preços em contratações públicas. A API fornece benchmarks regionais, busca de itens normalizados e acesso à taxonomia CATMAT/CATSER.

**Público-Alvo:**
- Empresas de software de gestão pública
- Sistemas de licitação e pregão eletrônico
- Ferramentas de análise de contratos
- Consultorias especializadas em compras públicas

---

## Planos e Preços

### Free Plan (Freemium)

**Preço:** Gratuito
**Quota:** 100 requisições/mês
**Ideal para:** Testes, POCs, uso pessoal

**Limites:**
- 100 requests/mês
- Rate limiting: 10 req/min
- Sem suporte técnico
- Sem SLA garantido

**Upgrade:**
- Acesso imediato via auto-serviço
- Migração automática de API Key

---

### Pro Plan

**Preço:** R$ 497/mês
**Quota:** 5.000 requisições/mês
**Ideal para:** Startups, pequenas empresas, integrações iniciais

**Limites:**
- 5.000 requests/mês (~166 req/dia)
- Rate limiting: 50 req/min
- Suporte por email (SLA 48h)
- Uptime SLA: 99.5%

**Recursos Adicionais:**
- Acesso a dashboard de analytics
- Webhook notifications (futuro)
- Histórico de 90 dias de usage logs

**Upgrade:**
- Via painel de controle
- Pagamento por cartão ou boleto
- Faturamento mensal

---

### Enterprise Plan

**Preço:** Sob Consulta (mínimo R$ 2.997/mês)
**Quota:** Ilimitada
**Ideal para:** Grandes empresas, sistemas de alta demanda, integrações críticas

**Limites:**
- Unlimited requests
- Rate limiting: Customizável (padrão: 500 req/min)
- Suporte prioritário 24/7 (SLA 4h)
- Uptime SLA: 99.9%

**Recursos Adicionais:**
- Dedicated support channel (Slack, Teams)
- Custom endpoints (sob demanda)
- Data export em massa (CSV, JSON)
- Acesso antecipado a novos recursos
- IP whitelisting
- Custom SLA e contratos

**Contratação:**
- Via comercial: api-sales@etpexpress.com.br
- Onboarding dedicado
- Faturamento anual com desconto (15-25%)

---

## SLA e Garantias

### Uptime Commitments

| Plano | Uptime Garantido | Downtime Permitido/Mês | Compensação |
|-------|------------------|------------------------|-------------|
| Free | Best Effort | N/A | Nenhuma |
| Pro | 99.5% | ~3.6 horas | 10% de crédito se violado |
| Enterprise | 99.9% | ~43 minutos | 25% de crédito se violado |

**Cálculo de Créditos:**
- Créditos aplicados automaticamente na próxima fatura
- Reportar incidentes via support@etpexpress.com.br
- SLA calculado mensalmente

### Performance Guarantees

| Métrica | Free | Pro | Enterprise |
|---------|------|-----|------------|
| P95 Latency | < 500ms | < 200ms | < 100ms |
| P99 Latency | < 1000ms | < 500ms | < 200ms |
| Error Rate | < 1% | < 0.5% | < 0.1% |

### Support SLA

| Canal | Free | Pro | Enterprise |
|-------|------|-----|------------|
| Email | N/A | 48h | 4h |
| Chat | N/A | N/A | 1h |
| Phone | N/A | N/A | 30min |
| Dedicated Slack | N/A | N/A | 15min |

---

## Processo de Upgrade

### Free → Pro

1. Acesse dashboard: https://app.etpexpress.com.br/settings/api
2. Clique em "Upgrade to Pro"
3. Insira dados de pagamento
4. Confirme assinatura
5. **API Key permanece a mesma** - sem necessidade de redeployment
6. Quota atualizada instantaneamente

### Pro → Enterprise

1. Entre em contato: api-sales@etpexpress.com.br
2. Call de discovery (necessidades, volumetria esperada)
3. Proposta comercial customizada
4. Assinatura de contrato
5. Onboarding técnico (1-2 semanas)
6. Migração com zero downtime

### Downgrade

- Possível apenas no final do ciclo de faturamento
- Solicitação via support@etpexpress.com.br
- Dados históricos preservados por 180 dias

---

## Política de Fair Use

### Aplicável a Todos os Planos

Mesmo dentro das quotas, a API não deve ser usada para:

**Proibido:**
- Scraping ou crawling automatizado em massa
- Revenda de dados sem autorização
- Benchmarking de concorrentes
- Ataques DDoS ou testes de carga não autorizados
- Proxy ou redistribuição de acesso

**Permitido:**
- Integração em produtos próprios
- Análises internas
- Aplicações white-label (com aprovação)
- Cache de respostas por até 24h

**Penalidades por Violação:**
1. **Primeira Infração:** Aviso por email
2. **Segunda Infração:** Suspensão temporária (24-48h)
3. **Terceira Infração:** Banimento permanente sem reembolso

---

## API Versioning e Changelog

### Política de Versionamento

- **Versão Atual:** v1
- **URL Base:** `https://api.etpexpress.com.br/api/v1`
- **Breaking Changes:** Nova versão (v2, v3)
- **Non-Breaking Changes:** Mesma versão
- **Deprecation Notice:** 6 meses antes de remoção

### Changelog

#### v1.0.0 (2026-01-31) - Initial Release

**Endpoints Lançados:**
- `GET /api/v1/prices/benchmark` - Regional price benchmarks
- `GET /api/v1/prices/search` - Search normalized items
- `GET /api/v1/prices/categories` - CATMAT/CATSER taxonomy

**Autenticação:**
- API Key via header `X-API-Key`

**Rate Limiting:**
- Free: 10 req/min, 100/month
- Pro: 50 req/min, 5000/month
- Enterprise: 500 req/min, unlimited

**Tracking:**
- `ApiUsage` entity para métricas
- Dashboard de analytics (Pro+)

---

## Roadmap de Features

### Q1 2026 (Planejado)

- [ ] Webhook notifications para price alerts
- [ ] Batch export endpoint (Enterprise)
- [ ] GraphQL API (beta)

### Q2 2026 (Futuro)

- [ ] Historical trends endpoint
- [ ] Custom analytics queries (Enterprise)
- [ ] Sandbox environment para testes

### Q3 2026 (Exploratório)

- [ ] Machine Learning price predictions
- [ ] Market anomaly detection
- [ ] Integration marketplace

---

## Documentação Técnica

### Swagger/OpenAPI

- **Spec URL:** https://api.etpexpress.com.br/api/docs
- **Interactive Docs:** https://api.etpexpress.com.br/api/docs/swagger-ui

### Guias de Integração

- **Quickstart:** `/docs/api/quickstart.md`
- **Authentication:** `/docs/api/authentication.md`
- **Rate Limiting:** `/docs/api/rate-limiting.md`
- **Error Codes:** `/docs/api/error-codes.md`

### SDKs Oficiais (Futuro)

- [ ] JavaScript/TypeScript
- [ ] Python
- [ ] Java
- [ ] C# (.NET)

---

## Métricas de Sucesso

### KPIs Primários

| Métrica | Meta Q1 2026 | Meta Q2 2026 |
|---------|--------------|--------------|
| Free Signups | 500 | 1.500 |
| Free → Pro Conversion | 5% | 10% |
| Pro → Enterprise | 10% | 15% |
| MRR (Monthly Recurring Revenue) | R$ 50k | R$ 150k |
| Churn Rate | < 5% | < 3% |
| API Uptime | 99.7% | 99.9% |

### KPIs Secundários

- Avg Response Time: < 150ms (P95)
- Support Ticket Resolution: < 24h (Pro), < 4h (Enterprise)
- API Docs Page Views: 1000+/month
- Developer Satisfaction (NPS): > 50

---

## Contato Comercial

**Vendas:**
- Email: api-sales@etpexpress.com.br
- Telefone: +55 (11) 3000-0000

**Suporte Técnico:**
- Email: support@etpexpress.com.br
- Portal: https://support.etpexpress.com.br

**Parceria e Integrações:**
- Email: partnerships@etpexpress.com.br

---

## Termos e Condições

A utilização da API está sujeita aos seguintes documentos:

1. **Terms of Service:** `/docs/TERMS_OF_SERVICE.md`
2. **Privacy Policy:** `/docs/PRIVACY_POLICY.md`
3. **API Terms:** `/docs/api/API_TERMS.md` (a criar)
4. **Data Processing Agreement (DPA):** Para clientes Enterprise

**Última Revisão:** 2026-01-31
**Vigência:** A partir de 2026-02-01

---

## Apêndice: Comparação com Concorrentes

| Feature | ETP Express | Concorrente A | Concorrente B |
|---------|-------------|---------------|---------------|
| Free Tier | 100 req/mês | 50 req/mês | Sem free tier |
| Pro Price | R$ 497/mês | R$ 699/mês | R$ 450/mês |
| Enterprise Custom | Sob consulta | R$ 5k/mês | R$ 3k/mês |
| Data Sources | Gov.br, PNCP, SINAPI, Compras.gov | Gov.br apenas | Proprietário |
| Real-time Updates | Sim (webhooks) | Não | Sim |
| Historical Data | 5 anos | 2 anos | 3 anos |
| Regional Granularity | UF + Município | UF apenas | Nacional |
| Uptime SLA | 99.9% (Enterprise) | 99.5% | 99.0% |

**Diferenciais ETP Express:**
- ✅ Maior cobertura de fontes governamentais
- ✅ Normalização automática com LLM (GPT-4)
- ✅ Integração nativa com ComplianceService (Lei 14.133/2021)
- ✅ Alertas de sobrepreço baseados em ML

---

**Documento mantido por:** Equipe de Produto ETP Express
**Revisão:** Trimestral (próxima: 2026-04-30)
