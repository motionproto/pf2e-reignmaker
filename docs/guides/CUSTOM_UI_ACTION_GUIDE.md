# Custom UI for Action Resolution: Complete Guide

**Purpose:** Learn when and how to create custom resolution UI components for player actions.

**Last Updated:** 2025-11-28  
**Difficulty:** Intermediate

---

## ⚠️ CRITICAL: Quick Reference

**Use this when stuck - these are the non-negotiable requirements:**

### Event Structure (REQUIRED)
```typescript
// ✅ CORRECT - Use this exact pattern
dispatch('resolution', {
  isResolved: boolean,        // Controls Apply button state
  metadata: { ...yourData },  // Accessed via ctx.resolutionData.customComponentData
  modifiers: [...]            // Optional: for preview display
});

// ❌ WRONG - Don't use 'selection' event
dispatch('selection', { ... });

// ❌ WRONG - Don't put data at top level
dispatch('resolution', { yourData });
```

### Pipeline Configuration (REQUIRED)
```typescript
// ✅ CORRECT - Use postRollInteractions (shows BEFORE Apply clicked)
postRollInteractions: [
  {
    type: 'configuration',
    id: 'your-component',
    component: YourComponent
  }
]

// ❌ WRONG - Don't use postApplyInteractions (shows AFTER Apply clicked)
postApplyInteractions: [ ... ]
```

### Data Access in Execute (REQUIRED)
```typescript
// ✅ CORRECT - Read from customComponentData
execute: async (ctx) => {
  const data = ctx.resolutionData?.customComponentData?.yourDataKey;
}

// ❌ WRONG - Don't try to access from other locations
const data = ctx.metadata?.yourDataKey;
```

---

## Table of Contents

1. [When to Use Custom UI](#when-to-use-custom-ui)
2. [Data Flow (READ THIS FIRST)](#data-flow-read-this-first)
3. [Complete Working Example](#complete-working-example)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Common Mistakes](#common-mistakes)
6. [Debugging Checklist](#debugging-checklist)
7. [Performance Optimization](#performance-optimization)

---

## When to Use Custom UI

### Decision Tree

```
Does action need player selection after roll outcome?
├─ No → Use standard modifiers (StaticModifier, DiceModifier)
└─ Yes
   ├─ Simple resource choice? (e.g., "gain 2 food OR lumber")
   │  └─ Use choice-buttons modifier (JSON only, no code)
   │
   ├─ Complex selection? (e.g., allocate unrest across settlements)
   │  └─ Use custom component (this guide)
   │
   └─ Single resource from dropdown?
      └─ Use choice-dropdown modifier (JSON only, no code)
```

### When Custom UI is Needed

✅ **Use custom component when:**
- Multiple inputs needed (e.g., allocate unrest across settlements)
- Complex validation (e.g., can't exceed capacity)
- Dynamic options based on kingdom state (e.g., only settlements with prisons)
- Rich visual feedback needed (e.g., capacity bars, previews)

❌ **Don't use custom component when:**
- Simple A/B/C choice → Use `choice-buttons` modifier
- Single resource selection → Use `choice-dropdown` modifier
- No user input needed → Use static/dice modifiers

---

## Data Flow (READ THIS FIRST)

Understanding how data flows from component to execute function is critical:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Component Displays (postRollInteractions)                   │
│    - Outcome shown: "Critical Success!"                        │
│    - Custom component mounts inline                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. User Makes Selection                                         │
│    - Selects settlement: "Brevoy Prison"                       │
│    - Adjusts amount: 4 imprisoned unrest                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Component Emits 'resolution' Event                          │
│    dispatch('resolution', {                                     │
│      isResolved: true,                                         │
│      metadata: { allocations: { 'brevoy-id': 4 } },           │
│      modifiers: [...]                                          │
│    })                                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. OutcomeDisplay.handleComponentResolution()                  │
│    - Receives event                                            │
│    - Stores in customSelectionData (local)                    │
│    - Enables Apply button (isResolved === true)               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. User Clicks "Apply Result"                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. buildResolutionData()                                        │
│    - Merges customSelectionData into customComponentData      │
│    - Returns ResolutionData object                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Pipeline execute() Function                                 │
│    const allocations =                                         │
│      ctx.resolutionData.customComponentData.allocations;      │
│                                                                │
│    await gameCommands.allocateImprisonedUnrest(allocations);  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                      SUCCESS! ✅
```

**Key Points:**
- Component emits `'resolution'` event with `metadata` object
- Data is accessible in execute via `ctx.resolutionData.customComponentData`
- Use `isResolved: true` when selection is complete
- Modifiers are optional (for preview display only)

---

## Complete Working Example

**Arrest Dissidents** - Allocate imprisoned unrest to settlements with prisons

### Pipeline File
```typescript
// src/pipelines/actions/arrestDissidents.ts
import { createActionPipeline } from '../shared/createActionPipeline';
import ArrestDissidentsResolution from '../../view/kingdom/components/OutcomeDisplay/components/ArrestDissidentsResolution.svelte';

export const arrestDissidentsPipeline = createActionPipeline('arrest-dissidents', {
  // ✅ Use postRollInteractions (not postApplyInteractions)
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'arrest-details',
      component: ArrestDissidentsResolution,
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess'
    }
  ],

  execute: async (ctx) => {
    // ✅ Read from customComponentData (populated by component's metadata)
    const allocations = ctx.resolutionData?.customComponentData?.allocations;
    
    if (!allocations || Object.keys(allocations).length === 0) {
      return { 
        success: false, 
        error: 'No imprisoned unrest allocations provided' 
      };
    }

    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommands = await createGameCommandsService();
    
    const result = await gameCommands.allocateImprisonedUnrest(allocations);
    
    return result;
  }
});
```

### Component File
```svelte
<!-- src/view/kingdom/components/OutcomeDisplay/components/ArrestDissidentsResolution.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import { structuresService } from '../../../../../services/structures';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';

  // Props (automatically passed by OutcomeDisplay)
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;

  const dispatch = createEventDispatcher();

  // ✅ Calculate from outcome
  $: maxUnrestToImprison = outcome === 'criticalSuccess' ? 8 : 4;

  // ✅ Local state (not persisted until Apply clicked)
  let selectedSettlementId = '';
  let amount = 0;

  // ✅ Read from stores (dynamic kingdom state)
  $: currentUnrest = $kingdomData?.unrest || 0;

  $: settlementsWithJustice = ($kingdomData?.settlements || [])
    .map(settlement => {
      const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
      const currentImprisoned = settlement.imprisonedUnrest || 0;
      const availableSpace = capacity - currentImprisoned;
      return {
        ...settlement,
        justiceCapacity: capacity,
        availableSpace
      };
    })
    .filter(s => s.justiceCapacity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  $: selectedSettlement = settlementsWithJustice.find(s => s.id === selectedSettlementId) || 
    (settlementsWithJustice.length > 0 ? settlementsWithJustice[0] : null);
  
  $: maxToAdd = selectedSettlement 
    ? Math.min(maxUnrestToImprison, currentUnrest, selectedSettlement.availableSpace)
    : 0;

  // Auto-select first settlement
  $: if (settlementsWithJustice.length > 0 && !selectedSettlementId) {
    selectedSettlementId = settlementsWithJustice[0].id;
    emitSelection();
  }

  function handleSettlementChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedSettlementId = target.value;
    amount = 0;
    emitSelection();
  }

  function incrementAmount() {
    if (amount < maxToAdd) {
      amount++;
      emitSelection();
    }
  }

  function decrementAmount() {
    if (amount > 0) {
      amount--;
      emitSelection();
    }
  }

  function emitSelection() {
    // ✅ Build allocations object
    const allocations = amount > 0 && selectedSettlementId 
      ? { [selectedSettlementId]: amount }
      : {};

    // ✅ Build modifiers for preview
    const modifiers = [];
    if (amount > 0) {
      modifiers.push(
        { type: 'static', resource: 'unrest', value: -amount, duration: 'immediate' },
        { type: 'static', resource: 'imprisoned', value: amount, duration: 'immediate' }
      );
    }

    // ✅ CRITICAL: Dispatch 'resolution' event with metadata
    dispatch('resolution', {
      isResolved: amount > 0,      // Apply button enabled when amount selected
      metadata: { allocations },   // Accessed via ctx.resolutionData.customComponentData
      modifiers                    // Preview badges (optional)
    });
  }
</script>

<div class="arrest-dissidents-resolution">
  <h4>Imprison Dissidents</h4>
  
  {#if settlementsWithJustice.length === 0}
    <p>No settlements with justice structures available.</p>
  {:else}
    <select value={selectedSettlementId} on:change={handleSettlementChange}>
      {#each settlementsWithJustice as settlement}
        <option value={settlement.id}>
          {settlement.name} (space: {settlement.availableSpace})
        </option>
      {/each}
    </select>

    <div class="amount-controls">
      <button disabled={amount <= 0} on:click={decrementAmount}>-</button>
      <span>{amount}</span>
      <button disabled={amount >= maxToAdd} on:click={incrementAmount}>+</button>
    </div>

    {#if amount > 0 && selectedSettlement}
      <p>Will imprison {amount} unrest in {selectedSettlement.name}</p>
    {/if}
  {/if}
</div>
```

### Component Registry
```typescript
// src/view/kingdom/components/OutcomeDisplay/config/ComponentRegistry.ts
import ArrestDissidentsResolution from '../components/ArrestDissidentsResolution.svelte';

export const COMPONENT_REGISTRY: Record<string, any> = {
  'ArrestDissidentsResolution': ArrestDissidentsResolution,
  // ... other components
};
```

---

## Step-by-Step Implementation

### Step 1: Create Component File

**Location:** `src/view/kingdom/components/OutcomeDisplay/components/YourComponent.svelte`

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';

  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;

  const dispatch = createEventDispatcher();

  // Local state (not persisted)
  let selection = '';

  function handleSelect(value: string) {
    selection = value;
    
    // ✅ REQUIRED: Dispatch 'resolution' event
    dispatch('resolution', {
      isResolved: !!selection,           // Enable Apply button
      metadata: { selection },           // Your custom data
      modifiers: []                      // Optional preview
    });
  }
</script>

<div>
  <button on:click={() => handleSelect('option1')}>Option 1</button>
  <button on:click={() => handleSelect('option2')}>Option 2</button>
</div>
```

### Step 2: Register Component

**File:** `src/view/kingdom/components/OutcomeDisplay/config/ComponentRegistry.ts`

```typescript
import YourComponent from '../components/YourComponent.svelte';

export const COMPONENT_REGISTRY: Record<string, any> = {
  'YourComponent': YourComponent,
  // ... other components
};
```

### Step 3: Add to Pipeline

**File:** `src/pipelines/actions/yourAction.ts`

```typescript
import { createActionPipeline } from '../shared/createActionPipeline';
import YourComponent from '../../view/kingdom/components/OutcomeDisplay/components/YourComponent.svelte';

export const yourPipeline = createActionPipeline('your-action', {
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'your-component',
      component: YourComponent,
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess'
    }
  ],

  execute: async (ctx) => {
    // ✅ Read from customComponentData
    const selection = ctx.resolutionData?.customComponentData?.selection;
    
    if (!selection) {
      return { success: false, error: 'No selection made' };
    }

    // Apply changes
    console.log('User selected:', selection);
    
    return { success: true };
  }
});
```

---

## Common Mistakes

### ❌ Mistake 1: Using 'selection' Event

```typescript
// ❌ WRONG
dispatch('selection', {
  selectedResource: 'food',
  amount: 2
});
```

**✅ Fix:**
```typescript
// ✅ CORRECT
dispatch('resolution', {
  isResolved: true,
  metadata: {
    selectedResource: 'food',
    amount: 2
  },
  modifiers: [...]
});
```

### ❌ Mistake 2: Data Not in metadata

```typescript
// ❌ WRONG - data at top level
dispatch('resolution', {
  isResolved: true,
  selectedResource: 'food'  // ← Won't be accessible!
});
```

**✅ Fix:**
```typescript
// ✅ CORRECT - data in metadata
dispatch('resolution', {
  isResolved: true,
  metadata: {
    selectedResource: 'food'  // ← Accessible!
  }
});
```

### ❌ Mistake 3: Using postApplyInteractions

```typescript
// ❌ WRONG - shows as dialog AFTER Apply clicked
postApplyInteractions: [
  { type: 'configuration', component: YourComponent }
]
```

**✅ Fix:**
```typescript
// ✅ CORRECT - shows inline BEFORE Apply clicked
postRollInteractions: [
  { type: 'configuration', component: YourComponent }
]
```

### ❌ Mistake 4: Wrong Data Access in Execute

```typescript
// ❌ WRONG
execute: async (ctx) => {
  const data = ctx.metadata?.selection;  // ← undefined!
}
```

**✅ Fix:**
```typescript
// ✅ CORRECT
execute: async (ctx) => {
  const data = ctx.resolutionData?.customComponentData?.selection;  // ← works!
}
```

### ❌ Mistake 5: Using ValidationContext

```typescript
// ❌ WRONG - adds unnecessary complexity
import { getValidationContext } from '../context/ValidationContext';

const validationContext = getValidationContext();
onMount(() => {
  validationContext.register('my-component', { ... });
});
```

**✅ Fix:**
```typescript
// ✅ CORRECT - no validation context needed
// Use isResolved in 'resolution' event instead
dispatch('resolution', {
  isResolved: amount > 0,  // This controls Apply button
  metadata: { ... }
});
```

---

## Debugging Checklist

Use this checklist when your custom component isn't working:

### ✅ Component Registration
- [ ] Component file created in `components/OutcomeDisplay/components/`?
- [ ] Component exported from file (e.g., `ArrestDissidentsResolution.svelte`)?
- [ ] Component registered in `ComponentRegistry.ts`?
- [ ] Registry key matches component name exactly?

### ✅ Pipeline Configuration
- [ ] Pipeline uses `postRollInteractions` (not `postApplyInteractions`)?
- [ ] Component reference matches registry key?
- [ ] `condition` function returns true for expected outcomes?

### ✅ Component Event
- [ ] Component dispatches `'resolution'` event (not `'selection'`)?
- [ ] Event includes `isResolved` boolean?
- [ ] Event includes `metadata` object?
- [ ] Custom data nested inside `metadata`?

### ✅ Data Flow
- [ ] Execute function reads from `ctx.resolutionData.customComponentData`?
- [ ] Metadata key matches what component sends?
- [ ] Apply button enables when `isResolved === true`?

### ✅ Console Checks
- [ ] Check browser console for errors
- [ ] Look for "Looking up component:" log message
- [ ] Look for "Found in registry: true" log message
- [ ] Look for "Received resolution event:" log message

---

## Performance Optimization

### The Problem: Map Flashing

Every actor update triggers map redraws. Persisting data on every button click causes lag.

### The Solution: Local State

**❌ BAD - Persists on every click:**
```svelte
<script>
  async function incrementAmount() {
    amount++;
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { amount }  // ← Actor update → Map flash!
    });
  }
</script>
```

**✅ GOOD - Local state only:**
```svelte
<script>
  // Local variable (no persistence)
  let amount = 0;

  function incrementAmount() {
    amount++;  // ← No actor update → No flash!
    emitSelection();
  }

  function emitSelection() {
    // Only dispatches event (no persistence)
    dispatch('resolution', {
      isResolved: amount > 0,
      metadata: { amount }
    });
  }
</script>
```

**Performance comparison:**
- ❌ Persisting: 5 actor updates, 3 map flashes
- ✅ Local state: 2 actor updates, 0 map flashes

---

## Key Takeaways

1. ✅ **Always use `'resolution'` event** (not `'selection'`)
2. ✅ **Always nest data in `metadata` object**
3. ✅ **Always use `postRollInteractions`** (not `postApplyInteractions`)
4. ✅ **Always read from `ctx.resolutionData.customComponentData`**
5. ✅ **Use local state for interactive controls** (no persistence until Apply)
6. ✅ **Use `isResolved` to control Apply button** (no ValidationContext needed)
7. ✅ **Follow the Arrest Dissidents example** (complete working reference)

---

## Related Documentation

- [Inline Component Pattern](./INLINE_COMPONENT_PATTERN.md) - postRollInteractions vs postApplyInteractions
- [OutcomeDisplay System](../systems/outcome-display-system.md) - How components integrate
- [Pipeline Coordinator](../systems/pipeline-coordinator.md) - Complete flow
- [Typed Modifiers System](../systems/typed-modifiers-system.md) - Modifier patterns

**Need Help?** Check the [Debugging Checklist](#debugging-checklist) or study the [Arrest Dissidents example](#complete-working-example).
