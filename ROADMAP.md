# ROADMAP - ETP Express

**Atualizado:** 2026-01-17 | **Progresso:** 1498/1555 (96.3%) | **Deploy:** LIVE

---

## Atualizações Recentes

| Data       | PR    | Tipo     | Descrição                                                         |
| ---------- | ----- | -------- | ----------------------------------------------------------------- |
| 2026-01-17 | #1560 | Feature  | [#1522] Implement Stylelint for design tokens enforcement ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1559 | Feature  | [#1554] PoC Lei 14.133/2021 com tree search validation ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1558 | Feature  | [#1553] Implement TreeSearchService with LLM reasoning ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1557 | Feature  | [#1552] Implement TreeBuilderService with Python integration ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1556 | Feature  | [#1551] Create DocumentTree entity and migrations for PageIndex ✅ - **Score 97.5/100 - Merged** |
| 2026-01-17 | #1555 | Feature  | [#1550] Create PageIndex module structure - stub implementations ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1549 | Docs     | [#1521] Create .design-engineer/system.md with tokens and design direction ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1548 | Fix      | [#1534] Fix Date serialization in Compliance types ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1547 | Fix      | [#1533] Add currentVersion to TermoReferencia type ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1546 | Fix      | [#1532] Add LGPD/audit fields to User type ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1537 | Fix      | [#1531] Fix indicadoresDesempenho type parity (string → string[]) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | -     | Planning | Create M17-PageIndex milestone + 8 issues (#1538-#1545) - RAG reasoning-based integration |
| 2026-01-17 | #1536 | Fix      | [#1530] Fix responsavelTecnico flat→nested structure parity ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1535 | Fix      | [#1529] Sync Section type with EtpSection entity ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-17 | #1520 | Feature  | [#1269] Add contract price collector for M13: Market Intelligence ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-16 | -     | Audit    | Frontend Design Audit: 14 P0 issues created (#1521-#1534) - 8 design system + 6 parity bugs |
| 2026-01-16 | #1519 | Feature  | [#1253] Implement TR versioning and history ✅ - **M10 COMPLETE 7/7** |
| 2026-01-16 | #1518 | Fix      | [#1517] Fix backend timeout - prevent startup sync from blocking initialization ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-16 | #1516 | Feature  | [#1166] Add weekly PNCP check and cache validation jobs ✅ - **Score 100/100 - Merged (ZAP infra issue #1517)** |
| 2026-01-16 | #1515 | Feature  | [#1266] Real-time compliance alerts during ETP editing ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-16 | #1514 | Feature  | [#1264] Add compliance report generation with PDF export ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-16 | -     | Audit    | ROADMAP sync: close #1259 (M11 EPIC complete), update metrics 48 open / 755 closed / 94.0% |
| 2026-01-16 | #1513 | Feature  | [#1509] Implement Step 5 - Review Results for PesquisaPrecos wizard (#1509) ✅ - **Score 100/100 - Auto-merged - M11 Interface COMPLETE** |
| 2026-01-16 | #1512 | Feature  | [#1508] Implement Steps 3-4: Seleção de Fontes e Execução da Pesquisa (#1508) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-16 | #1511 | Feature  | [#1507] Implement Steps 1-2 for PesquisaPrecos wizard (#1507) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-16 | #1510 | Feature  | [#1506] Add Pesquisa de Precos wizard structure (#1506) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-15 | -     | Audit    | ROADMAP sync: close #1429/#1430 (HIG), #1263 (Compliance), add #1506-#1509 (Pesquisa wizard) |
| 2026-01-15 | #1505 | Feature  | [#1260] Add PDF/JSON export for Pesquisa de Precos (#1260) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-15 | #1504 | Feature  | [#1265] Add ComplianceBadge component for visual compliance status (#1265) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-15 | #1503 | Feature  | [#1191] Create dedicated staging environment for E2E tests (#1191) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-15 | #1502 | Test     | [#1494] Implementar suporte a prefers-reduced-motion global (#1494) ✅ - **Score 100/100 - Auto-merged - EPIC #1430 COMPLETE (6/6)** |
| 2026-01-15 | #1501 | Feature  | [#1493] Implementar animações em Form Inputs - Apple HIG Motion Design (#1493) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-15 | #1500 | Feature  | [#1492] Implement Modal and Dropdown animations - Apple HIG Motion Design (#1492) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-15 | #1499 | Feature  | [#1491] Implement card micro-interactions Apple HIG (#1491) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-15 | #1496 | Test     | [#1487] Implement Lighthouse CI with Railway Preview Deployments (#1487) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-15 | #1498 | Feature  | [#1490] Implement button micro-interactions Apple HIG (#1490) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1495 | Feature  | [#1489] Add Apple HIG motion design tokens (#1489) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1486 | Test     | [#1480] WCAG 2.1 AA Audit & Documentation - Apple HIG Accessibility 6/6 COMPLETE (#1480) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1485 | Feature  | [#1479] Implement color accessibility - WCAG 2.1 AA compliance (#1479) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1484 | Feature  | [#1478] Implement focus management and keyboard navigation (#1478) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1483 | Feature  | [#1477] Implement screen reader support (ARIA) (#1477) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1482 | Feature  | [#1476] Implement touch target accessibility audit - WCAG 2.5.5 & Apple HIG (#1476) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1481 | Feature  | [#1475] Implement WCAG AA Contrast for Liquid Glass (#1475) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1474 | Feature  | [#1468] Aplicar spacing tokens a Navigation, Modals e Lists (#1468) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1473 | Feature  | [#1467] Apply spacing tokens to Card grids and Form layouts (#1467) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1472 | Feature  | [#1466] Apply Apple HIG spacing tokens to page layouts (#1466) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1471 | Feature  | [#1465] Implement safe areas for notch/home indicator - Apple HIG Layout (#1465) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-14 | #1470 | Feature  | [#1464] Implement responsive 12-column grid system - Apple HIG Layout (#1464) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-13 | #1469 | Feature  | [#1463] Add Apple HIG spacing tokens - Layout sub-issue [1/6] (#1463) ✅ |
| 2026-01-13 | #1462 | Feature  | [#1428] Implementar Sistema de Cores Apple HIG (Paleta Semântica + Contraste) (#1428) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-13 | #1461 | Feature  | [#1427] Implementar Tipografia Apple HIG (San Francisco + Escala Dinâmica) (#1427) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-13 | #1460 | Feature  | Apply Liquid Glass to Navigation and Sidebar (#1436) ✅ - **Score 100/100 - Liquid Glass Design System 6/6 COMPLETE** |
| 2026-01-13 | #1459 | Feature  | Handle blocked demo user state in dashboard (#1446) ✅ - **Score 100/100 - Demo User Management COMPLETE** |
| 2026-01-13 | #1458 | Feature  | Apply Liquid Glass to Tooltips (#1437) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-13 | #1457 | Feature  | Apply Liquid Glass to Modals and Dialogs (#1435) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-13 | #1456 | Feature  | Apply Liquid Glass to all Card components (#1434) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-13 | #1455 | Feature  | Create GlassSurface base component for Liquid Glass Design System (#1433) ✅ - **Score 100/100 - Auto-merged** |
| 2026-01-13 | #1454 | Feature  | Handle blocked demo user state in dashboard (#1446) ✅ - **Demo User Management COMPLETE** |
| 2026-01-13 | #1452 | Feature  | Add demo user management to admin store (#1444) ✅                |
| 2026-01-13 | #1451 | Feature  | Allow blocked demo users to login in read-only mode (#1443) ✅    |
| 2026-01-13 | #1450 | Feature  | Implement DemoUserEtpLimitGuard for ETP creation (#1442) ✅       |
| 2026-01-13 | #1449 | Feature  | Add demo user management endpoints to system-admin (#1441) ✅     |
| 2026-01-13 | #1448 | Feature  | Implement DemoUserService for demo account management (#1440) ✅  |
| 2026-01-12 | #1447 | Feature  | Add etpLimitCount field to User entity for demo users (#1439) ✅  |
| 2026-01-12 | -     | Planning | Create 8 P0 issues for Demo User Management System (#1439-#1446)  |
| 2026-01-12 | #1438 | Feature  | Add Liquid Glass design tokens - Apple HIG 2025 (#1432) ✅        |
| 2026-01-12 | #1425 | Deps     | Remove deprecated @types/nock package (nock v14+ ships own types) ✅ |
| 2026-01-12 | -     | Perf     | Optimize Playwright tests: sharding, storage state, networkidle removal |
| 2026-01-12 | -     | Audit    | ROADMAP sync: close 5 EPICs (#1163,#1164,#1167,#1247,#1254), fix metrics |
| 2026-01-12 | -     | Planning | Create 6 P0 issues for Apple HIG Design System compliance (#1426-#1431) |
| 2026-01-12 | #1424 | Feature  | Add TCU audit criteria mapping for compliance validation (#1262) ✅ - **M12 started 1/7** |
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
| #1166 | [Preços] Ajustar schedule para atualização semanal | ✅     |
| #1168 | [Export] Integrar armazenamento em nuvem (S3)      | 🔴     |

**Progresso MVP Comercial:** 44/45 (98%) - Epics #1158, #1161, #1163, #1164, #1166 e #1167 COMPLETAS ✅ | Restam: #1168

---

## Bugs Criticos P0 - 0 RESTANTES ✅

> **STATUS:** Todos os bugs de paridade backend/frontend resolvidos!

### Bugs P0 Resolvidos (2026-01-17) - Paridade Backend/Frontend

| #     | Issue                                                    | Severidade | Status |
| ----- | -------------------------------------------------------- | ---------- | ------ |
| #1534 | Implementar serialização Date em Compliance types        | MÉDIA      | ✅     |

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

## Design System Apple HIG - 12 Issues P0 🎨

> **Objetivo:** Adequar frontend às diretrizes Apple Human Interface Guidelines 2025

### Apple HIG Compliance (P0)

| #     | Issue                                                    | Área        | Status |
| ----- | -------------------------------------------------------- | ----------- | ------ |
| #1426 | Implementar Liquid Glass Design System                   | UI/UX       | ✅     |
|       | ↳ #1432 Criar design tokens Liquid Glass                 | Tokens      | ✅     |
|       | ↳ #1433 Criar componente base GlassSurface               | Component   | ✅     |
|       | ↳ #1434 Aplicar Liquid Glass aos Cards                   | Component   | ✅     |
|       | ↳ #1435 Aplicar Liquid Glass a Modals e Dialogs          | Component   | ✅     |
|       | ↳ #1436 Aplicar Liquid Glass a Navigation e Sidebar      | Component   | ✅     |
|       | ↳ #1437 Aplicar Liquid Glass a Tooltips                  | Component   | ✅     |
| #1427 | Implementar Tipografia Apple HIG (San Francisco)         | Typography  | ✅     |
| #1428 | Implementar Sistema de Cores Apple HIG                   | Colors      | ✅     |
| #1429 | Implementar Layout e Espaçamento Apple HIG               | Layout      | ✅     |
| #1430 | Implementar Micro-interações e Animações Apple HIG       | Motion      | ✅     |
|       | ↳ #1489 Criar design tokens Motion (easing + durations)  | Tokens      | ✅     |
|       | ↳ #1490 Implementar micro-interações em Buttons          | Component   | ✅     |
|       | ↳ #1491 Implementar micro-interações em Cards            | Component   | ✅     |
|       | ↳ #1492 Implementar animações em Modals/Dropdowns        | Component   | ✅     |
|       | ↳ #1493 Implementar animações em Form Inputs             | Component   | ✅     |
|       | ↳ #1494 Implementar reduced motion global                | A11y        | ✅     |
| #1431 | Implementar Acessibilidade Apple HIG (WCAG 2.1 AA)       | A11y        | ✅     |
|       | ↳ #1475 Contraste WCAG AA com Liquid Glass               | Contrast    | ✅     |
|       | ↳ #1476 Touch targets >= 44x44px                         | Touch       | ✅     |
|       | ↳ #1477 Screen reader support (ARIA)                     | ARIA        | ✅     |
|       | ↳ #1478 Focus management e keyboard navigation           | Focus       | ✅     |
|       | ↳ #1479 Color accessibility (não usar cor único indicador)| Color      | ✅     |
|       | ↳ #1480 Testes WCAG e documentação                       | Tests       | ✅     |

**Progresso Design System:** 24/24 (100%) ✅ COMPLETE

---

## Frontend Design Audit - 14 Issues P0 🎨

> **Objetivo:** Adequar frontend às diretrizes dos repositórios de referência (Claude Design Engineer + Claude Code Frontend Design Plugin) e corrigir bugs de paridade backend/frontend
> **Referências:** [claude-design-engineer](https://github.com/Dammyjay93/claude-design-engineer), [claude-code frontend-design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design)

### Design System Compliance (Labels: `P0`, `frontend`, `enhancement`)

| #     | Issue                                                    | Área        | Status |
| ----- | -------------------------------------------------------- | ----------- | ------ |
| #1521 | Criar .design-engineer/system.md com tokens e direção    | Foundation  | ✅     |
| #1522 | Implementar ESLint/Stylelint para enforcement de tokens  | Tooling     | ✅     |
| #1523 | Documentar direção "Sophistication & Trust"              | Docs        | 🔴     |
| #1524 | Unificar hierarquia de Card/Surface components           | Components  | 🔴     |
| #1525 | Adicionar skeleton states faltantes em todas as páginas  | UX          | 🔴     |
| #1526 | Padronizar EmptyState em todas as listas e grids         | UX          | 🔴     |
| #1527 | Auditar e adicionar aria-labels em todos icon buttons    | A11y        | 🔴     |
| #1528 | Padronizar focus ring styles em todos componentes        | A11y        | 🔴     |

### Backend/Frontend Parity Bugs (Labels: `P0`, `bug`, `parity`)

| #     | Issue                                                    | Severidade | Status |
| ----- | -------------------------------------------------------- | ---------- | ------ |
| #1529 | Sincronizar Section type com EtpSection entity           | CRÍTICO    | ✅     |
| #1530 | Corrigir estrutura responsavelTecnico (flat → nested)    | CRÍTICO    | ✅     |
| #1531 | Corrigir tipo indicadoresDesempenho (string → string[])  | CRÍTICO    | ✅     |
| #1532 | Adicionar campos LGPD/audit no User type                 | ALTA       | ✅     |
| #1533 | Adicionar currentVersion no TermoReferencia type         | ALTA       | ✅     |
| #1534 | Implementar serialização Date em Compliance types        | MÉDIA      | ✅     |

**Progresso Frontend Audit:** 8/14 (57%) 🟡

### Principais Diretrizes Apple HIG 2025

1. **Liquid Glass**: Novo sistema de design com translucência, profundidade e responsividade fluida
2. **Tipografia**: San Francisco mais bold, alinhada à esquerda, tamanho base 17pt
3. **Cores**: Paleta refinada com melhor diferenciação de matiz, harmonia com Liquid Glass
4. **Layout**: Whitespace generoso, grid proporcional, hierarquia clara
5. **Motion**: Animações naturais, feedback tátil, transições fluidas
6. **Acessibilidade**: VoiceOver, Dynamic Type, contraste WCAG AA

---

## Demo User Management System - 8 Issues P0 🎯

> **Objetivo:** Permitir System Admin criar contas demo para testadores convidados

### Funcionalidades

- System Admin cria conta demo informando email real do testador
- Sistema gera senha aleatória automaticamente
- Limite de 3 ETPs por usuário demo
- Sem expiração temporal
- Após atingir limite: conta bloqueada (read-only para ETPs existentes)
- Tenancy: usuários demo na organização demo existente

### Issues P0 - Demo User Management

| #     | Issue                                                    | Área        | Status |
| ----- | -------------------------------------------------------- | ----------- | ------ |
| #1439 | Add etpLimitCount field to User entity                   | Backend/DB  | ✅     |
| #1440 | Implement DemoUserService for demo account management    | Backend     | ✅     |
| #1441 | Add demo user management endpoints to system-admin       | Backend/API | ✅     |
| #1442 | Implement DemoUserEtpLimitGuard for ETP creation         | Backend/Sec | ✅     |
| #1443 | Allow blocked demo users to login in read-only mode      | Backend/Auth| ✅     |
| #1444 | Add demo user management to admin store                  | Frontend    | ✅     |
| #1445 | Create Demo Users management page for system admin       | Frontend/UI | ✅     |
| #1446 | Handle blocked demo user state in dashboard              | Frontend/UX | ✅     |

**Progresso Demo Users:** 8/8 (100%) - ✅ EPIC COMPLETE

---

## Issues Abertas (61)

### P0 - M17 PageIndex Integration (13 issues) 🔵 NEW

> Integração do framework PageIndex para RAG reasoning-based. Ver seção "M17: PageIndex RAG" abaixo para detalhes.

| #     | Issue                                                    | Prioridade |
| ----- | -------------------------------------------------------- | ---------- |
| #1538 | Criar módulo PageIndex para indexação hierárquica        | P0         |
|       | ↳ #1550 Setup infraestrutura módulo - estrutura NestJS   | P0         |
|       | ↳ #1551 Criar DocumentTree entity e migrations           | P0         |
|       | ↳ #1552 Implementar TreeBuilderService com Python        | P0         |
|       | ↳ #1553 Implementar TreeSearchService com LLM reasoning  | P0         |
|       | ↳ #1554 PoC PageIndex com Lei 14.133/2021                | P0         |
| #1539 | Indexar catálogo SINAPI completo com PageIndex           | P0         |
| #1540 | Indexar jurisprudências TCE-SP e TCU com PageIndex       | P0         |
| #1541 | Integrar PageIndex no Anti-Hallucination Agent           | P1         |
| #1542 | Implementar Hybrid RAG - Embeddings + PageIndex          | P1         |
| #1543 | Document Extraction com tree structure                   | P2         |
| #1544 | Chat contextualizado com PageIndex tree search           | P2         |
| #1545 | Market Intelligence com extração estruturada de editais  | P3         |

### P0 - Frontend Design Audit (14 issues) 🔴

> Auditoria de design frontend baseada nos repositórios de referência Claude Design Engineer e Claude Code Frontend Design Plugin. Inclui 8 issues de compliance com design system e 6 bugs críticos de paridade backend/frontend.

Ver seção "Frontend Design Audit" acima para detalhes.

### P0 - Apple HIG Design System ✅ COMPLETE

> Todos os 6 EPICs do Design System Apple HIG foram concluídos em 2026-01-15.

### P1 - High Priority (6 issues)

| #     | Issue                                                           |
| ----- | --------------------------------------------------------------- |
| #1172 | [E2E] Fix Auth Session tests for Railway environment            |
| #1171 | [E2E] Fix Auth Login-Flow tests for Railway environment         |
| #1137 | [E2E] Epic: Fix all 73 failing E2E tests for Railway CI         |
| #1075 | [QA] Configurar load testing com 100+ requisições simultâneas   |
| #1074 | [QA] Implementar chaos engineering (Redis: ✅, API Timeout: ✅) |
| #1073 | [QA] Criar testes de integração com APIs governamentais reais   |

### P2 - Medium Priority (9 issues)

| #     | Issue                                                            |
| ----- | ---------------------------------------------------------------- |
| #1190 | [CI] Reduce E2E pipeline timeout from 90min to 20min target      |
| #1189 | [CI] Skip E2E tests for documentation-only PRs                   |
| #1168 | [Export] Integrar armazenamento em nuvem (S3)                    |
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
| MVP Comercial          | 44/45  | 98% (1 resta)  |
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
| M10: Termo de Referência       | 7/7    | 100% ✅    | +R$ 500/mês           |
| M11: Pesquisa de Preços Formal | 21/21  | 100% ✅    | +R$ 500/mês           |
| M12: Compliance TCE            | 7/7    | 100% ✅    | +R$ 1.000/mês premium |
| M13: Inteligência de Mercado   | 1/8    | 13% 🟡     | +R$ 1.500/mês premium |
| M14: Geração de Edital         | 0/7    | Média      | +R$ 500/mês           |
| M15: Gestão de Contratos       | 0/8    | Média      | +R$ 1.000/mês         |
| M16: Features Complementares   | 0/4    | Baixa      | Diferenciação         |
| M17: PageIndex RAG             | 0/13   | Alta 🔵    | Diferencial técnico   |

**Fluxo do Ciclo Completo:**

```
ETP → Termo de Referência → Pesquisa de Preços → Edital → Contrato
```

#### M10: Termo de Referência (#1247-#1253) - ✅ COMPLETE 7/7

Geração automática de TR a partir do ETP aprovado.

| #     | Issue                                         | Status |
| ----- | --------------------------------------------- | ------ |
| #1247 | [TR] Modulo de Termo de Referencia - EPIC     | ✅     |
|       | ↳ #1248 Entity TermoReferencia e módulo       | ✅     |
|       | ↳ #1249 Geração automática com IA             | ✅     |
|       | ↳ #1250 Templates por categoria               | ✅     |
|       | ↳ #1251 Editor TR no frontend                 | ✅     |
|       | ↳ #1252 Export TR em PDF/DOCX                 | ✅     |
|       | ↳ #1253 Versionamento e histórico de TR       | ✅     |

#### M11: Pesquisa de Preços Formal (#1254-#1260) + Apple HIG Layout (#1463-#1468) - ✅ COMPLETE 21/21

Módulo estruturado conforme IN SEGES/ME nº 65/2021 + Layout e Espaçamento Apple HIG.

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
|       |   ↳ #1506 Criar página base wizard            | ✅     |
|       |   ↳ #1507 Steps 1-2: Seleção ETP/TR           | ✅     |
|       |   ↳ #1508 Steps 3-4: Fontes e Execução        | ✅     |
|       |   ↳ #1509 Step 5: Revisão e Tabela            | ✅     |
|       | ↳ #1260 Export relatório pesquisa PDF         | ✅     |
| #1429 | [Layout] Implementar Layout e Espaçamento Apple HIG | ✅ |
|       | ↳ #1463 Criar design tokens de espaçamento Apple HIG | ✅ |
|       | ↳ #1464 Implementar grid system responsivo 12 colunas | ✅ |
|       | ↳ #1465 Implementar safe areas e insets para notch/home indicator | ✅ |
|       | ↳ #1466 Aplicar spacing tokens aos Page layouts principais | ✅ |
|       | ↳ #1467 Aplicar spacing tokens a Card grids e Form layouts | ✅ |
|       | ↳ #1468 Aplicar spacing tokens a Navigation, Modals e Lists | ✅ |

Features:
- Coleta automática multi-fonte (PNCP, SINAPI, SICRO, Atas RP)
- Mapa comparativo de preços
- Justificativa automática de metodologia
- Relatório formal de pesquisa

#### M12: Compliance TCE (#1261-#1267) - COMPLETE 7/7 (100%) ✅

Validação automática contra critérios TCU/TCE.

| #     | Issue                                         | Status |
| ----- | --------------------------------------------- | ------ |
| #1261 | [Compliance] Validacao TCE - EPIC             | ✅     |
|       | ↳ #1262 Mapear criterios TCU/TCE              | ✅     |
|       | ↳ #1263 Engine de validacao ETP               | ✅     |
|       | ↳ #1264 Relatorio de conformidade             | ✅     |
|       | ↳ #1265 Selo de Conformidade visual           | ✅     |
|       | ↳ #1266 Alertas tempo real                    | ✅     |
|       | ↳ #1267 Dashboard de compliance do órgão      | ✅     |

Features:
- Mapeamento de critérios ALICE/SOFIA ✅
- Engine de validação com score 0-100 ✅
- Selo de Conformidade visual ✅
- Alertas em tempo real durante preenchimento ✅

#### M13: Inteligência de Mercado (#1268-#1275) - 1/8 (13%) 🟡 STARTED

Dados proprietários e analytics avançados.

| #     | Issue                                         | Status |
| ----- | --------------------------------------------- | ------ |
| #1268 | [Market Intel] Modulo Market Intelligence - EPIC | 🔴   |
|       | ↳ #1269 Contract Price Collector              | ✅     |
|       | ↳ #1270 Price normalization and categorization | 🔴    |
|       | ↳ #1271 Regional benchmark engine              | 🔴    |
|       | ↳ #1272 Overprice alerts system                | 🔴    |
|       | ↳ #1273 Market analytics dashboard             | 🔴    |
|       | ↳ #1274 Price trend analysis                   | 🔴    |
|       | ↳ #1275 API for third-party access             | 🔴    |

Features:
- Preços reais de pregões (não tabelas)
- Benchmark regional por porte de órgão
- Alertas de sobrepreço vs mediana
- API monetizável para terceiros

#### M17: PageIndex RAG Reasoning-Based (#1538-#1554) - 5/13 (38%) 🔵 IN PROGRESS

Integração do framework [PageIndex](https://github.com/VectifyAI/PageIndex) para RAG reasoning-based com 98.7% accuracy (FinanceBench).

| #     | Issue                                                    | Prioridade | Status |
| ----- | -------------------------------------------------------- | ---------- | ------ |
| #1538 | Criar módulo PageIndex para indexação hierárquica        | P0         | 🔴     |
|       | ↳ #1550 Setup infraestrutura módulo - estrutura NestJS   | P0         | ✅     |
|       | ↳ #1551 Criar DocumentTree entity e migrations           | P0         | ✅     |
|       | ↳ #1552 Implementar TreeBuilderService com Python        | P0         | ✅     |
|       | ↳ #1553 Implementar TreeSearchService com LLM reasoning  | P0         | ✅     |
|       | ↳ #1554 PoC PageIndex com Lei 14.133/2021                | P0         | ✅     |
| #1539 | Indexar catálogo SINAPI completo com PageIndex           | P0         | 🔴     |
| #1540 | Indexar jurisprudências TCE-SP e TCU com PageIndex       | P0         | 🔴     |
| #1541 | Integrar PageIndex no Anti-Hallucination Agent           | P1         | 🔴     |
| #1542 | Implementar Hybrid RAG - Embeddings + PageIndex          | P1         | 🔴     |
| #1543 | Document Extraction com tree structure                   | P2         | 🔴     |
| #1544 | Chat contextualizado com PageIndex tree search           | P2         | 🔴     |
| #1545 | Market Intelligence com extração estruturada de editais  | P3         | 🔴     |

**Diferenciais Competitivos:**
- **Precisão Legal**: 98.7% accuracy vs ~80% do RAG tradicional com embeddings
- **Auditabilidade**: Retrieval baseado em raciocínio (não "vibe search")
- **Zero Vector DB**: Usa estrutura hierárquica + LLM reasoning
- **Compliance**: Jurisprudência TCE/TCU indexada com precedentes automáticos
- **Market Intel**: Extração estruturada de editais para dados proprietários

**Tecnologia:**
- [PageIndex](https://github.com/VectifyAI/PageIndex) - Framework open source (MIT)
- Abordagem Hybrid: Self-hosted para docs estáticos + API Cloud fallback
- Tree search com LLM para navegação humana em documentos complexos

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
| Issues Totais     | 1555  |
| Issues Abertas    | 60    |
| Issues Fechadas   | 1496  |
| Progresso         | 96.3% |
| Bugs P0 Abertos   | 6     |
| M17 PageIndex     | 4/13  |
| Backend Coverage  | 71%   |
| Frontend Coverage | 82%   |
| Backend Tests     | 3323  |
| Frontend Tests    | 2388  |
| Total Tests       | 5711  |

---

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Issues](https://github.com/CONFENGE/etp-express/issues)
