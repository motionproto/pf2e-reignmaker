# Svelte Component Refactoring Guide

**For breaking down large Svelte components into maintainable, modular structures**

---

## When to Refactor

Refactor a component when:
- **File exceeds 300-400 lines**
- **Difficult to navigate or test**
- **Multiple concerns mixed together**

---

## Standard Structure

```
ComponentName/
├── ComponentName.svelte          # Main orchestrator (~200-300 lines)
├── logic/                        # Business logic (optional)
│   └── ComponentNameLogic.ts
└── components/                   # Sub-components (5-10 focused files)
    ├── SubComponent1.svelte
    ├── SubComponent2.svelte
    └── ...
```

**Import Pattern (Svelte Standard):**
```typescript
import ComponentName from './ComponentName/ComponentName.svelte';
```

**⚠️ DO NOT use `index.ts` files** - Svelte convention prefers explicit imports.

---

## Refactoring Steps

### 1. Create Folder Structure

```bash
mkdir -p src/view/path/ComponentName/{logic,components}
mv src/view/path/ComponentName.svelte src/view/path/ComponentName/ComponentName.svelte
```

### 2. Identify Sub-Components

Look for distinct sections:
- ✅ Visual sections (header, footer, cards)
- ✅ Repeated markup patterns
- ✅ Interactive widgets (forms, buttons, selectors)
- ✅ Complex conditional blocks (`{#if}`, `{#each}`)

**Goal:** Extract 5-10 focused sub-components with single responsibilities.

### 3. Extract Sub-Components

Create each sub-component with this pattern:

```svelte
<!-- ComponentName/components/SubComponent.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Input from parent
  export let propName: string;
  export let optionalProp: number = 0;
  
  // Output to parent
  const dispatch = createEventDispatcher();
  
  // Local UI state only (no business logic)
  let localState = false;
  
  function handleAction() {
    dispatch('actionName', { data: 'value' });
  }
</script>

<div class="sub-component">
  <!-- UI markup only -->
</div>

<style lang="scss">
  /* Scoped styles */
</style>
```

**Key Principles:**
- ✅ **Single Responsibility** - One clear purpose
- ✅ **Props for input** - Parent passes data
- ✅ **Events for output** - Component dispatches to parent
- ✅ **Minimal logic** - Presentation only
- ✅ **Self-contained** - Include related styles

### 4. Refactor Main Component

Update the main component to compose sub-components:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Import sub-components
  import SubComponent1 from './components/SubComponent1.svelte';
  import SubComponent2 from './components/SubComponent2.svelte';
  
  // Import logic helpers
  import { helperFunction } from './logic/ComponentNameLogic';
  
  // Main component props
  export let mainProp: string;
  
  // Orchestration state
  let orchestrationState = {};
  
  // Event handlers - coordinate between sub-components
  function handleSubEvent(event: CustomEvent) {
    const { data } = event.detail;
    // Coordinate logic here
  }
</script>

<div class="component-name">
  <SubComponent1 
    prop={value} 
    on:action={handleSubEvent} 
  />
  
  <SubComponent2 
    prop={value} 
  />
</div>

<style lang="scss">
  /* Layout/container styles only */
  .component-name {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
</style>
```

**Main Component Responsibilities:**
- ✅ Import and compose sub-components
- ✅ Manage shared state coordination
- ✅ Handle event routing between sub-components
- ✅ Provide container layout
- ❌ **NO** complex UI rendering (delegate to sub-components)

### 5. Update Parent Imports

Find all files importing the component:

```bash
grep -r "from.*ComponentName" src/ --include="*.svelte"
```

Update each import to the explicit path:

```typescript
// Before:
import ComponentName from './components/ComponentName.svelte';

// After:
import ComponentName from './components/ComponentName/ComponentName.svelte';
```

### 6. Test & Validate

- ✅ Component renders correctly
- ✅ All interactions work as before
- ✅ Events propagate properly
- ✅ No TypeScript errors
- ✅ Styles are scoped correctly

---

## Component Patterns

### Display-Only Component
```svelte
<script lang="ts">
  export let title: string;
  export let description: string;
</script>

<div class="display-card">
  <h3>{title}</h3>
  <p>{description}</p>
</div>
```

### Interactive Component
```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let options: string[];
  export let selected: string | null = null;
  
  const dispatch = createEventDispatcher();
  
  function handleSelect(option: string) {
    dispatch('select', { option });
  }
</script>

<div class="selector">
  {#each options as option}
    <button 
      class:selected={option === selected}
      on:click={() => handleSelect(option)}
    >
      {option}
    </button>
  {/each}
</div>
```

### Conditional Component
```svelte
<script lang="ts">
  export let data: any | undefined = undefined;
  
  $: hasData = data !== undefined;
</script>

{#if hasData && data}
  <div class="data-display">
    <!-- Render data -->
  </div>
{/if}
```

---

## Anti-Patterns to Avoid

❌ **Don't create `index.ts` files** - Use explicit `.svelte` imports  
❌ **Don't mix business logic in components** - Delegate to controllers/services  
❌ **Don't create too many tiny components** - Aim for meaningful sections (5-10)  
❌ **Don't break component boundaries** - Each should be self-contained  
❌ **Don't use global state** - Pass props and emit events  

---

## Success Metrics

**Before Refactoring:**
- Main file: 600-1000+ lines
- Difficult to navigate
- Hard to test specific features
- Mixed concerns

**After Refactoring:**
- Main file: 200-300 lines
- Clear component hierarchy
- Easy to test in isolation
- Separation of concerns
- Reusable sub-components

---

## Example: OutcomeDisplay Refactoring

**Before:**
- `OutcomeDisplay.svelte` - 800+ lines

**After:**
```
OutcomeDisplay/
├── OutcomeDisplay.svelte              # 250 lines (orchestrator)
├── logic/
│   └── OutcomeDisplayLogic.ts
└── components/
    ├── OutcomeHeader.svelte           # Header section
    ├── OutcomeMessage.svelte          # Message display
    ├── RollBreakdown.svelte           # Roll details
    ├── ManualEffects.svelte           # Manual effects list
    ├── DiceRoller.svelte              # Dice rolling widget
    ├── ResourceSelector.svelte        # Resource dropdowns
    ├── ChoiceButtons.svelte           # Choice selection
    ├── StateChanges.svelte            # Resource changes
    └── OutcomeActions.svelte          # Action buttons
```

**Result:** 800+ lines → 250 lines main file + 9 focused components

---

## Quick Checklist

- [ ] Created folder structure (`ComponentName/`, `logic/`, `components/`)
- [ ] Moved original component into folder
- [ ] Identified 5-10 distinct sub-components
- [ ] Extracted each sub-component with clear props/events
- [ ] Refactored main component to use sub-components
- [ ] Updated all parent component imports (explicit `.svelte` paths)
- [ ] No `index.ts` files (not Svelte standard)
- [ ] Tested component functionality
- [ ] Verified no TypeScript errors
- [ ] Reduced main file to ~200-300 lines

---

**Last Updated:** January 2025  
**Based on:** OutcomeDisplay refactoring (800+ → 250 lines)
