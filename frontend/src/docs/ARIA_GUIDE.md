# ARIA Implementation Guide - ETP Express

## Overview

This guide documents ARIA (Accessible Rich Internet Applications) implementation across ETP Express frontend components, ensuring WCAG 2.1 AA compliance and Apple HIG accessibility standards.

## Core Principles

1. **Semantic HTML First**: Use native HTML elements before adding ARIA
2. **ARIA is for Enhancement**: Don't override native semantics unless necessary
3. **Test with Screen Readers**: Verify with VoiceOver (macOS/iOS) and NVDA (Windows)
4. **No ARIA is Better than Bad ARIA**: Incorrect ARIA can make things worse

---

## Component-Specific ARIA Implementation

### 1. Button Component (`button.tsx`)

#### Icon Buttons - REQUIRED aria-label

When using `size="icon"` variant, `aria-label` is **REQUIRED**:

```tsx
// ✅ CORRECT - Icon button with aria-label
<Button size="icon" aria-label="Delete item">
  <Trash className="h-4 w-4" />
</Button>

// ❌ WRONG - Missing aria-label
<Button size="icon">
  <Trash className="h-4 w-4" />
</Button>
```

#### Buttons with Text - aria-label Optional

```tsx
// ✅ CORRECT - Text is inherently accessible
<Button>Save Changes</Button>

// ⚠️ OPTIONAL - Override if visual text differs from intent
<Button aria-label="Save ETP draft">Save</Button>
```

#### Loading States

```tsx
<Button disabled aria-busy="true" aria-label="Salvando...">
  <Loader2 className="animate-spin" aria-hidden="true" />
  Salvando...
</Button>
```

---

### 2. Input Component (`input.tsx`)

#### With FormField Component (Automatic aria-describedby)

```tsx
<FormField
  id="etp-title"
  label="Título do ETP"
  required
  hint="Máximo 100 caracteres"
  error={errors.title}
>
  <Input id="etp-title" {...register('title')} />
</FormField>
```

FormField automatically:

- Links label via `htmlFor`
- Adds `aria-describedby` pointing to hint/error
- Adds `role="alert"` to error messages

#### Manual Implementation

```tsx
<Label htmlFor="email">Email</Label>
<Input
  id="email"
  type="email"
  aria-describedby="email-hint email-error"
  aria-invalid={!!errors.email}
/>
<span id="email-hint" className="text-sm text-muted-foreground">
  We'll never share your email
</span>
{errors.email && (
  <span id="email-error" className="text-sm text-destructive" role="alert">
    {errors.email.message}
  </span>
)}
```

#### Required Fields

```tsx
<Label htmlFor="required-field">
  Nome
  <span className="text-destructive" aria-hidden="true">*</span>
</Label>
<Input
  id="required-field"
  required
  aria-required="true"
/>
```

---

### 3. Toast Component (`toast.tsx`)

#### Default Toast (aria-live="polite")

```tsx
toast({
  title: 'Success',
  description: 'Your changes have been saved.',
});
```

Screen reader announces: **"Success. Your changes have been saved."**

#### Destructive Toast (aria-live="assertive")

For errors that need immediate attention:

```tsx
toast({
  variant: 'destructive',
  title: 'Error',
  description: 'Failed to save. Please try again.',
});
```

Screen reader interrupts: **"Error. Failed to save. Please try again."**

#### Toast with Action

```tsx
<Toast>
  <ToastTitle>ETP Deleted</ToastTitle>
  <ToastDescription>Your ETP has been removed</ToastDescription>
  <ToastAction altText="Undo deletion">Undo</ToastAction>
  <ToastClose />
</Toast>
```

`ToastClose` includes `aria-label="Fechar notificação"` automatically.

---

### 4. Dropdown Menu Component (`dropdown-menu.tsx`)

Radix UI automatically provides:

- `aria-expanded` on trigger (true/false based on state)
- `role="menu"` on content
- `role="menuitem"` on items
- Focus management and keyboard navigation

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Open options">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### 5. Skip Links (`SkipLink.tsx`)

Already implemented for WCAG 2.4.1 (Bypass Blocks):

```tsx
import { SkipLink } from '@/components/common/SkipLink';

// In Layout
<SkipLink targetId="main-content" label="Skip to main content" />
<nav>...</nav>
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

CSS in `accessibility.css` makes it visible only on focus.

---

## Common ARIA Attributes

### aria-label vs aria-labelledby

```tsx
// aria-label: Provides text label directly
<button aria-label="Close dialog">
  <X />
</button>

// aria-labelledby: References existing element
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Deletion</h2>
  ...
</div>
```

### aria-describedby

Links to description/hint text:

```tsx
<Input
  id="password"
  aria-describedby="password-requirements"
/>
<ul id="password-requirements">
  <li>At least 8 characters</li>
  <li>Include number and symbol</li>
</ul>
```

### aria-live

Announces dynamic content changes:

```tsx
// Polite: Wait for user to finish
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Assertive: Interrupt immediately (errors only)
<div aria-live="assertive" role="alert">
  {criticalError}
</div>
```

### aria-hidden

Hides decorative elements from screen readers:

```tsx
<Button>
  <Save className="mr-2" aria-hidden="true" />
  Save Changes
</Button>
```

### aria-expanded

For expandable content (collapsible, accordions):

```tsx
<button
  aria-expanded={isOpen}
  aria-controls="content-id"
>
  {isOpen ? 'Hide' : 'Show'} Details
</button>
<div id="content-id" hidden={!isOpen}>
  ...
</div>
```

### aria-busy

Indicates loading state:

```tsx
<div aria-busy="true" aria-label="Loading content">
  <Spinner />
</div>
```

### aria-invalid

Marks fields with validation errors:

```tsx
<Input
  id="email"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>;
{
  errors.email && (
    <span id="email-error" role="alert">
      {errors.email.message}
    </span>
  );
}
```

---

## Testing Checklist

### Automated Testing

- [ ] Run `axe DevTools` Chrome extension
- [ ] Check Lighthouse Accessibility score (target: 100)
- [ ] Run `npm test` (includes accessibility tests)

### Manual Testing

#### VoiceOver (macOS)

```bash
# Enable VoiceOver
Cmd + F5

# Navigate
VO + Right/Left Arrow (elements)
VO + U (rotor menu)
Tab (interactive elements)
```

#### NVDA (Windows)

```bash
# Install NVDA (free, open-source)
https://www.nvaccess.org/download/

# Navigate
Down/Up Arrow (elements)
Tab (interactive elements)
Insert + F7 (elements list)
```

### Test Scenarios

1. **Icon Buttons**: Verify all icon-only buttons announce their purpose
2. **Forms**: Check field labels, hints, and error announcements
3. **Dynamic Content**: Toast messages should announce without stealing focus
4. **Dropdowns**: aria-expanded should toggle correctly
5. **Skip Links**: Tab once on page load should show skip link

---

## Common Pitfalls

### ❌ DON'T

```tsx
// 1. Don't use aria-label when visible text exists
<Button aria-label="Save">Save</Button>

// 2. Don't hide interactive elements
<Button aria-hidden="true">Click me</Button>

// 3. Don't use role when native element exists
<div role="button" onClick={...}>Click</div> // Use <button>

// 4. Don't duplicate descriptions
<Input placeholder="Email" aria-label="Email" /> // Redundant
```

### ✅ DO

```tsx
// 1. Use semantic HTML
<button onClick={...}>Click me</button>

// 2. aria-label only for icons/non-text
<Button size="icon" aria-label="Close">
  <X />
</Button>

// 3. Hide decorative icons
<Button>
  <Save aria-hidden="true" />
  Save
</Button>

// 4. Use aria-describedby for additional context
<Input
  id="email"
  aria-describedby="email-hint"
/>
<span id="email-hint">We'll never share</span>
```

---

## Resources

- [ARIA Authoring Practices (WAI-ARIA 1.2)](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)

---

## Issue Reference

**Issue #1477**: [A11Y-1431c] Implement screen reader support (ARIA)
**Parent Issue #1431**: Implement Apple HIG Accessibility (WCAG 2.1 AA)

---

**Last Updated**: 2026-01-14
**Maintained by**: ETP Express Frontend Team
