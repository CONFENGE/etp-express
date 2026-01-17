# ETP Express Design System

> **Version:** 1.0.0
> **Last Updated:** 2026-01-17
> **Foundation:** Apple Human Interface Guidelines 2025
> **Reference:** [Claude Design Engineer](https://github.com/Dammyjay93/claude-design-engineer)

---

## Direction

### Personality: "Sophistication & Trust"

ETP Express is an enterprise B2G (Business-to-Government) platform for Brazilian public procurement documentation. The design language must convey:

1. **Institutional Credibility** - Government clients expect professionalism and compliance
2. **Technical Precision** - Legal documents require accuracy and clarity
3. **Operational Efficiency** - Users process dozens of ETPs daily, efficiency is paramount
4. **Accessible Elegance** - WCAG 2.1 AA compliant while maintaining visual refinement

### Foundation: Apple HIG 2025

We follow Apple Human Interface Guidelines with the **Liquid Glass** design paradigm:

- **Translucency** - Layered depth through backdrop-blur effects
- **Responsiveness** - Fluid micro-interactions that respond to user actions
- **Natural Motion** - Physics-based animations that feel organic
- **Concentricity** - Consistent border-radius ratios across nested elements

### Depth Strategy (Surface Hierarchy)

The design system uses a layered depth hierarchy for visual organization:

| Level | Layer | Component | Shadow | Use Case |
|-------|-------|-----------|--------|----------|
| 0 | Base | - | None | Page background (`surface-primary`) |
| 1 | Elevated | `<Card>` | `shadow-apple` | Content containers, data cards |
| 2 | Floating | `<GlassSurface>` | `shadow-md` | Dropdowns, popovers, sidebars |
| 3 | Modal | `<Dialog>` | `shadow-xl` | Dialogs, sheets, overlays |
| 4 | Toast | `<Toast>` | `shadow-lg` | Notifications, alerts |

### Card vs GlassSurface: When to Use

**Use `<Card>` for:**
- Content containers that hold user data (ETP cards, metric cards)
- List items that need elevation
- Form sections and fieldsets
- Static elevated content
- Any container with `CardHeader`, `CardContent`, `CardFooter` structure

**Use `<GlassSurface>` for:**
- Floating overlays (dropdowns, popovers)
- Navigation elements (sidebar, header)
- Elements that need backdrop-blur/translucency effect
- Contextual panels that appear over content
- Elements requiring Liquid Glass aesthetic

**Never use inline styles for cards.** Always use:
```tsx
// Correct: Use Card component
<Card>
  <CardContent>...</CardContent>
</Card>

// Correct: Use GlassSurface for floating elements
<GlassSurface intensity="medium">
  ...
</GlassSurface>

// Incorrect: Inline card styles
<div className="rounded-lg border bg-card shadow-md">
  ...
</div>
```

### Surface Token Classes

For simple backgrounds without card structure, use these utility classes:

| Class | CSS Variable | Use Case |
|-------|--------------|----------|
| `bg-surface-primary` | `--surface-primary` | Page backgrounds |
| `bg-surface-secondary` | `--surface-secondary` | Subtle backgrounds |
| `bg-surface-tertiary` | `--surface-tertiary` | Nested sections |
| `bg-card` | `--card` | Card backgrounds (prefer `<Card>`) |

---

## Tokens

All design tokens are defined in CSS custom properties for runtime theming support.

### Source Files

| File | Purpose |
|------|---------|
| `src/styles/design-tokens.css` | Core tokens (colors, spacing, typography, shadows) |
| `src/styles/tokens/motion.css` | Animation and transition tokens |
| `src/styles/tokens/grid.css` | 12-column responsive grid system |
| `src/styles/accessibility.css` | WCAG 2.1 AA compliance utilities |

### Color Palette

#### Surfaces (Backgrounds)

```css
--surface-primary: #ffffff;     /* Light: Main background */
--surface-secondary: #f5f5f7;   /* Light: Elevated surfaces */
--surface-tertiary: #e8e8ed;    /* Light: Subtle backgrounds */
--surface-elevated: #ffffff;    /* Light: Floating elements */
```

#### Text (WCAG 2.1 AA Compliant)

```css
--text-primary: #1d1d1f;        /* 15.9:1 contrast on white */
--text-secondary: #636366;      /* 5.9:1 contrast (WCAG AAA) */
--text-tertiary: #8e8e93;       /* 4.6:1 contrast (WCAG AA) */
--text-placeholder: #767676;    /* 4.5:1 contrast (WCAG AA) */
```

#### Accent (Apple Blue)

```css
--apple-accent: #0066cc;        /* 4.5:1 contrast with white text */
--apple-accent-hover: #0052a3;
--apple-accent-active: #004080;
--apple-accent-light: rgba(0, 102, 204, 0.1);
```

#### Semantic Colors

```css
--color-success: var(--apple-green);   /* #34c759 */
--color-warning: var(--apple-orange);  /* #ff9500 */
--color-error: var(--apple-red);       /* #ff3b30 */
--color-info: var(--apple-blue);       /* #0066cc */
```

### Spacing Scale

Based on 4px increments following Apple HIG:

```css
--space-0: 0;        /* None */
--space-0-5: 2px;    /* Micro - Hairline */
--space-1: 4px;      /* Extra small - Tight UI */
--space-2: 8px;      /* Small - List items */
--space-3: 12px;     /* Medium-small - Compact forms */
--space-4: 16px;     /* Medium (base) - Default spacing */
--space-5: 20px;     /* Medium-large - Comfortable */
--space-6: 24px;     /* Large - Card padding */
--space-8: 32px;     /* Extra large - Major sections */
--space-10: 40px;    /* 2x Large - Page sections */
--space-12: 48px;    /* 3x Large - Headers */
--space-16: 64px;    /* Section - Major divisions */
--space-20: 80px;    /* Page section */
--space-24: 96px;    /* Hero - Hero padding */
```

### Typography Scale

Apple HIG 11-level typography with San Francisco font system:

| Style | Size | Weight | Line Height | Use |
|-------|------|--------|-------------|-----|
| Large Title | 34px | Bold (700) | 1.2 | Page titles |
| Title 1 | 28px | Bold (700) | 1.25 | Main headings |
| Title 2 | 22px | Bold (700) | 1.3 | Section headings |
| Title 3 | 20px | Semibold (600) | 1.35 | Card titles |
| Headline | 17px | Semibold (600) | 1.4 | Emphasized body |
| Body | 17px | Regular (400) | 1.5 | Default text |
| Callout | 16px | Regular (400) | 1.5 | Callout text |
| Subhead | 15px | Regular (400) | 1.45 | Secondary text |
| Footnote | 13px | Regular (400) | 1.4 | Supplementary |
| Caption 1 | 12px | Regular (400) | 1.35 | Labels |
| Caption 2 | 11px | Regular (400) | 1.3 | Metadata |

### Border Radius

Apple concentricity principle - outer radius = inner radius + padding:

```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-apple: 10px;     /* Standard Apple radius */
--radius-lg: 12px;
--radius-apple-lg: 14px;  /* Cards and containers */
--radius-xl: 16px;
--radius-2xl: 20px;
--radius-full: 9999px;    /* Pills and circular elements */
```

### Shadows

Apple-style depth shadows:

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
--shadow-xl: 0 12px 40px rgba(0, 0, 0, 0.16);
--shadow-inset: inset 0 1px 2px rgba(0, 0, 0, 0.06);
```

### Motion (Animation)

#### Easing Curves

```css
--ease-apple-standard: cubic-bezier(0.25, 0.1, 0.25, 1);   /* Most transitions */
--ease-apple-emphasized: cubic-bezier(0.2, 0, 0, 1);       /* Important actions */
--ease-apple-spring: cubic-bezier(0.5, 0, 0.25, 1);        /* Interactive elements */
--ease-apple-bounce: cubic-bezier(0.68, -0.55, 0.27, 1.55); /* Playful (use sparingly) */
```

#### Durations

```css
--duration-instant: 100ms;   /* Hover states */
--duration-fast: 150ms;      /* Micro-interactions */
--duration-normal: 200ms;    /* Standard transitions */
--duration-slow: 300ms;      /* Page transitions */
--duration-slower: 400ms;    /* Complex animations */
```

### Z-Index Scale

```css
--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-fixed: 300;
--z-modal-backdrop: 400;
--z-modal: 500;
--z-popover: 600;
--z-tooltip: 700;
--z-toast: 800;
```

---

## Patterns

### Button

**Location:** `src/components/ui/button.tsx`

Buttons implement Apple HIG micro-interactions with hover lift and active press:

#### Variants

| Variant | Background | Text | Use Case |
|---------|------------|------|----------|
| default (Primary) | `--apple-accent` | White | Primary actions |
| destructive | `--apple-red` | White | Delete, danger |
| outline | Transparent | Primary | Secondary actions |
| secondary | `--surface-secondary` | Primary | Tertiary actions |
| ghost | Transparent | Primary | Icon buttons |
| link | Transparent | Accent | Inline links |

#### Sizes

All sizes ensure 44px minimum touch target (WCAG 2.5.5):

| Size | Height | Padding | Font |
|------|--------|---------|------|
| sm | 36px (min 44px target) | 12px | 13px |
| default | 40px | 16px | 14px |
| lg | 44px | 32px | 15px |
| icon | 44x44px | - | - |

#### States

```
Default -> Hover (scale 1.02, translateY -1px, shadow) -> Active (scale 0.97) -> Disabled (opacity 0.5)
```

#### Accessibility

- **Icon buttons MUST have `aria-label`**
- Focus ring: 2px solid accent, 2px offset
- Respects `prefers-reduced-motion`

### Card

**Location:** `src/components/ui/card.tsx`

Cards use Apple HIG surface elevation with optional interactive states:

#### Structure

```
Card
  CardHeader
    CardTitle      (Title 3 typography)
    CardDescription (Callout typography)
  CardContent
  CardFooter
```

#### States (Interactive Cards)

```
Default (shadow-md) -> Hover (shadow-lg, translateY -4px) -> Active (scale 0.97)
```

#### Usage

```tsx
// Static card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Interactive card
<Card interactive>
  ...
</Card>
```

### Input

**Location:** `src/components/ui/input.tsx`

Form inputs follow Apple HIG with animated focus states:

#### States

```
Default (border-primary) -> Hover (border-focus) -> Focus (ring + glow) -> Error (red ring) -> Disabled
```

#### Features

- WCAG 2.1 AA compliant placeholder color (4.5:1 contrast)
- 44px minimum height (touch target)
- Focus glow animation: `shadow-[0_0_0_4px_rgba(0,122,255,0.1)]`

#### Accessibility

- Always pair with `<Label htmlFor="...">`
- Use `aria-describedby` for hint/error messages
- Error messages should have `role="alert"`

### Modal (Dialog)

**Location:** `src/components/ui/dialog.tsx`

Modals implement Liquid Glass effect with Apple motion design:

#### Features

- **Liquid Glass:** `backdrop-blur-xl backdrop-saturate-200`
- **Overlay:** `bg-black/40 backdrop-blur-sm`
- **Border:** `border-white/20`
- **Shadow:** `shadow-2xl`
- **Radius:** `rounded-3xl` (Apple concentricity)

#### Animation

```
Closed -> Opening (fade + scale 0.95 -> 1.0) -> Open -> Closing (fade + scale 1.0 -> 0.95)
```

Duration: 200ms with `ease-apple-standard`

#### Structure

```
Dialog
  DialogTrigger
  DialogContent
    DialogHeader
      DialogTitle
      DialogDescription
    {children}
    DialogFooter
    DialogClose (X button)
```

### Glass Surface

**Location:** `src/components/ui/glass-surface.tsx`

Reusable Liquid Glass container component:

#### Intensity Levels

| Level | Blur | Saturation | Opacity |
|-------|------|------------|---------|
| light | 12px | 150% | 0.6 |
| medium (default) | 20px | 180% | 0.72 |
| heavy | 32px | 200% | 0.85 |
| solid | 32px | 200% | 0.95 |

#### Usage

```tsx
<GlassSurface intensity="medium" shadow="md" rounded="lg">
  Content here
</GlassSurface>
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

All components MUST meet these requirements:

1. **Color Contrast**
   - Normal text: 4.5:1 minimum
   - Large text (18px+ or 14px+ bold): 3:1 minimum
   - UI components: 3:1 minimum

2. **Touch Targets**
   - Minimum 44x44px for all interactive elements (WCAG 2.5.5)
   - Use `min-h-touch min-w-touch` utility classes

3. **Focus Indicators**
   - Visible focus ring: 2px solid accent (`--focus-ring-width`, `--focus-ring-color`)
   - Focus offset: 2px (`--focus-ring-offset`)
   - Focus glow: 4px accent light (`--focus-ring-glow`)
   - Never remove focus indicators
   - Use `focus-visible:ring-apple-accent` consistently across all components

4. **Motion**
   - Respect `prefers-reduced-motion`
   - Essential animations only when reduced motion enabled

5. **Screen Readers**
   - Icon buttons require `aria-label`
   - Form fields require associated labels
   - Error messages use `role="alert"`
   - Dynamic content uses `aria-live` regions

### Utility Classes

```css
.sr-only           /* Screen reader only (visually hidden) */
.touch-target      /* Minimum 44x44px */
.skip-link         /* Skip to main content */
.focus-within-ring /* Focus ring for containers */
.focus-ring        /* Standardized focus indicator utility */
```

### Focus Ring Tokens

All interactive components use standardized focus ring tokens:

```css
--focus-ring-color: var(--apple-accent);     /* #0066cc light, #409cff dark */
--focus-ring-width: 2px;                     /* Ring thickness */
--focus-ring-offset: 2px;                    /* Gap between element and ring */
--focus-ring-glow: 0 0 0 4px var(--apple-accent-light); /* Soft glow effect */
```

**Tailwind Usage:**
```tsx
// Standard focus ring for all interactive elements
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2"
```

**Important:** Always use `focus-visible` instead of `focus` to avoid showing ring on mouse click.

---

## Dark Mode

All tokens automatically adapt in dark mode via the `.dark` class on `<html>`:

### Key Differences

| Token | Light | Dark |
|-------|-------|------|
| `--surface-primary` | #ffffff | #1c1c1e |
| `--surface-secondary` | #f5f5f7 | #2c2c2e |
| `--text-primary` | #1d1d1f | #f5f5f7 |
| `--apple-accent` | #0066cc | #409cff |
| `--glass-surface-light` | rgba(255,255,255,0.72) | rgba(28,28,30,0.72) |

### High Contrast Mode

Enhanced tokens for `prefers-contrast: more`:

- Stronger borders
- Higher text contrast
- More opaque glass surfaces

---

## Component Checklist

When creating new components, ensure:

- [ ] Uses design tokens (no hardcoded colors/spacing)
- [ ] Implements all interactive states (hover, active, focus, disabled)
- [ ] 44px minimum touch target
- [ ] Focus ring with accent color
- [ ] Respects `prefers-reduced-motion`
- [ ] Dark mode compatible
- [ ] Accessible (ARIA, labels, contrast)
- [ ] TypeScript typed with proper props interface
- [ ] JSDoc documentation

---

## File Structure

```
frontend/
  .design-engineer/
    system.md              # This file - design system documentation
  src/
    styles/
      design-tokens.css    # Core CSS custom properties
      tokens/
        motion.css         # Animation tokens
        grid.css           # Grid system
      accessibility.css    # A11y utilities
    components/
      ui/                  # Primitive UI components
        button.tsx
        card.tsx
        input.tsx
        dialog.tsx
        glass-surface.tsx
        ...
      common/              # Composite components
        EmptyState.tsx
        LoadingState.tsx
        ErrorState.tsx
        SkipLink.tsx
        ...
```

---

## References

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Claude Design Engineer](https://github.com/Dammyjay93/claude-design-engineer)
- [Radix UI Primitives](https://www.radix-ui.com/)
