# Button-Based Choice Sets - Style Guide

## Overview

This guide documents the visual styling patterns for button-based choice sets used throughout the application. These patterns provide consistent, accessible visual feedback for multi-option selections.

**Primary Example:** `ResourceChoiceSelector.svelte`

---

## Visual States

Button-based choice sets have 4 distinct visual states:

1. **Default** - Initial, unselected state
2. **Hover** - Interactive feedback when cursor is over the button
3. **Selected** - Active/chosen state
4. **Disabled** - Inactive, non-interactive state

---

## Border + Outline Pattern

### State Progression

| State | Border | Outline | Notes |
|-------|--------|---------|-------|
| **Default** | `1px solid --border-default` | `2px solid transparent` | Border visible, outline invisible |
| **Hover** | `1px solid --border-default` | `2px solid transparent` | Unchanged (rely on background + shadow) |
| **Selected** | `1px solid --border-default` | `2px solid --border-success` | Outline overlays - **size stays constant** |
| **Disabled** | `1px solid --border-default` | `2px solid transparent` | Unchanged, opacity handles visual state |

### Key Pattern
- **Border is always visible** (1px solid on all states)
- **Outline overlays on selection** (transparent → semantic color)
- **Outline offset inward** (`-1px`) so it sits inside the border
- **Size never changes** - outline doesn't affect layout/box model
- **Text color remains white** (no color change)
- Border radius stays consistent: `--radius-lg`

### Code Example

```scss
.choice-button {
  // Border (visible on all states)
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  
  // Outline overlay (doesn't affect size)
  outline: 2px solid transparent;
  outline-offset: -1px;  // Sits inside the border
  
  &:hover:not(:disabled):not(.selected) {
    // Outline unchanged, rely on shadow for feedback
  }
  
  &.selected {
    outline-color: var(--border-success); // Overlays on top
  }
  
  &:disabled {
    // Border/outline unchanged, opacity handles visual state
  }
}
```

---

## Background Pattern

### State Progression

| State | Background | Visual Effect |
|-------|-----------|---------------|
| **Default** | `--hover-low` | Subtle semi-transparent white (5% opacity) |
| **Hover** | `--hover` | More prominent semi-transparent white (10% opacity) |
| **Selected** | `--surface-success-high` | Semantic colored surface (e.g., green @ 20% opacity) |
| **Disabled** | `--hover-low` | Same as default, reduced via opacity |

### Key Pattern
- **Default/Hover use neutral hovers** (`--hover-low`, `--hover`)
- **Selected uses semantic surfaces** (`--surface-success-high`, `--surface-primary-high`, etc.)
- Background provides the primary visual differentiation between selected/unselected
- All backgrounds are semi-transparent for depth

### Code Example

```scss
.choice-button {
  background: var(--hover-low);
  
  &:hover:not(:disabled):not(.selected) {
    background: var(--hover);
  }
  
  &.selected {
    background: var(--surface-success-high);
  }
  
  &:disabled {
    // Background unchanged, opacity on entire button handles state
    opacity: 0.4;
  }
}
```

---

## Complete Visual Reference

### State-by-State Breakdown

#### 1. Default State
```scss
.choice-button {
  // Background
  background: var(--hover-low);              // rgba(255, 255, 255, 0.05)
  
  // Border (visible)
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  
  // Outline (invisible but maintains size)
  outline: 2px solid transparent;
  outline-offset: -1px;
  
  // Other
  cursor: pointer;
  transition: all 0.2s;
}
```

**Visual Characteristics:**
- Subtle white tint background
- Visible border (1px solid)
- Invisible outline (ready to show on selection)
- Clearly clickable

---

#### 2. Hover State
```scss
.choice-button:hover:not(:disabled):not(.selected) {
  // Background (brighter)
  background: var(--hover);                  // rgba(255, 255, 255, 0.1)
  
  // Border/outline (unchanged)
  // border: 1px solid var(--border-default);
  // outline: 2px solid transparent;
  
  // Lift effect
  transform: translateY(-0.0625rem);         // -1px
  box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
}
```

**Visual Characteristics:**
- Brighter background (doubled opacity)
- Subtle lift via transform
- Shadow adds depth
- Border visible, outline still transparent

---

#### 3. Selected State
```scss
.choice-button.selected {
  // Background (semantic color)
  background: var(--surface-success-high);   // rgba(34, 197, 94, 0.2)
  
  // Border (unchanged)
  // border: 1px solid var(--border-default);
  
  // Outline (colored overlay - size stays same!)
  outline-color: var(--border-success);      // Design system border color
  outline-offset: -1px;                      // Sits inside border
  
  // Text color (remains white)
  // color: var(--text-primary);
}
```

**Visual Characteristics:**
- Semantic colored background (green for success/confirmation)
- **Colored outline overlay** for emphasis (size unchanged)
- Border still visible underneath
- Outline color matches semantic intent
- Text color remains white for consistency
- **No size shift** - outline doesn't affect layout

**Semantic Color Variations:**
- Success: `--surface-success-high` + `--border-success`
- Warning: `--surface-warning-high` + `--border-accent`
- Info: `--surface-info-high` + `--border-info`
- Primary: `--surface-primary-high` + `--border-primary`

---

#### 4. Disabled State
```scss
.choice-button:disabled {
  // Entire button opacity reduced
  opacity: 0.4;
  
  // Cursor change
  cursor: not-allowed;
  
  // Background/border unchanged (opacity handles everything)
}
```

**Visual Characteristics:**
- Same base styling as default
- 40% opacity on entire element
- Non-clickable cursor
- No hover effects

---

## Additional Visual Enhancements

### Transforms
```scss
&:hover:not(:disabled):not(.selected) {
  transform: translateY(-0.0625rem);  // Subtle lift on hover
}
```

### Shadows
```scss
&:hover:not(:disabled):not(.selected) {
  box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
}
```

### Transitions
```scss
transition: all 0.2s;  // Smooth state changes
```

### Focus States (Accessibility)
```scss
&:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Layout Patterns

### Flex Container
```scss
.choice-button-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-10);  // Consistent spacing between buttons
}
```

### Individual Button Sizing
```scss
.choice-button {
  padding: var(--space-10) var(--space-16);  // Comfortable tap target
  
  // Content layout
  display: flex;
  align-items: center;
  gap: var(--space-8);  // Icon-to-text spacing
}
```

---

## Complete Code Template

```scss
// Container
.choice-button-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-10);
}

// Base button
.choice-button {
  // Layout
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-10) var(--space-16);
  
  // Background
  background: var(--hover-low);
  
  // Border (visible on all states)
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  
  // Outline (overlay, doesn't affect size)
  outline: 2px solid transparent;
  outline-offset: -1px;  // Sits inside border
  
  // Typography
  font-size: var(--font-md);
  font-weight: 500;
  color: var(--text-primary);
  
  // Interaction
  cursor: pointer;
  transition: all 0.2s;
  
  // Icon styling (if present)
  i {
    font-size: var(--font-lg);
    color: var(--text-secondary);
    transition: color 0.2s;
  }
  
  // Hover state
  &:hover:not(:disabled):not(.selected) {
    background: var(--hover);
    transform: translateY(-0.0625rem);
    box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
  }
  
  // Selected state
  &.selected {
    background: var(--surface-success-high);
    outline-color: var(--border-success);
  }
  
  // Disabled state
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
```

---

## Semantic Color Variations

When the selected state needs different semantic meaning, swap the color tokens:

### Success (Positive Action - Default)
```scss
&.selected {
  background: var(--surface-success-high);
  outline-color: var(--border-success);
}
```

### Warning (Caution Required)
```scss
&.selected {
  background: var(--surface-warning-high);
  outline-color: var(--border-accent);
}
```

### Info (Neutral Selection)
```scss
&.selected {
  background: var(--surface-info-high);
  outline-color: var(--border-info);
}
```

### Primary (Emphasis/Danger)
```scss
&.selected {
  background: var(--surface-primary-high);
  outline-color: var(--border-primary);
}
```

---

## Quick Reference Table

| Element | Default | Hover | Selected | Disabled |
|---------|---------|-------|----------|----------|
| **Background** | `--hover-low` | `--hover` | `--surface-success-high` ⭐ | `--hover-low` |
| **Border** | `1px --border-default` | `1px --border-default` | `1px --border-default` | `1px --border-default` |
| **Outline** | `transparent` | `transparent` | `--border-success` ⭐ | `transparent` |
| **Text Color** | `--text-primary` | `--text-primary` | `--text-primary` | `--text-primary` |
| **Transform** | `none` | `translateY(-1px)` | `none` | `none` |
| **Shadow** | `none` | `0 2px 8px overlay-low` | `none` | `none` |
| **Opacity** | `1` | `1` | `1` | `0.4` ⭐ |
| **Cursor** | `pointer` | `pointer` | `pointer` | `not-allowed` |

⭐ = Key differentiator

---

## Design Principles

### 1. **Border Always Visible**
A 1px border is present on all states, providing clear button boundaries.

### 2. **Outline Overlays on Selection**
The outline changes from transparent to semantic color, overlaying the border without affecting size.

### 3. **Background Provides Primary Feedback**
The shift from neutral hover (`--hover-low/--hover`) to semantic surface (`--surface-success-high`) is the primary visual signal.

### 4. **Size Never Changes**
Using outline with negative offset means the button size remains constant across all states - no layout shift.

### 5. **Text Color Remains Consistent**
Text color stays white (`--text-primary`) across all states for clarity and readability.

### 6. **Hover is Non-Destructive**
Hover never conflicts with selection - the `:not(.selected)` selector ensures hover effects don't override selected styling.

### 7. **Opacity Handles Disabled**
Rather than redefining all properties, disabled state simply reduces opacity on the entire element.

---

## Related Documentation

- [Surface & Background System](./surface-background-system.md) - Token reference
- [Border System](./border-system.md) - Border token reference
- [Design Tokens](./design-tokens.md) - Complete variable list

---

## Real-World Example

**File:** `src/view/kingdom/components/OutcomeDisplay/components/ResourceChoiceSelector.svelte`

**Usage:** Player selects which resource to gain after a successful Harvest Resources action.

**Visual Flow:**
1. User sees 4 resource buttons (Food, Lumber, Stone, Ore) in default state
2. Hovering over \"Lumber\" shows subtle lift and brighter background
3. Clicking \"Lumber\" applies selected state: green background + green border outline (no size change)
4. Other buttons remain in default state, showing clear visual hierarchy

**Design System Integration:**
- Uses `--border-default` for base borders (consistent across all choice buttons)
- Uses `--border-success` for selection outline (leverages semantic border colors)
- All border colors follow the 5-point luminance scale (faint → strong)
