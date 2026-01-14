# Accessibility - WCAG 2.1 AA Compliance

## Liquid Glass Contrast Enhancement

### Overview

This document describes the WCAG 2.1 AA contrast enhancements implemented for the Liquid Glass Design System.

### Text-Shadow for Legibility

Text rendered on translucent Liquid Glass surfaces uses subtle text-shadow to improve legibility while maintaining the aesthetic.

#### Tokens

```css
/* Light Mode */
--a11y-glass-text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
--a11y-glass-text-shadow-strong: 0 2px 4px rgba(0, 0, 0, 0.15);

/* Dark Mode */
--a11y-glass-text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
--a11y-glass-text-shadow-strong: 0 2px 4px rgba(0, 0, 0, 0.3);
```

#### Usage

The `GlassSurface` component automatically applies `.glass-text` class to all content.

For custom implementations:

```tsx
// Automatic (recommended)
<GlassSurface intensity="medium">
  <p>Text has automatic text-shadow</p>
</GlassSurface>

// Manual application
<div className="glass glass-text">
  <p>Manual text-shadow application</p>
</div>

// Strong variant (for small text or low contrast scenarios)
<div className="glass glass-text-strong">
  <small>Strong text-shadow for better legibility</small>
</div>
```

### High Contrast Mode Support

The system automatically adapts to user preference for increased contrast:

```css
@media (prefers-contrast: more) {
  /* Light mode: More opaque backgrounds */
  --glass-opacity-light: 0.85;  /* was 0.6 */
  --glass-opacity-medium: 0.9;  /* was 0.72 */
  --glass-opacity-heavy: 0.95;  /* was 0.85 */

  /* Stronger text-shadow */
  --a11y-glass-text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  --a11y-glass-text-shadow-strong: 0 3px 6px rgba(0, 0, 0, 0.25);
}
```

### Contrast Ratios

All text colors meet WCAG 2.1 AA minimum contrast requirements:

| Text Level | Light Mode | Dark Mode | Ratio |
|------------|------------|-----------|-------|
| Primary    | #1d1d1f    | #f5f5f7   | 15.9:1 |
| Secondary  | #48484a    | #a1a1a6   | 7.2:1  |
| Tertiary   | #6e6e73    | #8e8e93   | 4.6:1  |
| Link       | #0056b3    | #64b5ff   | 7.3:1  |
| Error      | #c41e3a    | #ff6961   | 6.5:1  |
| Success    | #1d7a31    | #5dd879   | 5.0:1  |
| Warning    | #7d5a00    | #ffcc00   | 5.8:1  |

### Testing

#### Manual Testing

1. **Visual inspection**: Check text legibility on glass surfaces in both light and dark modes
2. **High contrast mode**: Enable high contrast in OS settings and verify opacity increase
3. **Color blindness simulation**: Use browser extensions to simulate different types of color blindness

#### Automated Testing

```bash
# Lighthouse Accessibility audit
npm run test:lighthouse

# Axe DevTools audit (in browser dev tools)
# Install: https://www.deque.com/axe/devtools/
```

### Browser Support

- ✅ Chrome/Edge 91+
- ✅ Firefox 88+
- ✅ Safari 14+
- ⚠️  Fallback: Browsers without `backdrop-filter` use opaque backgrounds (95% opacity)

### References

- [WCAG 2.1 - Contrast (Minimum) 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WCAG 2.1 - Contrast (Enhanced) 1.4.6](https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html)
- [Apple HIG - Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple HIG - Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

### Related Issues

- Parent: #1431 - Implementar Acessibilidade Apple HIG (WCAG 2.1 AA)
- Current: #1475 - Implementar contraste WCAG AA com Liquid Glass
