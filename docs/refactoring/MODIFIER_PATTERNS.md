# Modifier Application Patterns

**Purpose:** Guide for applying modifiers in action execute functions

**Last Updated:** 2025-11-23

---

## 🎯 Quick Decision Tree

```
Does your action have modifiers?
├─ NO → No helper needed, just custom logic
└─ YES → What type of modifiers?
    ├─ STATIC only (fixed values) → Use applyPipelineModifiers()
    └─ DICE (random rolls) → Use applyPreRolledModifiers()
```

---

## Pattern 1: No Modifiers

**When:** Action has no resource changes defined in JSON

**Example Actions:** None currently (most actions have some modifier)

```typescript
execute: async (ctx) => {
  // Just custom logic
  if (ctx.outcome === 'success') {
    // Do something...
    return { success: true };
  }
  
  return { success: true };
}
```

---

## Pattern 2: Static Modifiers Only

**When:** Action has fixed resource changes (e.g., `-4 gold`, `+1 unrest`)

**Example Actions:** 
- diplomatic-mission (fixed gold costs)
- Most actions with upfront costs

**Helper:** `applyPipelineModifiers()`

**JSON Example:**
```json
{
  "outcomes": {
    "success": {
      "modifiers": [
        {
          "type": "static",
          "resource": "gold",
          "value": -4
        }
      ]
    }
  }
}
```

**Execute Function:**
```typescript
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

execute: async (ctx) => {
  // Apply static modifiers from JSON
  const result = await applyPipelineModifiers(pipeline, ctx.outcome);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  // Custom logic...
  return { success: true };
}
```

---

## Pattern 3: Dice Modifiers (MOST COMMON)

**When:** Action has random resource changes (e.g., `2d6 gold`, `1d4+1 unrest`)

**Example Actions:**
- request-economic-aid (2d6 gold on crit, 1d4+1 on success)
- request-military-aid (similar pattern)
- Any action with dice rolls in outcomes

**Helper:** `applyPreRolledModifiers()`

**JSON Example:**
```json
{
  "outcomes": {
    "criticalSuccess": {
      "modifiers": [
        {
          "type": "dice",
          "resource": "gold",
          "formula": "2d6"
        }
      ]
    },
    "success": {
      "modifiers": [
        {
          "type": "dice",
          "resource": "gold",
          "formula": "1d4+1"
        }
      ]
    }
  }
}
```

**Execute Function:**
```typescript
import { applyPreRolledModifiers } from '../shared/applyPreRolledModifiers';

execute: async (ctx) => {
  if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
    // ✅ Apply pre-rolled dice modifiers (rolled in UI during Step 6)
    const result = await applyPreRolledModifiers(ctx);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // Custom logic...
    return { success: true, message: 'Aid provided!' };
  }
  
  return { success: true };
}
```

---

## Pattern 4: Mixed Modifiers

**When:** Action has both static and dice modifiers

**Example:** An action that costs `-2 gold` upfront and grants `1d6 lumber` on success

**Solution:** Use both helpers

```typescript
execute: async (ctx) => {
  // Apply static costs first
  await applyPipelineModifiers(pipeline, ctx.outcome);
  
  if (ctx.outcome === 'success') {
    // Apply dice rewards
    const result = await applyPreRolledModifiers(ctx);
    if (!result.success) {
      return { success: false, error: result.error };
    }
  }
  
  return { success: true };
}
```

---

## 🔍 Why Two Helpers?

### The Pipeline Architecture

**Step 5:** JSON modifiers → Outcome badges
- Static modifiers: Show as `+4 Gold` badge (no interaction)
- Dice modifiers: Show as `Roll 2d6 Gold` badge (dice button)

**Step 6:** User clicks dice buttons
- Dice values rolled and stored in `ctx.resolutionData.numericModifiers`

**Step 8:** Execute function applies changes
- Static modifiers: Read directly from JSON via `applyPipelineModifiers()`
- Dice modifiers: Read rolled values from context via `applyPreRolledModifiers()`

### Why `applyPipelineModifiers()` doesn't work for dice

The helper calls `GameCommandsService.applyOutcome()` which expects **pre-rolled values** for dice modifiers. It has no way to roll dice itself (that happens in UI), so it throws:

```
Error: Dice modifier "gold" has no pre-rolled value - 
dice must be rolled in UI before applying
```

This is **by design** - dice rolling must happen in the UI so users can see the results.

---

## ❌ Common Mistakes

### Mistake 1: Using `applyPipelineModifiers()` for dice
```typescript
// ❌ WRONG - will throw error
execute: async (ctx) => {
  await applyPipelineModifiers(pipeline, ctx.outcome); // Has dice modifiers!
  return { success: true };
}
```

**Fix:** Use `applyPreRolledModifiers()` instead

### Mistake 2: Trying to roll dice in execute
```typescript
// ❌ WRONG - dice should be rolled in UI (Step 6), not here (Step 8)
execute: async (ctx) => {
  const roll = new Roll('2d6');
  await roll.evaluate();
  // ...
}
```

**Fix:** Dice are already rolled in `ctx.resolutionData.numericModifiers`

### Mistake 3: Not checking for errors
```typescript
// ❌ WRONG - doesn't handle failure
execute: async (ctx) => {
  await applyPreRolledModifiers(ctx); // What if this fails?
  return { success: true };
}
```

**Fix:** Always check result
```typescript
// ✅ CORRECT
execute: async (ctx) => {
  const result = await applyPreRolledModifiers(ctx);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true };
}
```

---

## 📚 Related Documentation

- **Architecture Overview:** See `.clinerules/ARCHITECTURE_SUMMARY.md` - Pipeline Architecture section
- **Testing Guide:** See `docs/refactoring/TESTING_GUIDE.md` - Common Issues section
- **Debugging Guide:** See `docs/refactoring/DEBUGGING_GUIDE.md` - Dice modifier errors

---

## 🔧 Helper Function Reference

### `applyPipelineModifiers(pipeline, outcome)`

**Purpose:** Apply static modifiers directly from pipeline JSON

**When to use:** Action has only static (fixed value) modifiers

**Source:** `src/pipelines/shared/applyPipelineModifiers.ts`

**Parameters:**
- `pipeline: CheckPipeline` - The action pipeline
- `outcome: OutcomeDegree` - The outcome ('criticalSuccess', 'success', etc.)

**Returns:** `Promise<{ success: boolean; error?: string }>`

---

### `applyPreRolledModifiers(ctx)`

**Purpose:** Apply dice modifiers that were rolled in UI (Step 6)

**When to use:** Action has dice modifiers (e.g., '2d6', '1d4+1')

**Source:** `src/pipelines/shared/applyPreRolledModifiers.ts`

**Parameters:**
- `ctx: CheckContext` - The full check context (includes rolled values)

**Returns:** `Promise<{ success: boolean; error?: string }>`

**How it works:**
1. Extracts `ctx.resolutionData.numericModifiers` (rolled in OutcomeDisplay)
2. Calls `GameCommandsService.applyNumericModifiers()`
3. Applies all rolled values at once (with accumulation)

---

## 🎓 Migration Guide

### Migrating from old pattern

**Before (manual boilerplate):**
```typescript
execute: async (ctx) => {
  const numericModifiers = ctx.resolutionData?.numericModifiers || [];
  
  if (numericModifiers.length > 0) {
    const gameCommandsService = await createGameCommandsService();
    const result = await gameCommandsService.applyNumericModifiers(
      numericModifiers, 
      ctx.outcome
    );
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
  }
  
  // ... rest of logic
}
```

**After (clean helper):**
```typescript
import { applyPreRolledModifiers } from '../shared/applyPreRolledModifiers';

execute: async (ctx) => {
  const result = await applyPreRolledModifiers(ctx);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  // ... rest of logic
}
```

**Benefits:**
- 70% less boilerplate
- Clearer intent
- Consistent error handling
- Better logging

---

## 📝 Quick Reference Card

```typescript
// NO MODIFIERS - Just custom logic
execute: async (ctx) => { /* ... */ }

// STATIC MODIFIERS - Use applyPipelineModifiers
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
await applyPipelineModifiers(pipeline, ctx.outcome);

// DICE MODIFIERS - Use applyPreRolledModifiers
import { applyPreRolledModifiers } from '../shared/applyPreRolledModifiers';
const result = await applyPreRolledModifiers(ctx);
if (!result.success) return { success: false, error: result.error };
