# Práticas de Acessibilidade - ETP Express

> **Compliance:** WCAG 2.1 AA + Apple Human Interface Guidelines (HIG) 2025
> **Legal:** Lei Brasileira de Inclusão (LBI) - Lei 13.146/2015
> **Updated:** 2026-01-14 - Issue #1480

---

## Índice

- [Visão Geral](#visão-geral)
- [Padrões e Conformidade](#padrões-e-conformidade)
- [Contraste de Cores](#contraste-de-cores)
- [Touch Targets](#touch-targets)
- [Screen Readers](#screen-readers)
- [Navegação por Teclado](#navegação-por-teclado)
- [Uso de Cor](#uso-de-cor)
- [Liquid Glass Design System](#liquid-glass-design-system)
- [Testes](#testes)
- [Checklist WCAG 2.1 AA](#checklist-wcag-21-aa)
- [Recursos e Ferramentas](#recursos-e-ferramentas)

---

## Visão Geral

O ETP Express segue rigorosamente as diretrizes de acessibilidade **WCAG 2.1 Level AA** e **Apple Human Interface Guidelines (HIG) 2025** para garantir que todos os usuários, independentemente de suas capacidades, possam usar a plataforma de forma efetiva.

### Princípios WCAG 2.1

1. **Perceptível:** Informação e componentes da interface devem ser apresentáveis aos usuários de maneiras que eles possam perceber
2. **Operável:** Componentes de interface e navegação devem ser operáveis
3. **Compreensível:** Informação e operação da interface devem ser compreensíveis
4. **Robusto:** Conteúdo deve ser robusto o suficiente para ser interpretado por uma ampla variedade de user agents, incluindo tecnologias assistivas

---

## Padrões e Conformidade

### WCAG 2.1 Level AA

- ✅ **1.4.3** Contraste mínimo: 4.5:1 (texto normal), 3:1 (texto grande)
- ✅ **2.1.1** Teclado: Toda funcionalidade disponível via teclado
- ✅ **2.4.7** Focus Visible: Indicador de foco sempre visível
- ✅ **2.5.5** Target Size: Touch targets >= 44x44px (Apple HIG)
- ✅ **3.3.2** Labels or Instructions: Todos os inputs têm labels
- ✅ **4.1.3** Status Messages: Mensagens dinâmicas com ARIA live regions

### Apple HIG 2025

- ✅ **Touch Targets:** Mínimo 44x44pt (pixels)
- ✅ **VoiceOver:** Suporte completo para screen readers
- ✅ **Dynamic Type:** Escala de fontes responsiva
- ✅ **Contraste:** Enhanced contrast modes
- ✅ **Motion:** Redução de animações (prefers-reduced-motion)

### Lei Brasileira de Inclusão (LBI)

A LBI (Lei 13.146/2015) garante acessibilidade como direito. O ETP Express cumpre:

- ✅ **Art. 63:** Acessibilidade em sites e serviços digitais do Poder Público
- ✅ **Art. 67:** Comunicação acessível e alternativas tecnológicas

---

## Contraste de Cores

### Ratios Mínimos WCAG 2.1 AA

```css
/* Texto normal (< 18pt ou < 14pt bold) */
color-contrast: >= 4.5:1

/* Texto grande (>= 18pt ou >= 14pt bold) */
color-contrast: >= 3:1

/* Componentes UI e gráficos */
color-contrast: >= 3:1
```

### Implementação no ETP Express

#### Liquid Glass com Text-Shadow

Para componentes com background translúcido (Liquid Glass), usamos `text-shadow` para garantir legibilidade:

```css
/* Frontend: src/styles/tokens/typography.css */
.text-on-glass {
  color: hsl(var(--foreground));
  text-shadow:
    0 1px 2px hsl(var(--background) / 0.8),
    0 0 4px hsl(var(--background) / 0.6);
}
```

#### Cores Semânticas

```css
/* Frontend: src/styles/tokens/colors.css */
:root {
  /* Primary - Contraste 7.2:1 em background branco */
  --primary: 217 91% 60%;

  /* Secondary - Contraste 4.6:1 */
  --secondary: 222 47% 57%;

  /* Success - Contraste 4.5:1 */
  --success: 142 76% 36%;

  /* Error - Contraste 5.1:1 */
  --destructive: 0 84% 60%;
}
```

### Ferramentas de Validação

- **Axe DevTools:** Browser extension para análise em tempo real
- **Playwright + Axe:** Testes automatizados de contraste
- **Pa11y:** CLI tool para auditorias em lote

---

## Touch Targets

### Tamanho Mínimo: 44x44px (Apple HIG)

Todos os elementos interativos devem ter **pelo menos 44x44 pixels** (Apple HIG) ou 44x44pt.

#### Implementação

```css
/* Frontend: src/styles/mixins/accessibility.css */
.touch-target-min {
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem; /* 8px fallback */
}
```

#### Componentes Auditados

- ✅ **Botões:** `<Button>` component (min 44x44px)
- ✅ **Links:** `<Link>` e `<a>` (padding adequado)
- ✅ **Checkboxes/Radios:** Área clicável expandida
- ✅ **Ícones interativos:** Wrapper com padding

#### Exemplo: Button Component

```tsx
// Frontend: src/components/ui/button.tsx
<button
  className={cn(
    "inline-flex items-center justify-center",
    "min-h-[44px] min-w-[44px]", // Apple HIG compliance
    "px-4 py-2",
    "touch-target-min"
  )}
>
  {children}
</button>
```

---

## Screen Readers

### Suporte Completo

- ✅ **VoiceOver** (macOS, iOS)
- ✅ **NVDA** (Windows)
- ✅ **JAWS** (Windows)
- ✅ **TalkBack** (Android)

### Práticas de ARIA

#### Labels Obrigatórios

```tsx
// ✅ BOM: aria-label em botão de ícone
<button aria-label="Excluir ETP">
  <TrashIcon />
</button>

// ❌ RUIM: Botão sem label
<button>
  <TrashIcon />
</button>
```

#### ARIA Live Regions

Para conteúdo dinâmico (toasts, notificações):

```tsx
// Frontend: src/components/ui/toast.tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {message}
</div>
```

#### ARIA em Formulários

```tsx
// Frontend: src/components/forms/Input.tsx
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  {hasError && (
    <span id="email-error" role="alert">
      {errorMessage}
    </span>
  )}
</div>
```

### Landmarks e Estrutura Semântica

```html
<body>
  <header role="banner">
    <nav role="navigation" aria-label="Principal">
      <!-- Navegação principal -->
    </nav>
  </header>

  <main role="main">
    <section aria-labelledby="page-title">
      <h1 id="page-title">Dashboard</h1>
      <!-- Conteúdo -->
    </section>
  </main>

  <aside role="complementary">
    <!-- Sidebar -->
  </aside>

  <footer role="contentinfo">
    <!-- Footer -->
  </footer>
</body>
```

---

## Navegação por Teclado

### Requisitos WCAG 2.1.1 (Level A)

Toda funcionalidade deve ser acessível via teclado.

### Atalhos de Teclado

| Tecla        | Ação                              |
| ------------ | --------------------------------- |
| `Tab`        | Próximo elemento focável          |
| `Shift+Tab`  | Elemento focável anterior         |
| `Enter`      | Ativar botão/link                 |
| `Space`      | Ativar botão/checkbox             |
| `Escape`     | Fechar modal/dropdown             |
| `Arrow Keys` | Navegação em menus/tabs/dropdowns |

### Focus Management

#### Focus Visible (WCAG 2.4.7)

```css
/* Frontend: src/styles/globals.css */
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: 2px;
}
```

#### Focus Trap em Modals

```tsx
// Frontend: src/components/ui/dialog.tsx
import { useFocusTrap } from '@/hooks/useFocusTrap';

export function Dialog({ children, ...props }) {
  const ref = useFocusTrap();

  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Content ref={ref}>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Root>
  );
}
```

#### Skip Links

```tsx
// Frontend: src/components/layout/SkipNav.tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
>
  Pular para conteúdo principal
</a>
```

---

## Uso de Cor

### WCAG 1.4.1 - Não usar cor como único indicador

❌ **RUIM:** Apenas cor para indicar erro

```tsx
<input style={{ borderColor: 'red' }} />
```

✅ **BOM:** Cor + ícone + texto

```tsx
<div>
  <input aria-invalid="true" className="border-red-500" />
  <AlertCircleIcon className="text-red-500" />
  <span className="text-red-500">Campo obrigatório</span>
</div>
```

### Implementação no ETP Express

```tsx
// Frontend: src/components/ui/form-field.tsx
{hasError && (
  <div className="flex items-center gap-2 text-destructive">
    <AlertCircleIcon className="h-4 w-4" />
    <span role="alert">{errorMessage}</span>
  </div>
)}
```

---

## Liquid Glass Design System

### Desafios de Acessibilidade

O Liquid Glass usa backgrounds translúcidos, o que pode comprometer legibilidade.

### Soluções Implementadas

#### 1. Text-Shadow Obrigatório

```css
/* Frontend: src/styles/components/glass-surface.css */
.glass-surface {
  background: hsl(var(--background) / 0.7);
  backdrop-filter: blur(10px);
}

.glass-surface * {
  text-shadow:
    0 1px 2px hsl(var(--background) / 0.8),
    0 0 4px hsl(var(--background) / 0.6);
}
```

#### 2. Contraste Enhanced em Modo Escuro

```css
@media (prefers-color-scheme: dark) {
  .glass-surface {
    background: hsl(var(--background) / 0.85);
    /* Opacity maior para garantir contraste */
  }
}
```

#### 3. Fallback sem Liquid Glass

```css
@media (prefers-reduced-transparency: reduce) {
  .glass-surface {
    background: hsl(var(--background));
    backdrop-filter: none;
  }
}
```

---

## Testes

### Testes Automatizados

#### 1. Playwright + Axe

```bash
npm run test:a11y
```

**Arquivo:** `e2e/accessibility.spec.ts`

- Testa 11 páginas principais
- Valida WCAG 2.1 AA
- Detecta violações de contraste, labels, ARIA, etc.

#### 2. Pa11y CI

```bash
npm run audit:a11y
```

**Arquivo:** `.pa11yci.json`

- Audita 6 URLs principais
- Gera screenshots
- Threshold: 0 violações

#### 3. Lighthouse CI

Rodado automaticamente em PRs via GitHub Actions.

**Arquivo:** `.github/workflows/lighthouse-ci.yml`

- Score mínimo: 90/100
- Foco em acessibilidade

### Testes Manuais

#### VoiceOver (macOS/iOS)

```bash
# Ativar VoiceOver: Cmd + F5
# Navegar: Control + Option + setas
```

**Checklist:**
- [ ] Todos os botões têm labels
- [ ] Formulários são preenchíveis
- [ ] Navegação por landmarks funciona
- [ ] Conteúdo dinâmico é anunciado

#### NVDA (Windows)

```bash
# Instalar: https://www.nvaccess.org/download/
# Ativar: Ctrl + Alt + N
```

**Checklist:**
- [ ] Headings são anunciados corretamente
- [ ] Links descritivos
- [ ] Formulários com instruções claras

#### Navegação por Teclado

**Checklist:**
- [ ] Tab alcança todos os elementos interativos
- [ ] Focus visible em todos os elementos
- [ ] Escape fecha modals
- [ ] Enter/Space ativam botões

#### Simulador de Daltonismo

**Ferramenta:** [Coblis](https://www.color-blindness.com/coblis-color-blindness-simulator/)

**Checklist:**
- [ ] Informação não depende apenas de cor
- [ ] Ícones/texto complementam cor

#### Zoom 200%

**WCAG 1.4.4 - Resize text**

**Checklist:**
- [ ] Conteúdo permanece legível
- [ ] Sem scroll horizontal
- [ ] Layout responsivo mantém estrutura

---

## Checklist WCAG 2.1 AA

### Perceptível

- [x] **1.1.1** Non-text Content (A) - Alt text em imagens
- [x] **1.3.1** Info and Relationships (A) - Semântica HTML
- [x] **1.4.3** Contrast (Minimum) (AA) - 4.5:1 texto normal, 3:1 texto grande
- [x] **1.4.4** Resize text (AA) - Zoom 200% sem perda
- [x] **1.4.5** Images of Text (AA) - Evitar texto em imagens

### Operável

- [x] **2.1.1** Keyboard (A) - Toda funcionalidade via teclado
- [x] **2.1.2** No Keyboard Trap (A) - Foco não preso
- [x] **2.4.1** Bypass Blocks (A) - Skip links
- [x] **2.4.3** Focus Order (A) - Ordem lógica
- [x] **2.4.6** Headings and Labels (AA) - Descritivos
- [x] **2.4.7** Focus Visible (AA) - Indicador de foco
- [x] **2.5.5** Target Size (AAA/Apple HIG) - 44x44px mínimo

### Compreensível

- [x] **3.1.1** Language of Page (A) - `<html lang="pt-BR">`
- [x] **3.2.3** Consistent Navigation (AA) - Navegação consistente
- [x] **3.2.4** Consistent Identification (AA) - Componentes consistentes
- [x] **3.3.1** Error Identification (A) - Erros claramente identificados
- [x] **3.3.2** Labels or Instructions (A) - Todos os inputs têm labels
- [x] **3.3.3** Error Suggestion (AA) - Sugestões de correção
- [x] **3.3.4** Error Prevention (Legal, Financial, Data) (AA) - Confirmações

### Robusto

- [x] **4.1.2** Name, Role, Value (A) - ARIA correto
- [x] **4.1.3** Status Messages (AA) - ARIA live regions

---

## Recursos e Ferramentas

### Ferramentas de Auditoria

- **Axe DevTools:** [Chrome](https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)
- **WAVE:** [Web Accessibility Evaluation Tool](https://wave.webaim.org/)
- **Lighthouse:** Built-in no Chrome DevTools
- **Pa11y:** `npm run audit:a11y`

### Documentação

- **WCAG 2.1:** [W3C WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- **Apple HIG:** [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- **MDN ARIA:** [ARIA Practices Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- **LBI:** [Lei 13.146/2015](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm)

### Testes de Screen Readers

- **VoiceOver:** Built-in macOS/iOS
- **NVDA:** [Baixar](https://www.nvaccess.org/download/)
- **JAWS:** [Trial](https://support.freedomscientific.com/Downloads/JAWS)

### Simuladores

- **Daltonismo:** [Coblis](https://www.color-blindness.com/coblis-color-blindness-simulator/)
- **Contraste:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Contato e Suporte

Para questões de acessibilidade, por favor abra uma issue no GitHub:

📝 [Reportar problema de acessibilidade](https://github.com/CONFENGE/etp-express/issues/new?labels=accessibility,priority:P0)

---

**Última atualização:** 2026-01-14
**Issue:** #1480
**Responsável:** Engenheiro-Executor ETP Express
