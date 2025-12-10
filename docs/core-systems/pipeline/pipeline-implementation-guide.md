# Pipeline Implementation Guide

**Purpose:** Practical guide for developers implementing new actions, events, and incidents

**Last Updated:** 2025-12-10

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Implementation Checklist](#implementation-checklist)
3. [Testing Workflow](#testing-workflow)
4. [Common Mistakes](#common-mistakes)
5. [Debugging Tips](#debugging-tips)

---

## Quick Start

### Step 1: Choose Your Pattern

Refer to [pipeline-patterns.md](./pipeline-patterns.md) and pick the pattern that matches your needs:

| Pattern | When to Use |
|---------|-------------|
| **No Interactions** | Simple modifier application only |
| **Pre-Roll Entity Selection** | Need entity selection before rolling |
| **Post-Apply Map Selection** | Hex selection after applying |
| **Post-Roll Component** | User choice affects outcome (inline UI) |
| **Post-Apply Component** | Complex configuration after apply |
| **Pre + Post-Apply** | Both entity selection + hex selection |

### Step 2: Copy Reference Implementation

Find a similar action in `src/pipelines/actions/` and copy its structure:

```bash
# Example: Creating a new action similar to claim-hexes
cp src/pipelines/actions/claimHexes.ts src/pipelines/actions/myNewAction.ts
```

### Step 3: Customize Pipeline Definition

Update the pipeline ID, name, and interactions:

```typescript
export const myNewActionPipeline = createActionPipeline('my-new-action', {
  // Update interactions as needed
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      count: 1,
      colorType: 'claim',
      condition: (ctx) => ctx.outcome === 'success'
    }
  ],
  
  execute: async (ctx) => {
    // JSON modifiers already applied by execute-first pattern
    
    // Access selected hexes
    const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
    
    if (!hexIds || hexIds.length === 0) {
      return { success: true, cancelled: true };
    }
    
    // Your custom logic here
    await doSomething(hexIds);
    
    return { success: true };
  }
});
```

### Step 4: Register Pipeline

Add to `src/pipelines/PipelineRegistry.ts`:

```typescript
import { myNewActionPipeline } from './actions/myNewAction';

// Register in appropriate section
pipelines.set('my-new-action', myNewActionPipeline);
```

### Step 5: Test in Foundry

1. Run `npm run dev` (HMR enabled)
2. Open Foundry VTT
3. Test all outcomes (crit success, success, failure, crit fail)
4. Verify state changes apply correctly

---

## Implementation Checklist

Use this checklist when implementing any new action:

### Planning Phase

- [ ] Identify which pattern to use (see [pipeline-patterns.md](./pipeline-patterns.md))
- [ ] Find reference implementation with similar pattern
- [ ] List required interactions (pre-roll, post-roll, post-apply)
- [ ] Determine if custom execute logic is needed

### Development Phase

- [ ] Create pipeline file in `src/pipelines/actions/`
- [ ] Define pipeline structure (interactions, execute)
- [ ] Register pipeline in `PipelineRegistry.ts`
- [ ] Add JSON outcome data (if needed) in `data/player-actions/`
- [ ] Implement execute function (if custom logic needed)

### Testing Phase

- [ ] Test critical success outcome
- [ ] Test success outcome
- [ ] Test failure outcome
- [ ] Test critical failure outcome
- [ ] Test cancellation paths (if interactive)
- [ ] Verify resource changes apply correctly
- [ ] Verify game commands execute (if any)
- [ ] Test reroll with fame (if applicable)

### Documentation Phase

- [ ] Update action count in pattern lookup table
- [ ] Add to testing status tracker (if exists)
- [ ] Document any special behaviors

---

## Testing Workflow

### Manual Testing in Foundry

**Systematic approach for testing all outcomes:**

```
1. Open kingdom sheet → Actions tab
2. Click action → Skill check card appears
3. Test Critical Success:
   - Set DC low (e.g., 10)
   - Roll high (e.g., 25+)
   - Verify outcome display shows "Critical Success"
   - Click "Apply Result"
   - Verify state changes
   
4. Repeat for Success, Failure, Critical Failure
   - Adjust DC and roll to force each outcome
   - Verify all modifiers apply correctly
   - Check for console errors

5. Test Cancellation (if interactive):
   - Start action
   - Cancel during interaction
   - Verify graceful handling
```

### Testing Reroll

```
1. Perform action with modifiers (structure bonus, aid, etc.)
2. Roll (any outcome)
3. Click "Reroll with Fame"
4. Verify:
   - Fame deducted
   - Same modifiers applied to new roll
   - New outcome displayed
   - Can apply result normally
```

### Debugging Checklist

See full guide: [../../guides/debugging-guide.md](../../guides/debugging-guide.md)

**Quick checks:**

- [ ] Check browser console for errors
- [ ] Verify pipeline registered in PipelineRegistry
- [ ] Check interaction IDs match between pipeline and execute
- [ ] Verify data accessed from correct location (metadata vs resolutionData)
- [ ] Check for null/undefined values before use

---

## Common Mistakes

### ❌ Mistake 1: Re-Rolling Dice in Execute

**WRONG:**
```typescript
preview: {
  calculate: (ctx) => ({
    outcomeBadges: [diceBadge('Lose {{value}} Gold', 'fa-coins', '2d4', 'negative')]
  })
},
execute: async (ctx) => {
  // ❌ BAD: Re-rolling dice that were already rolled in UI
  const roll = await new Roll('2d4').evaluate();
  await updateKingdom(k => { k.resources.gold -= roll.total; });
}
```

**CORRECT:**
```typescript
preview: {
  calculate: (ctx) => ({
    outcomeBadges: [diceBadge('Lose {{value}} Gold', 'fa-coins', '2d4', 'negative')]
  })
},
// ✅ GOOD: No execute needed - badge handles everything
execute: undefined
```

### ❌ Mistake 2: Wrong Data Access Location

**WRONG:**
```typescript
execute: async (ctx) => {
  // ❌ Post-apply data is NOT in metadata
  const hexes = ctx.metadata?.selectedHexes;
}
```

**CORRECT:**
```typescript
execute: async (ctx) => {
  // ✅ Post-apply map data is in resolutionData.compoundData
  const hexes = ctx.resolutionData.compoundData?.selectedHexes;
}
```

### ❌ Mistake 3: Not Handling Cancellation

**WRONG:**
```typescript
execute: async (ctx) => {
  const config = ctx.resolutionData?.customComponentData?.config;
  await doSomething(config.value);  // ❌ Crashes if user cancelled!
}
```

**CORRECT:**
```typescript
execute: async (ctx) => {
  const config = ctx.resolutionData?.customComponentData?.config;
  if (!config) {
    return { success: true, cancelled: true };  // ✅ Graceful
  }
  await doSomething(config.value);
}
```

### ❌ Mistake 4: Wrong Interaction Type

**WRONG:**
```typescript
postApplyInteractions: [
  {
    type: 'entity-selection',  // ❌ Should be 'map-selection'
    mode: 'hex-selection'
  }
]
```

**CORRECT:**
```typescript
postApplyInteractions: [
  {
    type: 'map-selection',  // ✅ Correct for hexes
    mode: 'hex-selection'
  }
]
```

---

## Debugging Tips

### Console Logging

Add strategic logging to track execution:

```typescript
execute: async (ctx) => {
  console.log('🎯 [my-action] Execute started', {
    outcome: ctx.outcome,
    metadata: ctx.metadata,
    resolutionData: ctx.resolutionData
  });
  
  const hexes = ctx.resolutionData.compoundData?.selectedHexes;
  console.log('🎯 [my-action] Selected hexes:', hexes);
  
  if (!hexes) {
    console.warn('⚠️ [my-action] No hexes selected');
    return { success: true, cancelled: true };
  }
  
  await doSomething(hexes);
  console.log('✅ [my-action] Execute complete');
  
  return { success: true };
}
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Action not found" | Pipeline not registered | Check PipelineRegistry.ts |
| "Cannot read property X of undefined" | Accessing wrong data location | Check metadata vs resolutionData |
| Dice re-rolled on apply | Rolling in execute | Remove execute, use badge only |
| Modifiers not applied | Execute-first pattern bypassed | Don't set `skipDefaultModifiers: true` |
| Custom component not showing | Component not in registry | Add to ComponentRegistry in OutcomeDisplay |

### Browser DevTools

**Useful breakpoints:**

1. `PipelineCoordinator.step3_executeRoll()` - Check modifiers before roll
2. `PipelineCoordinator.step8_executeAction()` - Check execution data
3. `OutcomeDisplay.handleComponentResolution()` - Check component data

**Inspect kingdom data:**

```javascript
// In browser console
const actor = game.actors.getName('Party');
const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
console.log('Kingdom:', kingdom);
console.log('Pending outcomes:', kingdom.pendingOutcomes);
console.log('Turn state:', kingdom.turnState);
```

---

## Data Access Quick Reference

| Data Type | Set During | Access Pattern |
|-----------|-----------|----------------|
| Pre-roll entity selection | Step 2 | `ctx.metadata?.settlementselection?.id` |
| Post-apply hex selection | Step 7 | `ctx.resolutionData.compoundData?.selectedHexes` |
| Post-apply custom component | Step 7 | `ctx.resolutionData?.customComponentData?.configuration` |
| Rolled dice values | Step 6 (UI) | `ctx.resolutionData.numericModifiers` (auto-applied) |

---

## Helper Functions

### For Dynamic Costs in Execute

```typescript
// Simple modifier application
const gameCommandsService = await createGameCommandsService();
await gameCommandsService.applyNumericModifiers([
  { resource: 'gold', value: -cost },
  { resource: 'unrest', value: 1 }
], ctx.outcome);

// With rich source tracking
await gameCommandsService.applyOutcome({
  type: 'action',
  sourceId: 'my-action',
  sourceName: `My Action (${entityName})`,
  outcome: ctx.outcome,
  modifiers: calculatedModifiers
});
```

### For Upfront Costs (Before Roll)

```typescript
// Deduct costs defined in pipeline.cost
await applyActionCost(myPipeline);
```

---

## Related Documentation

- **[pipeline-coordinator.md](./pipeline-coordinator.md)** - Core 9-step architecture
- **[pipeline-patterns.md](./pipeline-patterns.md)** - Pattern reference with examples
- **[pipeline-advanced-features.md](./pipeline-advanced-features.md)** - Custom components, reroll, etc.
- **[ROLL_FLOW.md](./ROLL_FLOW.md)** - Roll execution details
- **[../../guides/debugging-guide.md](../../guides/debugging-guide.md)** - Comprehensive debugging guide
- **[../../guides/testing-guide.md](../../guides/testing-guide.md)** - Systematic testing guide

---

**Status:** ✅ Production Ready  
**Last Updated:** 2025-12-10
