# Inline Component Pattern: postRollInteractions vs postApplyInteractions

**Purpose:** Understand when to use inline vs dialog components in pipeline actions  
**Last Updated:** 2025-11-23  
**Status:** ✅ Production Pattern

---

## Overview

Pipeline actions support custom components at two different timing points:
- **`postRollInteractions`** - Display BEFORE user clicks "Apply Result" (inline in OutcomeDisplay)
- **`postApplyInteractions`** - Display AFTER user clicks "Apply Result" (as dialog/modal)

**Rule of thumb:** Most components should use `postRollInteractions` for better UX.

---

## The Pattern

### ✅ Inline Display (postRollInteractions)

**When to use:**
- Resource selection (Purchase Resources, Sell Surplus, Harvest Resources)
- Configuration that affects the preview (user needs to see impact before applying)
- Simple selections that should be part of the outcome display

**Architecture:**
```typescript
export const yourPipeline = createActionPipeline('your-action', {
  // Component shows BEFORE "Apply Result" clicked
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'YourSelector',  // Resolved via ComponentRegistry
      condition: (ctx) => ctx.outcome === 'success'
      // NO onComplete handler - execution happens in execute()
    }
  ],

  execute: async (ctx) => {
    // Read user selection from customComponentData
    const customData = ctx.resolutionData?.customComponentData;
    
    if (!customData?.selectedResource) {
      console.warn('No selection made');
      return { success: true };
    }
    
    // Apply changes
    await applyResourceChanges([
      { resource: customData.selectedResource, amount: customData.amount }
    ], 'your-action');
    
    return { success: true };
  }
});
```

**Data flow:**
1. User sees outcome
2. Component displays inline (BEFORE "Apply Result")
3. User makes selection → stored in `ctx.resolutionData.customComponentData`
4. User clicks "Apply Result"
5. `execute()` reads from `customComponentData` and applies changes

### ❌ Dialog Display (postApplyInteractions) - Rarely Used

**When to use:**
- Complex workflows that need separate dialog
- Post-application configuration (not common)

**Why rarely used:**
- Interrupts flow (outcome → apply → dialog → apply again)
- Less intuitive UX
- Requires `onComplete` handler

---

## Key Differences

| Aspect | postRollInteractions | postApplyInteractions |
|--------|---------------------|----------------------|
| **Timing** | Before "Apply Result" | After "Apply Result" |
| **Display** | Inline in OutcomeDisplay | Separate dialog/modal |
| **Data storage** | `ctx.resolutionData.customComponentData` | Same |
| **Execution** | In pipeline's `execute()` | In `onComplete` handler |
| **Use cases** | Resource selection, configuration | Complex post-apply workflows |
| **UX** | Smooth, single flow | Interrupts with extra dialog |

---

## Common Mistake: Using Wrong Interaction Timing

**❌ WRONG - Opens as dialog:**
```typescript
postApplyInteractions: [  // ← WRONG timing
  {
    type: 'configuration',
    component: 'ResourceSelector'
  }
]
```

**✅ CORRECT - Displays inline:**
```typescript
postRollInteractions: [  // ← CORRECT timing
  {
    type: 'configuration',
    component: 'ResourceSelector'
  }
]
```

---

## Migration Example: Sell Surplus

**Before (dialog mode):**
```typescript
postApplyInteractions: [  // Opens as dialog
  {
    type: 'configuration',
    component: 'SellResourceSelector',
    onComplete: async (data, ctx) => {
      // Execute here - wrong timing!
      await applyResourceChanges([...], 'sell-surplus');
    }
  }
]

execute: async (ctx) => {
  // Nothing to do - already handled in onComplete
  return { success: true };
}
```

**After (inline mode):**
```typescript
postRollInteractions: [  // Displays inline
  {
    type: 'configuration',
    component: 'SellResourceSelector'
    // NO onComplete handler
  }
]

execute: async (ctx) => {
  // Read selection and execute here
  const customData = ctx.resolutionData?.customComponentData;
  
  if (!customData?.selectedResource) {
    return { success: true };
  }
  
  await applyResourceChanges([
    { resource: customData.selectedResource, amount: -customData.selectedAmount },
    { resource: 'gold', amount: customData.goldGained }
  ], 'sell-surplus');
  
  return { success: true };
}
```

**Changes:**
1. ✅ `postApplyInteractions` → `postRollInteractions`
2. ✅ Removed `onComplete` handler
3. ✅ Moved execution logic to `execute()`
4. ✅ Read from `ctx.resolutionData.customComponentData`

---

## Component Implementation

**Component doesn't change** - timing is determined by pipeline configuration, not component code.

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { OutcomePreview } from '../../../../../models/CheckInstance';
  
  export let instance: OutcomePreview | null = null;
  export let outcome: string;
  
  const dispatch = createEventDispatcher();
  
  function handleSelection(resource: string) {
    // Store selection data
    dispatch('resolution', {
      selectedResource: resource,
      amount: calculateAmount()
    });
  }
</script>

<div class="selector">
  <button on:click={() => handleSelection('food')}>Food</button>
  <button on:click={() => handleSelection('lumber')}>Lumber</button>
</div>
```

**Note:** Same component works for both `postRollInteractions` and `postApplyInteractions` - the difference is when/how it displays.

---

## ResolutionDataBuilder and Dice Modifiers

**Important fix (2025-11-23):** ResolutionDataBuilder now correctly skips dice modifiers in the modifier loop to prevent double-application.

### The Problem

Dice modifiers were being applied twice:
1. **Lines 47-75:** Auto-converted from `outcomeBadges` to `numericModifiers`
2. **Lines 107-144:** Processed from original `modifiers` array again

**Example:** User rolls 3 on 1d4 for Purchase Resources critical failure
- Expected: -3 gold
- Actual: -6 gold (double penalty!)

### The Solution

Added skip logic in ResolutionDataBuilder:

```typescript
// Case 3: No choices, apply all modifiers
else {
  if (modifiers) {
    for (let i = 0; i < modifiers.length; i++) {
      const mod = modifiers[i] as any;

      // ⚠️ SKIP DICE MODIFIERS: Already converted from outcomeBadges
      // This prevents double-application of penalties/bonuses
      if (mod.type === 'dice' && mod.formula) {
        continue;
      }
      
      // Process static modifiers normally...
    }
  }
}
```

**Same fix applied to Case 1** for consistency.

### Impact

**Fixed actions:**
- `purchase-resources`
- `sell-surplus`
- `infiltration`
- `collect-stipend`
- `request-economic-aid`

All actions with dice modifiers (`type: "dice"`) now apply penalties/bonuses correctly (once, not twice).

---

## Best Practices

### ✅ DO:
- Use `postRollInteractions` for resource selection
- Store data in `customComponentData`
- Read from `ctx.resolutionData.customComponentData` in `execute()`
- Use `applyResourceChanges()` helper for resource modifications
- Let `ResolutionDataBuilder` handle dice badge conversion automatically

### ❌ DON'T:
- Use `postApplyInteractions` unless you need a separate dialog
- Use `onComplete` handlers (execution should happen in `execute()`)
- Manually convert dice badges to modifiers (auto-converted)
- Duplicate modifier processing (leads to double-application)

---

## Examples in Production

**Actions using inline components (postRollInteractions):**
- Purchase Resources (`PurchaseResourceSelector`)
- Sell Surplus (`SellResourceSelector`)
- Harvest Resources (`ResourceChoiceSelector`)

**All follow the same pattern:**
1. Component in `postRollInteractions`
2. No `onComplete` handler
3. Execution in pipeline's `execute()`
4. Read from `ctx.resolutionData.customComponentData`

---

## Related Documentation

- [Custom UI Action Guide](./CUSTOM_UI_ACTION_GUIDE.md) - Component implementation
- [Pipeline Coordinator](../systems/pipeline-coordinator.md) - Step-by-step flow
- [Typed Modifiers System](../systems/typed-modifiers-system.md) - Badge conversion

---

## Key Takeaways

1. **Use `postRollInteractions` by default** - Better UX, inline display
2. **No `onComplete` handlers needed** - Execute in pipeline's `execute()`
3. **ResolutionDataBuilder handles dice conversion** - Don't process dice modifiers manually
4. **Dice modifiers are auto-converted from badges** - Skip them in modifier loops to prevent double-application
5. **Same component works for both timings** - Pipeline config determines when it displays
