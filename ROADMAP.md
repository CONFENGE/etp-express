# ROADMAP - ETP Express

**Atualizado:** 2026-01-09 | **Progresso:** 657/733 (90%) | **Deploy:** LIVE

---

## Atualizações Recentes

| Data       | PR    | Tipo     | Descrição                                                       |
| ---------- | ----- | -------- | --------------------------------------------------------------- |
| 2026-01-09 | #1361 | Fix      | Remove intrusive AI generation banner trigger (#1346) ✅        |
| 2026-01-09 | #1360 | Fix      | Show ETP author name in Dashboard for Admin (#1351) ✅          |
| 2026-01-09 | #1359 | Fix      | Sync progress between ETP list and detail views (#1344) ✅      |
| 2026-01-09 | #1358 | Fix      | Show section titles in ETP Editor tabs (#1345) ✅               |
| 2026-01-09 | #1357 | Fix      | Fix Admin statistics zeros + translate to Portuguese (#1352) ✅ |
| 2026-01-08 | #1356 | Fix      | Improve Chromium detection for Nix/Nixpacks (#1355) ✅          |
| 2026-01-08 | -     | Audit    | Admin happy path: 9 bugs (4 novos P0 #1351-#1355) ⚠️            |
| 2026-01-08 | #1349 | Fix      | Robust Chromium detection for PDF export (#1342) ✅             |
| 2026-01-08 | #1348 | Fix      | Fix demo user 403 error - self-healing demo org (#1341) ✅      |
| 2026-01-08 | -     | Audit    | Consultor test: confirmados 7 P0 bugs (#1341-#1347) ⚠️          |
| 2026-01-08 | -     | Audit    | Happy path test: 7 P0 bugs found (#1341-#1347) ⚠️               |
| 2026-01-08 | #1339 | Fix      | Corrigir acentuação em textos da interface (#1329) ✅           |
| 2026-01-08 | #1338 | Fix      | Skip Campos Específicos step when no template (#1330) ✅        |
| 2026-01-08 | #1337 | Fix      | Auto-sync ETP status with completion percentage (#1331) ✅      |
| 2026-01-08 | #1336 | Fix      | Persist welcome modal dismissal to localStorage (#1327) ✅      |
| 2026-01-08 | #1335 | Fix      | Show detailed validation errors on ETP creation (#1325) ✅      |
| 2026-01-08 | #1334 | Fix      | Prevent wizard premature submission via Enter key (#1332) ✅    |
| 2026-01-08 | #1333 | Security | **CRITICAL** Fix dashboard data leakage (#1326) ✅              |
| 2026-01-08 | #1324 | Fix      | Sort section tabs by number (#1318) ✅                          |
| 2026-01-08 | #1323 | Fix      | Show fallback title when ETP title is empty (#1317) ✅          |
| 2026-01-08 | #1322 | Fix      | Map completionPercentage to progress for display (#1316) ✅     |
| 2026-01-08 | #1321 | Fix      | Fix save section 404 - use PATCH /sections/:id (#1314) ✅       |
| 2026-01-08 | #1320 | Fix      | Fix PDF export 404 error - P0 BLOQUEADOR (#1315) ✅             |
| 2026-01-08 | #1319 | Fix      | CreateETPPage for /etps/new route - P0 BLOQUEADOR (#1313) ✅    |
| 2026-01-08 | -     | Audit    | Happy path simulation: 6 P0 bugs found (#1313-#1318) ⚠️         |
| 2026-01-08 | #1312 | Fix      | Redesign Politica de Privacidade with responsive UI (#1302) ✅  |
| 2026-01-07 | #1310 | Fix      | Redesign Termos de Uso page with responsive UI (#1301) ✅       |
| 2026-01-07 | #1309 | Fix      | Corrigir acentuação em toda UI (#1300) ✅                       |
| 2026-01-07 | #1308 | Fix      | Fix 'Gerar Sugestao' button error (#1303) ✅                    |
| 2026-01-07 | #1307 | Fix      | Correct API route for section updates (#1304) ✅                |
| 2026-01-07 | #1306 | Fix      | Add UserManual page and fix 404 link (#1298) ✅                 |
| 2026-01-07 | #1305 | Fix      | Add role-based admin navigation links (#1299) ✅                |
| 2026-01-07 | -     | Audit    | Sync ROADMAP: add P0 bugs, close epics #1158/#1161 ✅           |
| 2026-01-07 | #1296 | Test     | Add E2E tests for template-based ETP creation (#1241) ✅        |
| 2026-01-07 | #1295 | Feature  | Implement dynamic fields based on template type (#1240) ✅      |
| 2026-01-07 | #1246 | Feature  | Integrate TemplateSelector into CreateETPWizard (#1239) ✅      |
| 2026-01-07 | #1245 | Feature  | Add TemplateSelector frontend component (#1238) ✅              |
| 2026-01-07 | #1244 | Test     | Add E2E integration tests for templates API endpoints (#1237)   |
| 2026-01-07 | #1243 | Feature  | Seed 4 base ETP templates (Obras, TI, Serviços, Materiais) ✅   |
| 2026-01-07 | #1242 | Feature  | Merge EtpTemplate entity and module structure (#1235) ✅        |
| 2026-01-06 | #1242 | Feature  | Add EtpTemplate entity and module structure (#1235)             |
| 2026-01-06 | -     | Planning | Desmembrar #1161 em 7 sub-issues atômicas (#1235-#1241)         |
| 2026-01-06 | #1234 | Test     | Add E2E tests for CreateETPWizard - Completes Epic #1158        |
| 2026-01-06 | #1233 | Feature  | Add multi-step CreateETPWizard component - Epic #1158 #1227     |
| 2026-01-06 | #1232 | Feature  | Add estimativa de custos fields - Epic #1158 sub-issue #1226    |
| 2026-01-06 | #1231 | Feature  | Add requisitos e riscos fields - Epic #1158 sub-issue #1225     |
| 2026-01-06 | #1230 | Feature  | Add objeto/justificativa fields - Epic #1158 sub-issue #1224    |
| 2026-01-06 | #1229 | Feature  | Add ETP identification fields - Epic #1158 sub-issue #1223      |
| 2026-01-06 | #1222 | Feature  | Persist SINAPI/SICRO gov prices to PostgreSQL (#1165)           |
| 2026-01-06 | #1221 | Feature  | Complete onboarding wizard with checklist (#1213)               |

---

## MVP Comercial - Prioridade Máxima para GTM

> **Objetivo:** Catalisar GTM com happy paths perfeitos para demos e uso real

### Fase 1 - Happy Path Core (P1 CRÍTICO)

| #     | Issue                                                   | Status |
| ----- | ------------------------------------------------------- | ------ |
| #1158 | [ETP] Expandir formulário de criação para 20-30 campos  | ✅     |
|       | ↳ #1223 Campos de Identificação                         | ✅     |
|       | ↳ #1224 Campos de Objeto e Justificativa                | ✅     |
|       | ↳ #1225 Campos de Requisitos e Riscos                   | ✅     |
|       | ↳ #1226 Campos de Estimativa de Custos                  | ✅     |
|       | ↳ #1227 Frontend CreateETPWizard                        | ✅     |
|       | ↳ #1228 Testes E2E                                      | ✅     |
| #1161 | [Templates] Criar modelos pré-configurados por tipo     | ✅     |
|       | ↳ #1235 Create EtpTemplate entity and module            | ✅     |
|       | ↳ #1236 Seed 4 base templates                           | ✅     |
|       | ↳ #1237 Create templates API endpoints                  | ✅     |
|       | ↳ #1238 Create TemplateSelector frontend component      | ✅     |
|       | ↳ #1239 Integrate TemplateSelector into CreateETPWizard | ✅     |
|       | ↳ #1240 Implement dynamic fields based on template      | ✅     |
|       | ↳ #1241 Add E2E tests for template-based ETP creation   | ✅     |
| #1215 | [UX] Validação em tempo real dos campos ETP             | ✅     |
| #1169 | [UX] Implementar auto-save durante edição               | ✅     |

### Fase 2 - Experiência Guiada (P1)

| #     | Issue                                         | Status |
| ----- | --------------------------------------------- | ------ |
| #1213 | [UX] Wizard de onboarding para primeiro uso   | ✅     |
| #1214 | [Export] Preview de documento antes do export | ✅     |
| #1167 | [Assistente] Implementar chatbot para dúvidas | 🔴     |
| #1164 | [Dashboard] Adicionar métricas avançadas      | 🔴     |

### Fase 3 - Credibilidade Institucional (P1)

| #     | Issue                                                 | Status |
| ----- | ----------------------------------------------------- | ------ |
| #1163 | [Conformidade] Templates baseados em modelos TCU/TCES | 🔴     |
| #1165 | [Preços] Persistir histórico SINAPI/SICRO em banco    | ✅     |

### Fase 4 - Operacional (P2)

| #     | Issue                                              | Status |
| ----- | -------------------------------------------------- | ------ |
| #1166 | [Preços] Ajustar schedule para atualização semanal | 🔴     |
| #1168 | [Export] Integrar armazenamento em nuvem (S3)      | 🔴     |

**Progresso MVP Comercial:** 23/28 (82%) - Epics #1158 e #1161 COMPLETAS ✅ | Restam: #1163, #1164, #1166, #1167, #1168

---

## Bugs Criticos P0 (11 issues) - HAPPY PATH QUEBRADO ⚠️

> **ATENCAO:** Bugs críticos detectados em simulação de happy path. Sistema com funcionalidades core quebradas.

### Novos Bugs P0 (2026-01-08) - BLOQUEADORES

| #     | Issue                                                          | Area           | Status |
| ----- | -------------------------------------------------------------- | -------------- | ------ |
| #1341 | [P0] Usuario demo nao consegue criar novos ETPs - Erro 403     | Backend/Auth   | ✅     |
| #1342 | [P0] Exportacao PDF falha com erro 500                         | Backend/Export | ✅     |
| #1343 | [P0] Templates de ETP nao disponiveis no wizard de criacao     | Backend/Seed   | ✅     |
| #1344 | [P0] Inconsistencia no indicador de progresso lista vs detalhe | Frontend       | ✅     |
| #1346 | [P0] Banner de vendas intrusivo durante uso do sistema demo    | Frontend/UX    | ✅     |
| #1347 | [P0] Campo de data aceita apenas formato ISO, nao brasileiro   | Frontend/UX    | 🔴     |
| #1351 | [P0] Dashboard Admin mostra ETPs sem identificar autoria       | Frontend/UX    | ✅     |

> **1 bug P0 ativo** - Detectados em auditoria Admin + Consultor happy paths.

### Bugs P0 Resolvidos (Anteriores)

| #     | Issue                                                                     | Area             | Status |
| ----- | ------------------------------------------------------------------------- | ---------------- | ------ |
| #1345 | [P0] Tabs de secoes mostram apenas numeros, nao titulo                    | Frontend/UX      | ✅     |
| #1352 | [P0] Estatisticas Admin retornam zeros (interface misalign)               | Backend/Admin    | ✅     |
| #1353 | [P0] Pagina Admin parcialmente em ingles - i18n quebrado                  | Frontend/i18n    | ✅     |
| #1355 | [P0] REGRESSAO: Export PDF ainda falha erro 500 - Nix detection           | Backend/Export   | ✅     |
| #1342 | [P0] Exportacao PDF falha com erro 500 - Chromium detection               | Backend/Export   | ✅     |
| #1341 | [P0] Usuario demo nao consegue criar novos ETPs - Erro 403                | Backend/Auth     | ✅     |
| #1328 | [P0] Conta demo sem templates - primeira impressão arruinada              | Deploy           | ✅     |
| #1329 | [P0] Textos sem acentuação em toda interface - aspecto amador             | Frontend         | ✅     |
| #1330 | [P0] Passo 5 do wizard inútil quando não há templates                     | Frontend         | ✅     |
| #1331 | [P0] Inconsistência: ETP mostra 100% mas 0 Concluídos no dashboard        | Backend/Frontend | ✅     |
| #1327 | [P0] Modal de boas-vindas aparece repetidamente a cada navegação          | Frontend         | ✅     |
| #1325 | [P0] Erro genérico ao criar ETP - usuário não sabe o que está errado      | Backend/Frontend | ✅     |
| #1332 | [P0] Botão Próximo no passo 6 dispara criação do ETP prematuramente       | Frontend         | ✅     |
| #1326 | [P0] **SECURITY** Dashboard mostra ETP de outro usuário - vazamento dados | Backend/Frontend | ✅     |
| #1318 | [P0] Tabs das seções fora de ordem numérica                               | Frontend         | ✅     |
| #1317 | [P0] Título do ETP não aparece no Editor                                  | Frontend         | ✅     |
| #1316 | [P0] Progresso mostra apenas "%" sem valor numérico                       | Frontend         | ✅     |
| #1314 | [P0] BLOQUEADOR: Salvar seção retorna erro 404                            | Frontend         | ✅     |
| #1315 | [P0] Exportar PDF retorna erro 404                                        | Frontend         | ✅     |
| #1313 | [P0] BLOQUEADOR: Criar novo ETP retorna erro 500                          | Frontend         | ✅     |
| #1304 | [P0] Erro ao salvar secao no ETP Editor                                   | Backend          | ✅     |
| #1303 | [P0] Erro ao clicar em 'Gerar Sugestao' no ETP Editor                     | Frontend         | ✅     |
| #1302 | [P0] Politica de Privacidade - UI mediocre e falta mobile                 | Frontend         | ✅     |
| #1301 | [P0] Termos de Uso - UI mediocre e falta responsividade                   | Frontend         | ✅     |
| #1300 | [P0] Textos sem acentuacao em toda UI                                     | Frontend         | ✅     |
| #1299 | [P0] System Admin nao ve botoes de gestao                                 | Frontend         | ✅     |
| #1298 | [P0] Link 'Manual do Usuario' retorna 404                                 | Frontend         | ✅     |

---

## Issues Abertas (77)

### P1 - High Priority (11 issues)

| #     | Issue                                                           |
| ----- | --------------------------------------------------------------- |
| #1191 | [E2E] Create dedicated staging environment for E2E tests        |
| #1187 | [E2E] Persistent 401 Unauthorized errors during test execution  |
| #1172 | [E2E] Fix Auth Session tests for Railway environment            |
| #1171 | [E2E] Fix Auth Login-Flow tests for Railway environment         |
| #1167 | [Assistente] Implementar chatbot para dúvidas (MVP Comercial)   |
| #1164 | [Dashboard] Adicionar métricas avançadas (MVP Comercial)        |
| #1163 | [Conformidade] Templates TCU/TCES (MVP Comercial)               |
| #1137 | [E2E] Epic: Fix all 73 failing E2E tests for Railway CI         |
| #1075 | [QA] Configurar load testing com 100+ requisições simultâneas   |
| #1074 | [QA] Implementar chaos engineering (Redis: ✅, API Timeout: ✅) |
| #1073 | [QA] Criar testes de integração com APIs governamentais reais   |

### P2 - Medium Priority (10 issues)

| #     | Issue                                                            |
| ----- | ---------------------------------------------------------------- |
| #1190 | [CI] Reduce E2E pipeline timeout from 90min to 20min target      |
| #1189 | [CI] Skip E2E tests for documentation-only PRs                   |
| #1168 | [Export] Integrar armazenamento em nuvem (S3)                    |
| #1166 | [Preços] Ajustar schedule para atualização semanal               |
| #1072 | [Observabilidade] Adicionar retry automático para emails         |
| #1071 | [Observabilidade] Garantir requestId em todos os logs            |
| #1070 | [Observabilidade] Enriquecer contexto em erros de extraction     |
| #1069 | [Gov-API] Implementar invalidação de cache baseada em eventos    |
| #1068 | [Gov-API] Otimizar configuração de retry para janelas manutenção |
| #1067 | [Gov-API] Implementar alerting automático para circuit breaker   |

### P3 - Low Priority (1 issue)

| #     | Issue                                          |
| ----- | ---------------------------------------------- |
| #1045 | docs(readme): Update coverage badges and dates |

---

## Milestones

| Milestone              | Issues | Prioridade GTM |
| ---------------------- | ------ | -------------- |
| MVP Comercial          | 23/28  | 82% (5 restam) |
| M1: Foundation         | 36/36  | ✅             |
| M2: CI/CD Pipeline     | 18/18  | ✅             |
| M3: Quality & Security | 61/61  | ✅             |
| M4: Refactoring & Perf | 45/45  | ✅             |
| M5: E2E & Docs         | 30/30  | ✅             |
| M6: Maintenance        | 85/85  | ✅             |
| M7: Multi-Tenancy B2G  | 6/6    | ✅             |
| M8: Dominios Instit.   | 24/24  | ✅             |
| M9: Export/Import      | 16/16  | ✅             |
| Go-Live B2G            | 14/14  | ✅             |

### Milestones Futuros (Expansão Estratégica)

> **Objetivo:** Expandir de gerador de ETP para plataforma completa de contratações públicas

| Milestone                      | Issues | Prioridade | Ticket Potencial      |
| ------------------------------ | ------ | ---------- | --------------------- |
| M10: Termo de Referência       | 0/7    | Alta       | +R$ 500/mês           |
| M11: Pesquisa de Preços Formal | 0/7    | Alta       | +R$ 500/mês           |
| M12: Compliance TCE            | 0/7    | Alta       | +R$ 1.000/mês premium |
| M13: Inteligência de Mercado   | 0/8    | Alta       | +R$ 1.500/mês premium |
| M14: Geração de Edital         | 0/7    | Média      | +R$ 500/mês           |
| M15: Gestão de Contratos       | 0/8    | Média      | +R$ 1.000/mês         |
| M16: Features Complementares   | 0/4    | Baixa      | Diferenciação         |

**Fluxo do Ciclo Completo:**

```
ETP → Termo de Referência → Pesquisa de Preços → Edital → Contrato
```

#### M10: Termo de Referência (#1247-#1253)

Geração automática de TR a partir do ETP aprovado.

- Entity TermoReferencia e relacionamentos
- Geração automática com IA
- Templates por categoria (Obras, TI, Serviços, Materiais)
- Editor frontend e export PDF/DOCX

#### M11: Pesquisa de Preços Formal (#1254-#1260)

Módulo estruturado conforme IN SEGES/ME nº 65/2021.

- Coleta automática multi-fonte (PNCP, SINAPI, SICRO, Atas RP)
- Mapa comparativo de preços
- Justificativa automática de metodologia
- Relatório formal de pesquisa

#### M12: Compliance TCE (#1261-#1267)

Validação automática contra critérios TCU/TCE.

- Mapeamento de critérios ALICE/SOFIA
- Engine de validação com score 0-100
- Selo de Conformidade visual
- Alertas em tempo real durante preenchimento

#### M13: Inteligência de Mercado (#1268-#1275)

Dados proprietários e analytics avançados.

- Preços reais de pregões (não tabelas)
- Benchmark regional por porte de órgão
- Alertas de sobrepreço vs mediana
- API monetizável para terceiros

#### M14: Geração de Edital (#1276-#1282)

Templates de edital integrados ao processo.

- Templates por modalidade (Pregão, Concorrência, Dispensa, Inexigibilidade)
- Geração automática a partir de ETP+TR+Pesquisa
- Validação de cláusulas obrigatórias

#### M15: Gestão de Contratos (#1283-#1290)

Fiscalização e execução contratual completa.

- Ciclo de vida do contrato
- Módulo de fiscalização (medições, ocorrências, atestes)
- Alertas de vencimento e aditivos
- Integração com Contratos Gov.br

#### M16: Features Complementares (#1291-#1294)

Oportunidades de mercado identificadas.

- IA similar ao ALICE/TCU para detectar irregularidades
- Suporte especial para MPEs (cotas, preferência)
- Integração com sistemas estaduais TCE
- White-label para grandes clientes

---

## Metricas

| Metrica           | Valor |
| ----------------- | ----- |
| Issues Totais     | 733   |
| Issues Abertas    | 76    |
| Issues Fechadas   | 657   |
| Progresso         | 90%   |
| Bugs P0 Abertos   | 1     |
| Backend Coverage  | 71%   |
| Frontend Coverage | 82%   |
| Backend Tests     | 2515  |
| Frontend Tests    | 1742  |
| Total Tests       | 4257  |

---

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Issues](https://github.com/CONFENGE/etp-express/issues)
