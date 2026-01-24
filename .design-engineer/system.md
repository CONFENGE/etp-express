# Design System - ETP Express

## Design Direction

**Selected:** Sophistication & Trust

**Character:** Cool tones, layered depth, professional

**Best For:** Financial services, enterprise B2B, government compliance systems

---

## Rationale for "Sophistication & Trust"

### Why This Direction?

ETP Express é uma plataforma enterprise B2B voltada para licitações e contratações públicas no contexto governamental brasileiro. Esta direção de design foi escolhida por atender aos seguintes critérios:

1. **Confiança Institucional**
   - Sistema lida com processos críticos de compras públicas
   - Usuários são servidores públicos que precisam de interface profissional
   - Conformidade com Lei 14.133/2021 e normas TCE/TCU exige seriedade visual

2. **Sofisticação Técnica**
   - Dados complexos (ETPs, TRs, Pesquisas de Preços, Contratos)
   - Visualizações de compliance, analytics de mercado, jurisprudência
   - Público-alvo espera interface de qualidade enterprise

3. **Ambiente B2B/B2G**
   - Clientes são órgãos públicos (prefeituras, secretarias, autarquias)
   - Competição com sistemas tradicionais (PNCP, Compras.gov.br)
   - Diferencial competitivo via UX superior

### Alternatives Considered

| Direction | Pros | Cons | Verdict |
|-----------|------|------|---------|
| Precision & Density | Alta densidade de informação | Visual técnico demais, intimidante | ❌ Rejected |
| **Sophistication & Trust** | **Equilíbrio ideal: profissional + acessível** | - | ✅ **Selected** |
| Boldness & Clarity | Moderno, alto contraste | Muito casual para ambiente gov | ❌ Rejected |

---

## Design Characteristics

### Color Palette

**Primary Strategy:** Cool tones com profundidade em camadas

- **Base:** Blues e grays (confiança, profissionalismo)
- **Accent:** Indigo/Purple (sofisticação técnica)
- **Semantic:**
  - Success: Green (conformidade, aprovações)
  - Warning: Amber (alertas, revisões)
  - Error: Red (bloqueios, não-conformidades)
  - Info: Blue (insights, analytics)

**Reference:** Apple HIG 2025 semantic colors com Liquid Glass translucency

### Typography

**Primary:** San Francisco Pro (Apple HIG 2025)
- Display: Bold, left-aligned
- Body: Regular 17pt base
- Code: SF Mono

**Hierarchy:**
- H1: 32pt Bold (Page titles)
- H2: 24pt Bold (Section headers)
- H3: 20pt Medium (Subsections)
- Body: 17pt Regular (Base text)
- Caption: 13pt Regular (Metadata, footnotes)

### Layout

**Grid System:** 12-column responsive (Apple HIG Layout)

**Spacing Scale:** 4pt base (8, 12, 16, 24, 32, 48, 64)

**Principles:**
- **Generous whitespace:** Avoid visual clutter
- **Layered depth:** Subtle shadows, Liquid Glass surfaces
- **Hierarchical clarity:** Clear visual weight for CTAs

### Surface Treatments

**Liquid Glass Design System** (Apple HIG 2025):
- Translucent backgrounds (`backdrop-blur`, opacity layers)
- Subtle depth via elevation (shadows, borders)
- Responsive to content (vibrancy, adaptive colors)

**Components:**
- Cards: Liquid Glass with hover states
- Modals/Dialogs: Prominent glass surfaces
- Navigation: Persistent glass sidebar
- Tooltips: Lightweight glass hints

### Motion Design

**Apple HIG Motion Principles:**
- Natural easing (`cubic-bezier(0.4, 0.0, 0.2, 1)`)
- Purposeful animations (feedback, state transitions)
- Respectful of `prefers-reduced-motion`

**Durations:**
- Micro-interactions: 150-200ms (buttons, toggles)
- Transitions: 300-400ms (modals, page changes)
- Complex animations: 500-600ms (charts, data viz)

### Accessibility

**WCAG 2.1 AA Compliance:**
- Contrast ratios >= 4.5:1 (text), >= 3:1 (UI components)
- Touch targets >= 44x44px
- Keyboard navigation with visible focus rings
- Screen reader support (ARIA labels, semantic HTML)
- Color not sole indicator (icons, labels as backup)

---

## Implementation Guidelines

### Component Patterns

1. **Cards (Information Density)**
   - Use Liquid Glass surfaces
   - Avoid overcrowding (max 5-7 data points per card)
   - Clear CTAs with sufficient contrast

2. **Forms (Trust & Clarity)**
   - Inline validation with helpful error messages
   - Progressive disclosure (wizards for complex flows)
   - Auto-save indicators (reduce anxiety)

3. **Data Visualization (Sophistication)**
   - Clean charts (avoid chartjunk)
   - Contextual tooltips (Liquid Glass)
   - Export options (PDF, DOCX, JSON)

4. **Navigation (Professional Structure)**
   - Persistent sidebar (desktop)
   - Bottom tabs (mobile)
   - Breadcrumbs for deep hierarchies

### Anti-Patterns

❌ **Avoid:**
- Overly playful illustrations (conflicts with "Trust")
- Neon colors or high saturation (conflicts with "Sophistication")
- Dense walls of text (conflicts with "Clarity")
- Ambiguous CTAs (conflicts with "Professional")

✅ **Embrace:**
- Subtle depth and shadows
- Generous whitespace
- Clear visual hierarchy
- Purposeful animations
- Professional iconography (SF Symbols, Lucide Icons)

---

## Technical Enforcement

### Design Tokens

Tokens defined in `frontend/src/styles/tokens/`:
- `colors.ts` - Semantic color system
- `typography.ts` - Type scale and font families
- `spacing.ts` - 4pt scale
- `motion.ts` - Easing curves and durations
- `surfaces.ts` - Liquid Glass elevation system

### Linting

**Stylelint:** Enforce token usage (`.stylelintrc.json`)
- `stylelint-declaration-strict-value` - Block hardcoded colors/spacing
- `stylelint-order` - Consistent property ordering

**ESLint:** React/TypeScript patterns
- Enforce semantic HTML
- Warn on missing ARIA labels
- Prefer components over raw HTML

---

## References

### External

- [Claude Design Engineer](https://github.com/Dammyjay93/claude-design-engineer) - Design directions framework
- [Apple HIG 2025](https://developer.apple.com/design/human-interface-guidelines/) - Liquid Glass, San Francisco, Motion
- [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility guidelines

### Internal

- `ARCHITECTURE.md` - Technical architecture
- `frontend/src/styles/tokens/` - Design token implementation
- `.stylelintrc.json` - Linting rules for design enforcement

---

## Changelog

| Date       | Change                                         | Author |
|------------|------------------------------------------------|--------|
| 2026-01-24 | Initial documentation - Sophistication & Trust | Claude |
