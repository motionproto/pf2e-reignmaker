# Surface & Background System

## Overview

The PF2e Reignmaker design system uses a hierarchical surface/background system with five subsystems:
1. **Empty + Surfaces** - Solid neutral backgrounds for UI elements
2. **Overlays** - Semi-transparent neutral layers for depth and emphasis
3. **Hover States** - Interactive feedback for buttons and clickable elements
4. **Colored Surfaces** - Semantic colored backgrounds for states (success, warning, danger, info, special)

This system replaced 472 hardcoded background colors across 97 files with consistent design tokens, and provides 30 additional colored surface variables for semantic states.

---

## 1. Empty + Surfaces (Solid Backgrounds)

### The Base Canvas
```css
--empty: var(--color-gray-950);  /* 6% lightness - The void beneath all UI */
```

**Usage:** The darkest layer representing the application background. Use for:
- Root application container backgrounds
- The "canvas" behind all panels and cards
- Areas meant to feel like empty space

### 7-Point Surface Hierarchy

Surfaces represent UI elements layered on top of the empty background. Think of them as elevation levels - lower surfaces are "further away" (darker), higher surfaces are "closer to the viewer" (lighter).

```css
--surface-lowest: var(--color-gray-900);  /* 10% - Deepest surface layer */
--surface-lower: var(--color-gray-850);   /* 16% - Recessed elements */
--surface-low: var(--color-gray-800);     /* 22% - Subtle panels */
--surface: var(--color-gray-700);         /* 32% - MIDPOINT - Standard surface */
--surface-high: var(--color-gray-600);    /* 44% - Elevated panels */
--surface-higher: var(--color-gray-500);  /* 56% - Prominent elements */
--surface-highest: var(--color-gray-400); /* 68% - Most elevated (modals, tooltips) */
```

### When to Use Each Level

#### `--surface-lowest` (10% lightness)
- Deep background panels
- Recessed sections within cards
- Table row alternate backgrounds
- Nested content areas

#### `--surface-lower` (16%)
- Secondary panels
- Sidebar backgrounds
- Nested cards within main cards
- Background for less prominent sections

#### `--surface-low` (22%)
- Content panels
- Card backgrounds (non-primary)
- Form section backgrounds
- List item backgrounds

#### `--surface` (32%) **← MIDPOINT - Use this as default**
- Primary card backgrounds
- Main content panels
- Standard UI component backgrounds
- Default choice for most surfaces

#### `--surface-high` (44%)
- Elevated cards
- Interactive panel backgrounds
- Prominent sections requiring emphasis
- Header backgrounds within cards

#### `--surface-higher` (56%)
- Highly elevated elements
- Active/selected states for panels
- Sticky headers
- Important notification panels

#### `--surface-highest` (68%)
- Modals and dialogs
- Popovers and dropdowns
- Tooltips
- Top-level overlays requiring maximum prominence

### Examples

```css
/* Main content area */
.kingdom-app {
  background: var(--empty);
}

/* Standard card */
.resource-card {
  background: var(--surface);
}

/* Elevated modal */
.dialog {
  background: var(--surface-highest);
}

/* Table with alternating rows */
.data-table tr:nth-child(even) {
  background: var(--surface-lowest);
}
```

---

## 2. Overlays (Semi-Transparent Layers)

Overlays add depth through semi-transparent black layers. Use these for:
- Darkening backgrounds behind modals
- Adding subtle depth to interactive elements
- Creating visual hierarchy within complex components
- Layering effects

```css
--overlay-lowest: rgba(0, 0, 0, 0.05);    /* Barely visible tint */
--overlay-lower: rgba(0, 0, 0, 0.1);      /* Very subtle overlay */
--overlay-low: rgba(0, 0, 0, 0.2);        /* Light overlay */
--overlay: rgba(0, 0, 0, 0.3);            /* MIDPOINT - Standard overlay */
--overlay-high: rgba(0, 0, 0, 0.5);       /* Heavy overlay */
--overlay-higher: rgba(0, 0, 0, 0.7);     /* Modal backdrop */
--overlay-highest: rgba(0, 0, 0, 0.95);   /* Nearly opaque */
```

### When to Use Each Level

#### `--overlay-lowest` (5% opacity)
- Subtle hover states on large areas
- Very light section dividers
- Barely perceptible depth

#### `--overlay-lower` (10%)
- Subtle background tints
- Light hover effects on cards
- Minimal visual separation

#### `--overlay-low` (20%)
- Standard panel backgrounds (when layered on surfaces)
- Subtle depth for nested sections
- Light modal backdrops

#### `--overlay` (30%) **← MIDPOINT**
- Standard overlay effects
- Moderate depth for sections
- Default choice for overlays

#### `--overlay-high` (50%)
- Heavy section backgrounds
- Strong visual separation
- Prominent overlay effects

#### `--overlay-higher` (70%)
- Modal/dialog backdrops
- Screen-dimming effects
- Strong emphasis overlays

#### `--overlay-highest` (95%)
- Full-screen overlays
- Loading screens
- Maximum prominence backdrops

### Examples

```css
/* Modal backdrop */
.modal-backdrop {
  background: var(--overlay-higher);
}

/* Section with subtle depth */
.info-panel {
  background: var(--overlay-low);
}

/* Nested card within card */
.nested-content {
  background: var(--overlay);
}
```

---

## 3. Hover States (Interactive Feedback)

White semi-transparent overlays for interactive elements. Use exclusively for hover states on buttons, cards, and clickable elements.

```css
--hover-low: rgba(255, 255, 255, 0.05);   /* Subtle hover effect */
--hover: rgba(255, 255, 255, 0.1);        /* Standard hover effect */
--hover-high: rgba(255, 255, 255, 0.15);  /* Prominent hover effect */
```

### When to Use Each Level

#### `--hover-low` (5% opacity)
- Large interactive areas (cards, panels)
- Subtle hover feedback
- Elements with existing strong styling

#### `--hover` (10%) **← Default**
- Standard buttons
- List items
- Default interactive elements

#### `--hover-high` (15%)
- Important actions
- Primary buttons
- Elements requiring strong visual feedback

### Examples

```css
/* Standard button hover */
.button:hover {
  background: var(--hover);
}

/* Subtle card hover */
.settlement-card:hover {
  background: var(--hover-low);
}

/* Strong interactive feedback */
.primary-action:hover {
  background: var(--hover-high);
}
```

---

## 4. Colored Surfaces (Semantic States)

Colored semi-transparent backgrounds for semantic states. Each color has a 5-point scale for varying intensities.

### Primary (Crimson/Red) - Danger & Errors

For errors, critical states, destructive actions, and danger warnings.

```css
--surface-primary-lower: rgba(239, 68, 68, 0.05);   /* Barely perceptible */
--surface-primary-low: rgba(239, 68, 68, 0.1);      /* Subtle */
--surface-primary: rgba(239, 68, 68, 0.15);         /* MIDPOINT - Default */
--surface-primary-high: rgba(239, 68, 68, 0.2);     /* More prominent */
--surface-primary-higher: rgba(239, 68, 68, 0.3);   /* Most prominent */
```

**Use for:**
- Error messages and alerts
- Destructive action confirmations (delete, disband)
- Critical failure states
- Danger warnings

### Success (Green) - Confirmations & Positive Feedback

For success states, confirmations, and positive outcomes.

```css
--surface-success-lower: rgba(34, 197, 94, 0.05);   /* Barely perceptible */
--surface-success-low: rgba(34, 197, 94, 0.1);      /* Subtle */
--surface-success: rgba(34, 197, 94, 0.15);         /* MIDPOINT - Default */
--surface-success-high: rgba(34, 197, 94, 0.2);     /* More prominent */
--surface-success-higher: rgba(34, 197, 94, 0.3);   /* Most prominent */
```

**Use for:**
- Success messages and confirmations
- Completed tasks/actions
- Critical success outcomes
- Positive state indicators

### Warning (Amber) - Cautions & Attention Needed

For warnings, cautions, and situations requiring attention.

```css
--surface-warning-lower: rgba(251, 191, 36, 0.05);  /* Barely perceptible */
--surface-warning-low: rgba(251, 191, 36, 0.1);     /* Subtle */
--surface-warning: rgba(251, 191, 36, 0.15);        /* MIDPOINT - Default */
--surface-warning-high: rgba(251, 191, 36, 0.2);    /* More prominent */
--surface-warning-higher: rgba(251, 191, 36, 0.3);  /* Most prominent */
```

**Use for:**
- Warning messages
- Caution indicators
- Pending actions requiring attention
- Resource shortages

### Accent (Amber) - Highlights & Featured Content

For emphasis, highlights, and featured content. Uses same color as warning but semantically distinct.

```css
--surface-accent-lower: rgba(251, 191, 36, 0.05);   /* Barely perceptible */
--surface-accent-low: rgba(251, 191, 36, 0.1);      /* Subtle */
--surface-accent: rgba(251, 191, 36, 0.15);         /* MIDPOINT - Default */
--surface-accent-high: rgba(251, 191, 36, 0.2);     /* More prominent */
--surface-accent-higher: rgba(251, 191, 36, 0.3);   /* Most prominent */
```

**Use for:**
- Featured/highlighted content
- Ongoing events
- Selected items (non-interactive)
- Important notifications

### Info (Blue) - Information & In-Progress

For information, neutral notifications, and in-progress states.

```css
--surface-info-lower: rgba(59, 130, 246, 0.05);     /* Barely perceptible */
--surface-info-low: rgba(59, 130, 246, 0.1);        /* Subtle */
--surface-info: rgba(59, 130, 246, 0.15);           /* MIDPOINT - Default */
--surface-info-high: rgba(59, 130, 246, 0.2);       /* More prominent */
--surface-info-higher: rgba(59, 130, 246, 0.3);     /* Most prominent */
```

**Use for:**
- Information messages
- In-progress indicators
- Neutral notifications
- Helper text backgrounds

### Special (Purple) - Premium & Unique States

For special items, unique states, and premium features.

```css
--surface-special-lower: rgba(147, 112, 219, 0.05); /* Barely perceptible */
--surface-special-low: rgba(147, 112, 219, 0.1);    /* Subtle */
--surface-special: rgba(147, 112, 219, 0.15);       /* MIDPOINT - Default */
--surface-special-high: rgba(147, 112, 219, 0.2);   /* More prominent */
--surface-special-higher: rgba(147, 112, 219, 0.3); /* Most prominent */
```

**Use for:**
- Special/unique settlements
- Premium features
- Rare items
- Magical/special events

### Examples

```css
/* Error notification */
.error-banner {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
}

/* Success confirmation */
.success-message {
  background: var(--surface-success-low);
  border-left: 3px solid var(--border-success);
}

/* Warning alert */
.warning-box {
  background: var(--surface-warning);
  border: 1px solid var(--border-accent);
}

/* Info panel */
.info-section {
  background: var(--surface-info-low);
}

/* Special item highlight */
.special-settlement {
  background: var(--surface-special-low);
  border: 1px solid var(--border-special);
}
```

---

## Migration Notes

### Legacy Variable Mapping

The old `--bg-*` system has been deprecated and replaced with backwards-compatible aliases:

```css
/* Legacy (deprecated) → New */
--bg-base → --empty
--bg-surface → --surface-lowest
--bg-elevated → --surface-lower
--bg-overlay → --surface-low
--bg-subtle → --surface
```

**Note:** These aliases will be removed in a future version. Update to the new surface system.

### Automated Migration

**Phase 1 - Neutral Backgrounds:** 472 instances migrated
- 256 overlay replacements (`rgba(0,0,0,...)` → `--overlay-*`)
- 124 hover replacements (`rgba(255,255,255,...)` → `--hover-*`)
- 92 legacy variable replacements (`--bg-*` → new system)

**Phase 2 - Colored Surfaces:** 170 instances migrated
- 54 files updated with semantic surface variables
- Red/Primary: `rgba(239,68,68,...)` → `--surface-primary-*`
- Green/Success: `rgba(34,197,94,...)` → `--surface-success-*`
- Amber/Accent: `rgba(251,191,36,...)` → `--surface-accent-*`
- Blue/Info: `rgba(59,130,246,...)` → `--surface-info-*`
- Purple/Special: `rgba(147,112,219,...)` → `--surface-special-*`

**Total: 642 hardcoded background colors eliminated**

---

## Design Philosophy

### Conceptual Model

Think of the UI as layers in physical space:

```
┌─────────────────────────────────────┐
│  --surface-highest (modals)         │ ← Closest to viewer
├─────────────────────────────────────┤
│  --surface-higher (elevated cards)  │
├─────────────────────────────────────┤
│  --surface-high (prominent panels)  │
├─────────────────────────────────────┤
│  --surface (standard cards)         │ ← MIDPOINT
├─────────────────────────────────────┤
│  --surface-low (subtle panels)      │
├─────────────────────────────────────┤
│  --surface-lower (recessed areas)   │
├─────────────────────────────────────┤
│  --surface-lowest (deep background) │
└─────────────────────────────────────┘
         --empty (the void)            ← Furthest from viewer
```

### Consistent Naming Pattern

All three subsystems follow the same naming pattern established by the border system:

- **Lowest/Faintest** - Barely perceptible
- **Lower/Faint** - Very subtle
- **Low/Subtle** - Subtle
- **[Base]** - **MIDPOINT** - Default choice
- **High/Medium** - More prominent
- **Higher/Strong** - Very prominent
- **Highest/Strongest** - Maximum prominence

This creates a consistent mental model across borders, surfaces, overlays, and hovers.

---

## Best Practices

### 1. Start with Midpoint
When in doubt, use the midpoint value:
- `--surface` for solid backgrounds
- `--overlay` for semi-transparent layers
- `--hover` for interactive states

### 2. Use Overlays for Layering
Prefer overlays when stacking elements on top of existing surfaces:

```css
/* Good - overlays on surfaces */
.card {
  background: var(--surface);
}
.card .nested-section {
  background: var(--overlay-low);
}

/* Less ideal - surfaces on surfaces */
.card {
  background: var(--surface);
}
.card .nested-section {
  background: var(--surface-low);  /* Can work but less semantic */
}
```

### 3. Reserve Highest Levels for True Elevation
Only use `--surface-highest` for elements that truly sit above all other content:
- Modals
- Tooltips
- Popovers
- Top-level dropdowns

### 4. Maintain Contrast
Ensure sufficient contrast between adjacent surface levels. Skip levels if needed:

```css
/* Good - clear visual hierarchy */
.outer-panel {
  background: var(--surface-lowest);
}
.inner-card {
  background: var(--surface);  /* Skipped 2 levels for clarity */
}

/* Risky - too subtle */
.outer-panel {
  background: var(--surface-lowest);
}
.inner-card {
  background: var(--surface-lower);  /* May not be visually distinct */
}
```

### 5. Consistent Hover Patterns
Use the same hover level within a component type:

```css
/* Consistent - all buttons use same hover */
.button:hover { background: var(--hover); }
.button.primary:hover { background: var(--hover); }
.button.secondary:hover { background: var(--hover); }

/* Inconsistent - confusing hierarchy */
.button:hover { background: var(--hover-low); }
.button.primary:hover { background: var(--hover-high); }
```

---

## Examples from Codebase

### Kingdom App Shell
```css
.kingdom-app {
  background: var(--empty);  /* Base canvas */
}

.main-content-panel {
  background: var(--surface);  /* Standard surface */
}

.modal-dialog {
  background: var(--surface-highest);  /* Elevated above all */
}

.modal-backdrop {
  background: var(--overlay-higher);  /* Dim the background */
}
```

### Interactive Table
```css
.data-table {
  background: var(--surface-low);
}

.data-table thead {
  background: var(--overlay-low);  /* Slight depth */
}

.data-table tr:nth-child(even) {
  background: var(--overlay-lowest);  /* Zebra striping */
}

.data-table tr:hover {
  background: var(--hover-low);  /* Interactive feedback */
}
```

### Card Component
```css
.settlement-card {
  background: var(--surface);
}

.settlement-card:hover {
  background: var(--hover-low);
}

.settlement-card .header {
  background: var(--overlay-low);
}

.settlement-card.selected {
  background: var(--surface-high);  /* Elevated when selected */
}
```

---

## Related Documentation

- [Border System](./border-system.md) - Consistent border colors and scales
- [Color Palette](./color-palette.md) - Complete color system reference
- [Design Tokens](./design-tokens.md) - All available design system variables
