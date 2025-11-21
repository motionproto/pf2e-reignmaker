# Map Selection Pattern - Best Practice

**Last Updated:** 2025-11-21  
**Status:** ✅ Production Pattern

## Overview

This document defines the **correct pattern** for map-selection interactions in action pipelines. This pattern ensures clean separation of concerns and automatic handling of hex selection visual states.

---

## The Problem (Anti-Pattern)

**❌ DON'T use `onComplete` handlers:**

```typescript
postApplyInteractions: [
  {
    type: 'map-selection',
    id: 'selectedHexes',
    colorType: 'scout',
    // ❌ WRONG: Executes game logic during interaction phase
    onComplete: async (hexIds, ctx) => {
      await sendScoutsExecution(hexIds);  // Step 8 logic in Step 7!
    }
  }
]
```

**Why this is bad:**
- Violates pipeline architecture (executes Step 8 during Step 7)
- Requires manual implementation for every action
- Easy to forget (not enforced by system)
- Creates maintenance burden

---

## The Solution (Correct Pattern)

**✅ DO read from `resolutionData` in `execute()`:**

```typescript
// Step 7: Interaction collects data (AUTOMATIC)
postApplyInteractions: [
  {
    type: 'map-selection',
    id: 'selectedHexes',  // ← Stored in resolutionData.compoundData.selectedHexes
    colorType: 'scout',
    validation: validateHex,
    outcomeAdjustment: { /* ... */ }
    // ✅ NO onComplete handler needed
  }
]

// Step 8: Execute reads from resolutionData (CONSISTENT)
execute: async (ctx) => {
  switch (ctx.outcome) {
    case 'success':
      // ✅ Read hex selections from resolutionData
      const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
      if (!hexIds || hexIds.length === 0) {
        return { success: false, error: 'No hexes selected' };
      }
      await sendScoutsExecution(hexIds);
      return { success: true };
  }
}
```

**Why this is correct:**
- Clean separation: Step 7 collects → Step 8 executes
- Automatic: UnifiedCheckHandler stores selections in `resolutionData`
- Consistent: Same pattern for ALL actions
- Maintainable: No manual coordination needed

---

## How It Works Automatically

### Step 7: `executePostApplyInteractions()`

**UnifiedCheckHandler automatically:**
1. Shows map selection UI
2. Waits for user to select hexes
3. Stores result in `resolutionData.compoundData[interaction.id]`

```typescript
// In UnifiedCheckHandler.ts (automatic)
case 'map-selection':
  resolutionData.compoundData[storeKey] = result;  // hexIds array
  break;
```

### Step 8: `executeCheck()`

**Pipeline reads from `resolutionData`:**
```typescript
const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
await yourExecutionFunction(hexIds);
```

---

## Visual State Management

**The hex selector handles ALL visual states automatically:**

1. **Hover State** - Preview color when mouse over hex (lower opacity)
2. **Selection State** - Selection color when hex clicked (higher opacity)  
   **→ Persists until "Done" clicked** (handled by HexSelectorService)
3. **Completion State** - Selection cleared, permanent overlays render

**You don't need to manage this!** The system handles:
- Rendering selection visuals
- Maintaining selection display
- Clearing selection after "Done"
- Showing completion panel
- Restoring permanent overlays

---

## Complete Example: Send Scouts

```typescript
export const sendScoutsPipeline: CheckPipeline = {
  id: 'send-scouts',
  name: 'Send Scouts',
  
  // Step 7: Define interaction (collects data)
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      colorType: 'scout',
      
      validation: (hexId: string) => {
        const isValid = checkIfValid(hexId);
        return isValid 
          ? { valid: true }
          : { valid: false, message: 'Custom error message' };
      },
      
      outcomeAdjustment: {
        criticalSuccess: { count: 2, title: 'Select 2 hexes' },
        success: { count: 1, title: 'Select 1 hex' },
        failure: { count: 0 }
      },
      
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      }
    }
  ],
  
  // Step 8: Execute logic (reads from resolutionData)
  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // ✅ Read from resolutionData (populated by Step 7)
        const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
        if (!hexIds || hexIds.length === 0) {
          return { success: false, error: 'No hexes selected' };
        }
        
        // Execute game logic
        await sendScoutsExecution(hexIds);
        return { success: true };
        
      case 'failure':
        return { success: true };
        
      default:
        return { success: false, error: 'Unexpected outcome' };
    }
  }
};
```

---

## Validation Pattern

**Return `ValidationResult` for better UX:**

```typescript
validation: (hexId: string) => {
  // Check condition
  if (!isValid(hexId)) {
    return {
      valid: false,
      message: 'Custom error message shown to user'
    };
  }
  
  return { valid: true };
}
```

---

## Key Takeaways

1. **NO `onComplete` handlers** - UnifiedCheckHandler stores data automatically
2. **Read from `resolutionData`** - Consistent pattern across all actions
3. **Visual states are automatic** - HexSelectorService handles everything
4. **Separation of concerns** - Step 7 collects, Step 8 executes

---

## Migration Checklist

If you find an action with `onComplete`:

- [ ] Remove `onComplete` handler from `postApplyInteractions`
- [ ] Update `execute()` to read from `ctx.resolutionData.compoundData[id]`
- [ ] Test that hex selection visual persists correctly
- [ ] Verify execution logic still works

---

## Actions Using This Pattern

All these actions follow the correct pattern (as of 2025-11-21):

| Action | Interaction ID | Color Type |
|--------|---------------|------------|
| Send Scouts | `selectedHexes` | scout |
| Claim Hexes | `selectedHexes` | claim |
| Build Roads | `selectedHexes` | road |
| Fortify Hex | `selectedHex` | fortify |
| Create Worksite | `selectedHex` | worksite |
| Establish Settlement | `location` (pre-roll) | settlement |
| Deploy Army | `path` (pre-roll) | movement |

**Note:** Pre-roll interactions store in `ctx.metadata`, not `ctx.resolutionData`.
