# UX Specialist Review

**Reviewer:** @ux-design-expert (AIOS)
**Data:** 2026-01-29
**Documento Revisado:** docs/prd/technical-debt-DRAFT.md

---

## Debitos Validados

| ID | Debito | Severidade Original | Severidade Ajustada | Horas | Prioridade | Impacto UX |
|----|--------|---------------------|---------------------|-------|------------|------------|
| FE-01 | Inconsistencia validacao senha (Login/Register) | **ALTA** | **ALTA** | 1h | P1 | **Critico**: Usuario preenche senha de 6-7 chars no formulario, submete, e recebe erro 400 do backend. Frustracao direta no onboarding. Nota: `PasswordChangeModal.tsx` ja usa minLength=8 corretamente - apenas `Login.tsx` (L29) e `Register.tsx` (L30) estao desalinhados. |
| FE-02 | Inconsistencia tipo paginacao (`pagination` vs `meta`) | **MEDIA** | **MEDIA** | 2h | P2 | Impacto indireto. O tipo `PaginatedResponse` em `types/api.ts` usa campo `pagination`, backend retorna `meta`. Se hooks fazem mapeamento, funciona mas gera confusao para devs. |
| FE-03 | SkipLink nao integrado | **MEDIA** | ~~MEDIA~~ **RESOLVIDO** | 0h | N/A | **CORRECAO**: O SkipLink **JA ESTA integrado** em `MainLayout.tsx` (linha 21) e o `<main id="main-content" role="main">` existe (linha 28-30). O DRAFT esta incorreto. Debito resolvido - remover do documento final. |
| FE-04 | SkipLink em ingles | **BAIXA** | **BAIXA** | 0.5h | P3 | Label default "Skip to main content" em componente de app PT-BR. Impacto em usuarios de leitores de tela que usam portugues. |
| FE-05 | Swagger desabilitado em producao | **BAIXA** | **BAIXA** | 4h | P4 | Decisao intencional de seguranca. Impacto UX zero para usuarios finais; afeta apenas DX de integradores terceiros. Manter como esta. |
| FE-06 | ErrorBoundary sem Sentry direto | **BAIXA** | ~~BAIXA~~ **RESOLVIDO** | 0h | N/A | **CORRECAO**: `main.tsx` (linha 17) ja usa `<Sentry.ErrorBoundary fallback={ErrorFallback} showDialog>` como wrapper raiz. O `ErrorBoundary` customizado em `components/common/` e secundario e ja integra Sentry via `logger.error()` -> `Sentry.captureException()`. Debito inexistente na pratica. |
| FE-07 | Disclaimer em todas as respostas | **INFO** | **INFO** | N/A | N/A | Decisao de design. ~100 bytes por request, impacto negligivel. |

**Resumo da validacao:** Dos 7 debitos listados, **2 ja estao resolvidos** (FE-03, FE-06), **2 sao reais e prioritarios** (FE-01, FE-02), **2 sao baixa prioridade** (FE-04, FE-05), e **1 e informacional** (FE-07).

---

## Debitos Adicionados

| ID | Debito | Severidade | Horas | Descricao |
|----|--------|------------|-------|-----------|
| FE-08 | aria-labels em ingles em componentes de producao | **MEDIA** | 2h | Varios componentes possuem `aria-label` em ingles em app PT-BR, violando consistencia de idioma para leitores de tela. Exemplos encontrados: `LoadingState.tsx` ("Loading recent items"), `QuotaIndicator.tsx` ("Loading quota information", "Quota information unavailable"), `MainLayout.tsx` ("Main content"), `AssignManagerDialog.tsx` ("Select a user"), `ETPEditor` ("Loading editor"). Leitores de tela em portugues pronunciarao esses labels com fonemas incorretos. |
| FE-09 | Inconsistencia validacao senha entre formularios | **MEDIA** | 1h | `PasswordChangeModal.tsx` usa `minLength: 8` com indicador de forca e validacao de complexidade completa (maiuscula, minuscula, numero, especial). Porem `Login.tsx` e `Register.tsx` usam apenas `min(6)` sem validacao de complexidade. A experiencia de validacao e inconsistente entre formularios do mesmo sistema. O `PasswordChangeModal` e o padrao correto - Login e Register devem segui-lo. |
| FE-10 | Ausencia de teste axe-core por pagina | **BAIXA** | 4h | Os testes de acessibilidade existem (`accessibility.test.tsx`) mas cobrem componentes isolados. Nao ha evidencia de testes axe-core E2E cobrindo todas as ~30 paginas principais. Cobertura parcial de WCAG 2.1 AA. |

---

## Respostas ao Architect

### 1. SkipLink - Posicao no Layout

**O SkipLink JA esta integrado corretamente.** Verificacao no codigo real:

- `MainLayout.tsx` linha 21: `<SkipLink />` e o primeiro filho do `<div>` raiz
- `MainLayout.tsx` linha 29: `<main id="main-content" role="main" aria-label="Main content">`

A posicao atual e correta: primeiro elemento visual dentro do layout, antes do `<Header>`. Para conformidade WCAG 2.4.1, o SkipLink deve ser o primeiro elemento focavel da pagina, que e exatamente onde esta. **Nenhuma acao necessaria** quanto a integracao.

Unica acao pendente: traduzir o label default de "Skip to main content" para "Pular para o conteudo principal" (FE-04), e tambem o `aria-label="Main content"` do `<main>` para `aria-label="Conteudo principal"`.

### 2. Validacao de Senha - Indicador de Forca

**Ja existe um indicador de forca no `PasswordChangeModal.tsx`** com validacao completa (8 chars, maiuscula, minuscula, numero, especial) e barra visual com labels "Fraca/Razoavel/Boa/Forte". Este e o padrao correto.

**Recomendacao:** Replicar o mesmo padrao de `PasswordChangeModal` para os formularios de `Register.tsx` e `Login.tsx`:
- Minimo 8 caracteres (alinhar com backend)
- Indicador de forca em tempo real (ja implementado, so precisa reusar)
- Validacao de complexidade (maiuscula, minuscula, numero, especial)

Para sistemas governamentais brasileiros, o padrao recomendado pelo e-PING e:
- Minimo 8 caracteres
- Complexidade obrigatoria (maiuscula + minuscula + numero + especial)
- Indicador visual de forca
- Nao permitir senhas comuns (lista de bloqueio)

A implementacao do `PasswordChangeModal` ja atende 3 de 4 criterios. Falta apenas lista de bloqueio de senhas comuns.

### 3. Paginacao - Nomenclatura

**Recomendacao: usar `meta`.**

Justificativas:
- `meta` e padrao de mercado (JSON:API spec, Laravel, NestJS defaults)
- O backend ja retorna `meta` - unificar evita camada de mapeamento
- `pagination` e mais descritivo, mas `meta` permite extensibilidade (adicionar campos como `disclaimer`, `requestId`, etc.)
- Menor esforco: alterar o tipo frontend `PaginatedResponse` de `pagination` para `meta` (1 arquivo + ajustes nos hooks)

### 4. Disclaimer em Todas as Respostas

**Recomendacao: manter apenas em respostas com conteudo gerado por IA.**

Justificativas:
- O disclaimer legal tem valor em respostas de analise/IA onde ha geracao de conteudo
- Em respostas CRUD puras (listar ETPs, criar usuario), o disclaimer nao agrega valor legal
- ~100 bytes/request x milhares de requests = overhead acumulado desnecessario
- **Porem**: se o juridicoexige disclaimer universal, manter. A decisao e juridica, nao tecnica.

Alternativa: enviar disclaimer uma unica vez no login (ou no primeiro request da sessao) e cachear no frontend, removendo dos payloads subsequentes.

### 5. Acessibilidade - Lacunas WCAG 2.1 AA Alem do SkipLink

Lacunas identificadas na analise do codigo:

1. **aria-labels em ingles** (FE-08) - Violacao de WCAG 3.1.1 (Language of Page). Labels de acessibilidade devem estar no idioma da pagina.
2. **Testes axe-core parciais** (FE-10) - Cobertura de componentes isolados, nao de paginas completas.
3. **`role="main"` redundante** - O `<main>` semantico ja implica `role="main"`. Nao e um bug, mas e codigo desnecessario (MainLayout.tsx L30).
4. **Foco apos navegacao SPA** - Nao encontrei evidencia de gerenciamento de foco ao trocar de rota (ex: mover foco para `<main>` ou anunciar nova pagina). Usuarios de leitores de tela podem nao perceber mudancas de pagina.
5. **Contraste em dark mode** - Nao ha evidencia de testes de contraste (WCAG 1.4.3 - minimo 4.5:1) especificos para o tema escuro.

**Prioridade recomendada:**
1. P1: Foco apos navegacao SPA (impacto alto para screen readers)
2. P2: aria-labels em ingles (FE-08)
3. P3: Testes axe-core por pagina (FE-10)
4. P4: Auditoria de contraste dark mode

Nao encontrei testes axe-core falhando atualmente nos arquivos analisados, mas a cobertura e limitada.

### 6. Documentacao API para Terceiros

**Recomendacao: Redoc estatico gerado no CI/CD.**

Abordagem sugerida:
1. Gerar `openapi.json` no pipeline de CI (ja existe configuracao Swagger no backend)
2. Publicar como pagina Redoc estatica em subdominio (ex: `docs.etp-express.gov.br`)
3. Proteger com autenticacao basica ou API key para parceiros autorizados
4. Versionar a documentacao junto com releases

Alternativas avaliadas:
- **Portal de developer completo** - Overhead excessivo para o estagio atual do projeto
- **Swagger UI standalone** - Funcional mas Redoc tem melhor UX de leitura
- **Postman collection** - Complementar, nao substitui documentacao

### 7. Audit Completo de i18n

**Sim, recomendo um audit de i18n.** A analise revelou que o problema vai alem do SkipLink:

Textos em ingles encontrados no codigo de producao:
- `SkipLink.tsx`: "Skip to main content"
- `MainLayout.tsx`: `aria-label="Main content"`
- `LoadingState.tsx`: `aria-label="Loading recent items"`
- `QuotaIndicator.tsx`: "Loading quota information", "Quota information unavailable"
- `AssignManagerDialog.tsx`: `placeholder="Select a user"`
- Testes com strings em ingles (aceitavel, nao afeta producao)

**Recomendacao:**
1. **Curto prazo (2h):** Traduzir os aria-labels e placeholders identificados acima
2. **Medio prazo (8h):** Implementar sistema de i18n (react-intl ou i18next) para centralizar todas as strings
3. **Longo prazo:** Suporte multi-idioma se o sistema expandir para outros paises

Para o momento atual, um audit manual com `grep` por patterns de texto em ingles nos arquivos `.tsx` de producao (excluindo testes e docs) e suficiente. Nao justifica i18n library completa se o unico idioma-alvo e PT-BR.

---

## Recomendacoes de Design

### 1. Componente Unificado de Validacao de Senha

Extrair a logica de `PasswordChangeModal.tsx` para um componente reutilizavel `PasswordStrengthInput`:

```
<PasswordStrengthInput
  value={password}
  onChange={setPassword}
  showStrengthIndicator={true}
  requirements={PASSWORD_REQUIREMENTS}
/>
```

Usar em: Register, Login (campo senha), PasswordChangeModal, ResetPassword.

### 2. Padrao de aria-label Bilingue

Criar constante centralizada para todos os aria-labels:

```typescript
// lib/a11y-labels.ts
export const A11Y_LABELS = {
  MAIN_CONTENT: 'Conteudo principal',
  SKIP_TO_CONTENT: 'Pular para o conteudo principal',
  LOADING: 'Carregando',
  LOADING_ITEMS: 'Carregando itens recentes',
  // ...
} as const;
```

### 3. Focus Management para SPA

Implementar hook `useRouteAnnouncer` que:
- Detecta mudanca de rota via React Router
- Move foco para `<main>` ou anuncia titulo da pagina
- Usa `aria-live="polite"` para anunciar navegacao

Exemplo de padrao usado por GOV.UK Design System e US Web Design System (USWDS).

### 4. Tipo Paginado Unificado

```typescript
// types/api.ts - versao corrigida
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  disclaimer?: string;
}
```

### 5. Checklist de Acessibilidade Pre-Release

Antes de cada release, validar:
- [ ] Todos os aria-labels em PT-BR
- [ ] axe-core sem violacoes criticas nas paginas principais
- [ ] Navegacao por teclado funcional em todos os formularios
- [ ] Contraste minimo 4.5:1 em ambos os temas
- [ ] Focus trap funcional em todos os dialogs/modais
- [ ] Leitores de tela anunciam mudancas de pagina

---

*Review realizado em 2026-01-29 por @ux-design-expert (AIOS v3.10.0)*
*Baseado em analise do codigo-fonte real do frontend, nao apenas na documentacao.*
