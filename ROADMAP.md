# ROADMAP - ETP Express

**Atualizado:** 2026-01-12 | **Progresso:** 691/746 (93%) | **Deploy:** LIVE

---

## Atualizações Recentes

| Data       | PR    | Tipo     | Descrição                                                         |
| ---------- | ----- | -------- | ----------------------------------------------------------------- |
| 2026-01-12 | #1422 | Deps     | Bump OpenTelemetry 0.208->0.209 (exporter-trace-otlp-http, sdk-node) ✅ |
| 2026-01-12 | #1421 | Feature  | Add automatic methodology justification generation (#1258) ✅ - **M11 progress 7/7** |
| 2026-01-12 | #1420 | Feature  | Add price comparison map generation (#1257) ✅ - **M11 progress 6/7** |
| 2026-01-12 | #1419 | Feature  | Add endpoint for multi-source price collection (#1415) ✅ - **M11 progress 5/7** |
| 2026-01-11 | #1418 | Feature  | Expand PNCP/Compras.gov price search with contract/pregão items (#1414) ✅ |
| 2026-01-11 | #1417 | Feature  | Implement Atas de Registro de Preços search with price extraction (#1413) ✅ |
| 2026-01-11 | #1411 | Feature  | Add PesquisaPrecos entity and module (#1255) ✅ - **M11 started** |
| 2026-01-11 | #1410 | Feature  | Add TR export to PDF/DOCX with official formatting (#1252) ✅ - **M10 COMPLETE** |
| 2026-01-11 | #1409 | Feature  | Implement TR Editor frontend (#1251) ✅ - M10 progress 4/6        |
| 2026-01-11 | #1408 | Feature  | Implement TR templates by category (#1250) ✅ - M10 progress 3/6  |
| 2026-01-11 | #1407 | Feature  | Implement automatic TR generation from ETP (#1249) ✅             |
| 2026-01-11 | #1406 | Feature  | Create TermoReferencia entity and module for M10 (#1248) ✅       |
| 2026-01-11 | #1405 | Test     | Add E2E tests and documentation for chatbot (#1398) ✅ **EPIC #1167 COMPLETE** |
| 2026-01-11 | #1404 | Feature  | Add proactive suggestions and field validation hints (#1397) ✅   |
| 2026-01-11 | #1403 | Feature  | Integrate ChatWidget into ETP Editor (#1396) ✅                   |
| 2026-01-11 | #1402 | Feature  | ChatWidget React components for ETP chatbot (#1395) ✅            |
| 2026-01-11 | #1401 | Feature  | AI chat completion with ETP context injection (#1394) ✅          |
| 2026-01-10 | #1400 | Feature  | Implement chat API endpoints with rate limiting (#1393) ✅        |
| 2026-01-10 | #1399 | Feature  | Add ChatMessage entity and Chat module structure (#1392) ✅       |
| 2026-01-10 | #1391 | Feature  | Add compliance scorecard component to ETP Editor (#1386) ✅       |
| 2026-01-10 | #1390 | Feature  | Add REST endpoints for compliance validation (#1385) ✅           |
| 2026-01-10 | #1389 | Feature  | Add TCU compliance checklist seeder (#1384) ✅                    |
| 2026-01-10 | #1388 | Feature  | Add ComplianceChecklist entity and validation service (#1383) ✅  |
| 2026-01-10 | #1387 | Docs     | TCU requirements research - compliance foundation (#1382) ✅      |
| 2026-01-10 | #1381 | Feature  | Add productivity ranking endpoint and component (#1367) ✅        |
| 2026-01-10 | #1380 | Feature  | Add period filter for dashboard metrics (#1366) ✅                |
| 2026-01-09 | #1379 | Fix      | Add E2E test domains cleanup endpoint (#1354) ✅                  |
| 2026-01-09 | #1378 | Fix      | Fix onboarding checklist not recognizing existing ETPs (#1373) ✅ |
| 2026-01-09 | #1377 | Fix      | Fix status badge missing for 'review' status ETPs (#1374) ✅      |
| 2026-01-09 | #1375 | Fix      | Fix ETP creation 400 error - remove invalid fields (#1371) ✅     |
| 2026-01-09 | #1370 | Feature  | Add status distribution chart to Dashboard (#1365) ✅             |
| 2026-01-09 | #1369 | Feature  | Add average completion time metric card (#1364) ✅                |
| 2026-01-09 | #1368 | Feature  | Add success rate metric card to Dashboard (#1363) ✅              |
| 2026-01-09 | #1362 | Fix      | Add Brazilian date format support to CreateETPWizard (#1347) ✅   |
| 2026-01-09 | #1361 | Fix      | Remove intrusive AI generation banner trigger (#1346) ✅          |
| 2026-01-09 | #1360 | Fix      | Show ETP author name in Dashboard for Admin (#1351) ✅            |
| 2026-01-09 | #1359 | Fix      | Sync progress between ETP list and detail views (#1344) ✅        |
| 2026-01-09 | #1358 | Fix      | Show section titles in ETP Editor tabs (#1345) ✅                 |
| 2026-01-09 | #1357 | Fix      | Fix Admin statistics zeros + translate to Portuguese (#1352) ✅   |
| 2026-01-08 | #1356 | Fix      | Improve Chromium detection for Nix/Nixpacks (#1355) ✅            |
| 2026-01-08 | -     | Audit    | Admin happy path: 9 bugs (4 novos P0 #1351-#1355) ⚠️              |
| 2026-01-08 | #1349 | Fix      | Robust Chromium detection for PDF export (#1342) ✅               |
| 2026-01-08 | #1348 | Fix      | Fix demo user 403 error - self-healing demo org (#1341) ✅        |
| 2026-01-08 | -     | Audit    | Consultor test: confirmados 7 P0 bugs (#1341-#1347) ⚠️            |
| 2026-01-08 | -     | Audit    | Happy path test: 7 P0 bugs found (#1341-#1347) ⚠️                 |
| 2026-01-08 | #1339 | Fix      | Corrigir acentuação em textos da interface (#1329) ✅             |
| 2026-01-08 | #1338 | Fix      | Skip Campos Específicos step when no template (#1330) ✅          |
| 2026-01-08 | #1337 | Fix      | Auto-sync ETP status with completion percentage (#1331) ✅        |
| 2026-01-08 | #1336 | Fix      | Persist welcome modal dismissal to localStorage (#1327) ✅        |
| 2026-01-08 | #1335 | Fix      | Show detailed validation errors on ETP creation (#1325) ✅        |
| 2026-01-08 | #1334 | Fix      | Prevent wizard premature submission via Enter key (#1332) ✅      |
| 2026-01-08 | #1333 | Security | **CRITICAL** Fix dashboard data leakage (#1326) ✅                |
| 2026-01-08 | #1324 | Fix      | Sort section tabs by number (#1318) ✅                            |
| 2026-01-08 | #1323 | Fix      | Show fallback title when ETP title is empty (#1317) ✅            |
| 2026-01-08 | #1322 | Fix      | Map completionPercentage to progress for display (#1316) ✅       |
| 2026-01-08 | #1321 | Fix      | Fix save section 404 - use PATCH /sections/:id (#1314) ✅         |
| 2026-01-08 | #1320 | Fix      | Fix PDF export 404 error - P0 BLOQUEADOR (#1315) ✅               |
| 2026-01-08 | #1319 | Fix      | CreateETPPage for /etps/new route - P0 BLOQUEADOR (#1313) ✅      |
| 2026-01-08 | -     | Audit    | Happy path simulation: 6 P0 bugs found (#1313-#1318) ⚠️           |
| 2026-01-08 | #1312 | Fix      | Redesign Politica de Privacidade with responsive UI (#1302) ✅    |
| 2026-01-07 | #1310 | Fix      | Redesign Termos de Uso page with responsive UI (#1301) ✅         |
| 2026-01-07 | #1309 | Fix      | Corrigir acentuação em toda UI (#1300) ✅                         |
| 2026-01-07 | #1308 | Fix      | Fix 'Gerar Sugestao' button error (#1303) ✅                      |
| 2026-01-07 | #1307 | Fix      | Correct API route for section updates (#1304) ✅                  |
| 2026-01-07 | #1306 | Fix      | Add UserManual page and fix 404 link (#1298) ✅                   |
| 2026-01-07 | #1305 | Fix      | Add role-based admin navigation links (#1299) ✅                  |
| 2026-01-07 | -     | Audit    | Sync ROADMAP: add P0 bugs, close epics #1158/#1161 ✅             |
| 2026-01-07 | #1296 | Test     | Add E2E tests for template-based ETP creation (#1241) ✅          |
| 2026-01-07 | #1295 | Feature  | Implement dynamic fields based on template type (#1240) ✅        |
| 2026-01-07 | #1246 | Feature  | Integrate TemplateSelector into CreateETPWizard (#1239) ✅        |
| 2026-01-07 | #1245 | Feature  | Add TemplateSelector frontend component (#1238) ✅                |
| 2026-01-07 | #1244 | Test     | Add E2E integration tests for templates API endpoints (#1237)     |
| 2026-01-07 | #1243 | Feature  | Seed 4 base ETP templates (Obras, TI, Serviços, Materiais) ✅     |
| 2026-01-07 | #1242 | Feature  | Merge EtpTemplate entity and module structure (#1235) ✅          |
| 2026-01-06 | #1242 | Feature  | Add EtpTemplate entity and module structure (#1235)               |
| 2026-01-06 | -     | Planning | Desmembrar #1161 em 7 sub-issues atômicas (#1235-#1241)           |
| 2026-01-06 | #1234 | Test     | Add E2E tests for CreateETPWizard - Completes Epic #1158          |
| 2026-01-06 | #1233 | Feature  | Add multi-step CreateETPWizard component - Epic #1158 #1227       |
| 2026-01-06 | #1232 | Feature  | Add estimativa de custos fields - Epic #1158 sub-issue #1226      |
| 2026-01-06 | #1231 | Feature  | Add requisitos e riscos fields - Epic #1158 sub-issue #1225       |
| 2026-01-06 | #1230 | Feature  | Add objeto/justificativa fields - Epic #1158 sub-issue #1224      |
| 2026-01-06 | #1229 | Feature  | Add ETP identification fields - Epic #1158 sub-issue #1223        |
| 2026-01-06 | #1222 | Feature  | Persist SINAPI/SICRO gov prices to PostgreSQL (#1165)             |
| 2026-01-06 | #1221 | Feature  | Complete onboarding wizard with checklist (#1213)                 |

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
| #1167 | [Assistente] Implementar chatbot para dúvidas | ✅     |
|       | ↳ #1392 ChatMessage entity e módulo backend   | ✅     |
|       | ↳ #1393 API endpoints com rate limiting       | ✅     |
|       | ↳ #1394 Integração AI com contexto ETP        | ✅     |
|       | ↳ #1395 ChatWidget componente React           | ✅     |
|       | ↳ #1396 Integração no ETP Editor              | ✅     |
|       | ↳ #1397 Sugestões proativas e hints           | ✅     |
|       | ↳ #1398 Testes E2E e documentação             | ✅     |
| #1164 | [Dashboard] Adicionar métricas avançadas      | ✅     |
|       | ↳ #1363 Taxa de sucesso de ETPs               | ✅     |
|       | ↳ #1364 Métrica de tempo médio                | ✅     |
|       | ↳ #1365 Gráfico distribuição por status       | ✅     |
|       | ↳ #1366 Filtro por período                    | ✅     |
|       | ↳ #1367 Ranking de produtividade (Admin)      | ✅     |

### Fase 3 - Credibilidade Institucional (P1)

| #     | Issue                                                 | Status |
| ----- | ----------------------------------------------------- | ------ |
| #1163 | [Conformidade] Templates baseados em modelos TCU/TCES | ✅     |
|       | ↳ #1382 Pesquisa requisitos TCU                       | ✅     |
|       | ↳ #1383 Entity ComplianceChecklist + ValidationService| ✅     |
|       | ↳ #1384 Seed checklists TCU                           | ✅     |
|       | ↳ #1385 Endpoints REST validação                      | ✅     |
|       | ↳ #1386 Componente indicador conformidade             | ✅     |
| #1165 | [Preços] Persistir histórico SINAPI/SICRO em banco    | ✅     |

### Fase 4 - Operacional (P2)

| #     | Issue                                              | Status |
| ----- | -------------------------------------------------- | ------ |
| #1166 | [Preços] Ajustar schedule para atualização semanal | 🔴     |
| #1168 | [Export] Integrar armazenamento em nuvem (S3)      | 🔴     |

**Progresso MVP Comercial:** 33/35 (94%) - Epics #1158, #1161, #1163, #1164 e #1167 COMPLETAS ✅ | Restam: #1166, #1168

---

## Bugs Criticos P0 - 0 RESTANTES ✅

> **STATUS:** Todos os bugs P0 foram resolvidos! #1373 resolvido via PR #1378.

### Bugs P0 Abertos (2026-01-09)

Nenhum bug P0 aberto! 🎉

### Bugs P0 Resolvidos (2026-01-07 a 2026-01-09)

| #     | Issue                                                                     | Area             | Status |
| ----- | ------------------------------------------------------------------------- | ---------------- | ------ |
| #1373 | [P0] Onboarding checklist não reconhece ETPs existentes                   | Frontend/UX      | ✅     |
| #1374 | [P0] Badge de status ausente em alguns cards de ETP                       | Frontend/UX      | ✅     |
| #1372 | [P0] Botão 'Gerar Todas Seções' exibe funcionalidade indisponível         | Frontend/UX      | ✅     |
| #1371 | [P0] BLOQUEANTE: Criação de novo ETP via wizard falha com erro 400        | Backend/Frontend | ✅     |
| #1355 | [P0] REGRESSAO: Export PDF erro 500 - Nix detection                       | Backend/Export   | ✅     |
| #1353 | [P0] Pagina Admin parcialmente em ingles - i18n quebrado                  | Frontend/i18n    | ✅     |
| #1352 | [P0] Estatisticas Admin retornam zeros                                    | Backend/Admin    | ✅     |
| #1351 | [P0] Dashboard Admin mostra ETPs sem identificar autoria                  | Frontend/UX      | ✅     |
| #1347 | [P0] Campo de data aceita apenas formato ISO, nao brasileiro              | Frontend/UX      | ✅     |
| #1346 | [P0] Banner de vendas intrusivo durante uso do sistema demo               | Frontend/UX      | ✅     |
| #1345 | [P0] Tabs de secoes mostram apenas numeros, nao titulo                    | Frontend/UX      | ✅     |
| #1344 | [P0] Inconsistencia no indicador de progresso lista vs detalhe            | Frontend         | ✅     |
| #1343 | [P0] Templates de ETP nao disponiveis no wizard de criacao                | Backend/Seed     | ✅     |
| #1342 | [P0] Exportacao PDF falha com erro 500                                    | Backend/Export   | ✅     |
| #1341 | [P0] Usuario demo nao consegue criar novos ETPs - Erro 403                | Backend/Auth     | ✅     |
| #1332 | [P0] Botão Próximo no passo 6 dispara criação do ETP prematuramente       | Frontend         | ✅     |
| #1331 | [P0] Inconsistência: ETP mostra 100% mas 0 Concluídos no dashboard        | Backend/Frontend | ✅     |
| #1330 | [P0] Passo 5 do wizard inútil quando não há templates                     | Frontend         | ✅     |
| #1329 | [P0] Textos sem acentuação em toda interface - aspecto amador             | Frontend         | ✅     |
| #1328 | [P0] Conta demo sem templates - primeira impressão arruinada              | Deploy           | ✅     |
| #1327 | [P0] Modal de boas-vindas aparece repetidamente a cada navegação          | Frontend         | ✅     |
| #1326 | [P0] **SECURITY** Dashboard mostra ETP de outro usuário - vazamento dados | Backend/Frontend | ✅     |
| #1325 | [P0] Erro genérico ao criar ETP - usuário não sabe o que está errado      | Backend/Frontend | ✅     |
| #1318 | [P0] Tabs das seções fora de ordem numérica                               | Frontend         | ✅     |
| #1317 | [P0] Título do ETP não aparece no Editor                                  | Frontend         | ✅     |
| #1316 | [P0] Progresso mostra apenas "%" sem valor numérico                       | Frontend         | ✅     |
| #1315 | [P0] Exportar PDF retorna erro 404                                        | Frontend         | ✅     |
| #1314 | [P0] BLOQUEADOR: Salvar seção retorna erro 404                            | Frontend         | ✅     |
| #1313 | [P0] BLOQUEADOR: Criar novo ETP retorna erro 500                          | Frontend         | ✅     |
| #1304 | [P0] Erro ao salvar secao no ETP Editor                                   | Backend          | ✅     |
| #1303 | [P0] Erro ao clicar em 'Gerar Sugestao' no ETP Editor                     | Frontend         | ✅     |
| #1302 | [P0] Politica de Privacidade - UI mediocre e falta mobile                 | Frontend         | ✅     |
| #1301 | [P0] Termos de Uso - UI mediocre e falta responsividade                   | Frontend         | ✅     |
| #1300 | [P0] Textos sem acentuacao em toda UI                                     | Frontend         | ✅     |
| #1299 | [P0] System Admin nao ve botoes de gestao                                 | Frontend         | ✅     |
| #1298 | [P0] Link 'Manual do Usuario' retorna 404                                 | Frontend         | ✅     |

---

## Issues Abertas (72)

### P1 - High Priority (8 issues)

| #     | Issue                                                           |
| ----- | --------------------------------------------------------------- |
| #1191 | [E2E] Create dedicated staging environment for E2E tests        |
| #1187 | [E2E] Persistent 401 Unauthorized errors during test execution  |
| #1172 | [E2E] Fix Auth Session tests for Railway environment            |
| #1171 | [E2E] Fix Auth Login-Flow tests for Railway environment         |
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
| MVP Comercial          | 34/35  | 97% (1 resta)  |
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
| M10: Termo de Referência       | 6/6    | ✅         | +R$ 500/mês           |
| M11: Pesquisa de Preços Formal | 7/7    | ✅         | +R$ 500/mês           |
| M12: Compliance TCE            | 0/7    | Alta       | +R$ 1.000/mês premium |
| M13: Inteligência de Mercado   | 0/8    | Alta       | +R$ 1.500/mês premium |
| M14: Geração de Edital         | 0/7    | Média      | +R$ 500/mês           |
| M15: Gestão de Contratos       | 0/8    | Média      | +R$ 1.000/mês         |
| M16: Features Complementares   | 0/4    | Baixa      | Diferenciação         |

**Fluxo do Ciclo Completo:**

```
ETP → Termo de Referência → Pesquisa de Preços → Edital → Contrato
```

#### M10: Termo de Referência (#1247-#1253) ✅ COMPLETE

Geração automática de TR a partir do ETP aprovado.

| #     | Issue                                         | Status |
| ----- | --------------------------------------------- | ------ |
| #1247 | [TR] Modulo de Termo de Referencia - EPIC     | ✅     |
|       | ↳ #1248 Entity TermoReferencia e módulo       | ✅     |
|       | ↳ #1249 Geração automática com IA             | ✅     |
|       | ↳ #1250 Templates por categoria               | ✅     |
|       | ↳ #1251 Editor TR no frontend                 | ✅     |
|       | ↳ #1252 Export TR em PDF/DOCX                 | ✅     |

#### M11: Pesquisa de Preços Formal (#1254-#1260) ✅ COMPLETE

Módulo estruturado conforme IN SEGES/ME nº 65/2021.

| #     | Issue                                         | Status |
| ----- | --------------------------------------------- | ------ |
| #1254 | [Pesquisa] Modulo de Pesquisa de Precos - EPIC| ✅     |
|       | ↳ #1255 Entity PesquisaPrecos com metodologia | ✅     |
|       | ↳ #1256 Coleta automática multi-fonte         | ✅     |
|       |   ↳ #1412 Integrar PriceAggregation           | ✅     |
|       |   ↳ #1413 Busca em Atas de Registro de Preços | ✅     |
|       |   ↳ #1414 Expandir busca PNCP/Compras.gov     | ✅     |
|       |   ↳ #1415 Endpoint coleta multi-fonte         | ✅     |
|       | ↳ #1257 Mapa comparativo de preços            | ✅     |
|       | ↳ #1258 Justificativa automática metodologia  | ✅     |
|       | ↳ #1259 Interface de pesquisa no frontend     | ✅     |
|       | ↳ #1260 Export relatório pesquisa PDF         | ✅     |

Features:
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
| Issues Totais     | 746   |
| Issues Abertas    | 55    |
| Issues Fechadas   | 691   |
| Progresso         | 93%   |
| Bugs P0 Abertos   | 0     |
| Backend Coverage  | 71%   |
| Frontend Coverage | 82%   |
| Backend Tests     | 2935  |
| Frontend Tests    | 2013  |
| Total Tests       | 4948  |

---

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Issues](https://github.com/CONFENGE/etp-express/issues)
