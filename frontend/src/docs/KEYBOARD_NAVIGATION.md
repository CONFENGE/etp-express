# Keyboard Navigation - ETP Express

Este documento descreve o suporte completo de navegação por teclado conforme WCAG 2.1 AA e Apple HIG.

## Visão Geral

Todos os componentes interativos podem ser acessados e operados apenas com teclado, sem necessidade de mouse ou dispositivo apontador.

## Teclas Suportadas

### Navegação Global

| Tecla       | Ação                                  |
| ----------- | ------------------------------------- |
| Tab         | Mover foco para próximo elemento      |
| Shift+Tab   | Mover foco para elemento anterior     |
| Enter       | Ativar elemento focado                |
| Space       | Ativar elemento focado (botões)       |
| Escape      | Fechar modais/dropdowns/tooltips      |
| Arrow Keys  | Navegar em listas, menus e tabs       |

### Componentes Específicos

#### Modais e Dialogs

- **Tab/Shift+Tab**: Navega entre elementos dentro do modal (focus trap ativo)
- **Escape**: Fecha o modal
- **Enter**: Confirma ação (botão primário)
- Foco automático no primeiro elemento ao abrir
- Foco restaurado ao elemento anterior ao fechar

#### Dropdown Menus

- **Arrow Down**: Próximo item no menu
- **Arrow Up**: Item anterior no menu
- **Enter**: Seleciona item focado
- **Escape**: Fecha o dropdown
- **Home**: Primeiro item
- **End**: Último item

#### Tabs

- **Arrow Left**: Tab anterior
- **Arrow Right**: Próxima tab
- **Home**: Primeira tab
- **End**: Última tab
- **Enter/Space**: Ativa tab focada

#### Forms

- **Tab/Shift+Tab**: Navega entre campos
- **Enter**: Submete formulário (quando focado em campo ou botão submit)
- **Space**: Marca/desmarca checkbox ou radio
- **Arrow Up/Down**: Navega opções em select

#### Tabelas

- **Tab/Shift+Tab**: Navega entre células interativas
- **Arrow Keys**: Navega entre células (se implementado roving tabindex)

## Indicadores Visuais de Foco

Todos os elementos focados mostram um indicador visual claro:

```css
:focus-visible {
  outline: 2px solid var(--apple-accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--apple-accent-light);
  transition: outline 150ms ease, box-shadow 150ms ease;
}
```

### Especificações

- **Cor**: Apple Accent (`#007aff` light / `#0a84ff` dark)
- **Espessura**: 2px
- **Offset**: 2px (espaço entre elemento e outline)
- **Box-shadow**: 4px de anel semi-transparente
- **Transição**: 150ms ease para animação suave

## Focus Trap em Modais

Modais implementam "focus trap" automático usando o hook `useFocusTrap`:

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap';

const Modal = ({ isOpen }) => {
  const containerRef = useFocusTrap(isOpen);

  return (
    <div ref={containerRef}>
      <button>First</button>
      <input type="text" />
      <button>Last</button>
    </div>
  );
};
```

### Comportamento

1. Ao abrir: foco move para primeiro elemento focusável
2. Tab/Shift+Tab: cicla apenas dentro do modal
3. Escape: fecha o modal
4. Ao fechar: foco restaurado ao elemento que abriu o modal

## Roving Tabindex (Listas e Menus)

Para listas de itens navegáveis por Arrow keys:

```tsx
const [focusedIndex, setFocusedIndex] = useState(0);

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
  } else if (e.key === 'ArrowUp') {
    setFocusedIndex((prev) => Math.max(prev - 1, 0));
  } else if (e.key === 'Home') {
    setFocusedIndex(0);
  } else if (e.key === 'End') {
    setFocusedIndex(items.length - 1);
  }
};
```

## Skip Links

A aplicação possui skip links para navegação rápida:

```html
<a href="#main-content" class="skip-link">
  Pular para conteúdo principal
</a>
```

- Visível apenas ao receber foco (Tab na primeira interação)
- Permite pular navegação repetitiva
- Estilo Apple HIG com backdrop blur

## Componentes com Suporte Completo

✅ **Implementados:**

- Buttons (todos os variants)
- Modals/Dialogs (focus trap + Escape)
- Dropdowns (arrow keys + Enter)
- Forms (Tab order lógico)
- Tabs (arrow keys navigation)
- Cards (focusáveis quando clicáveis)
- Links (Enter para navegar)
- Tooltips (Escape para fechar)

## Testing

### Checklist Manual

- [ ] Tab percorre todos os elementos interativos
- [ ] Shift+Tab reverte direção
- [ ] Ordem de foco é lógica (top-to-bottom, left-to-right)
- [ ] Foco visível em todos os elementos
- [ ] Modais trapam foco corretamente
- [ ] Escape fecha modais/dropdowns
- [ ] Enter/Space ativa botões
- [ ] Arrow keys navegam em listas/menus
- [ ] Foco restaurado ao fechar modais

### Automated Tests

```bash
npm run test:a11y
```

Testes automatizados incluem:

- `useFocusTrap.test.ts`: Focus trap hook
- Testes Playwright com axe-core
- Lighthouse CI com score >= 90

## Preferências do Usuário

### Reduced Motion

Animações de transição são respeitadas:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode

Outlines de foco são reforçados:

```css
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid Highlight;
  }
}
```

## Recursos Adicionais

- [WCAG 2.1 - Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Apple HIG - Keyboard](https://developer.apple.com/design/human-interface-guidelines/keyboards)

## Problemas Conhecidos

Nenhum problema conhecido no momento. Se encontrar algum, reporte em:
https://github.com/CONFENGE/etp-express/issues
