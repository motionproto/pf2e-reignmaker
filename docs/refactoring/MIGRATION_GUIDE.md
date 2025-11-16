# Unified Check Resolution System: Migration Guide

**Purpose:** Step-by-step implementation plan for unifying Actions, Events, and Incidents

**Last Updated:** 2025-11-16

---

## Quick Start

**Goal:** Migrate 26 actions from custom implementations to unified CheckPipeline configs.

**Current Progress:** 14/26 actions (54%) - See `ACTION_MIGRATION_CHECKLIST.md`

**Architecture:** See `PIPELINE_DATA_FLOW.md` for complete data flow and interaction patterns.

---

## ⚠️ CRITICAL PATTERNS (Read Before Migrating)

Before migrating any action, understand these three critical patterns to avoid common bugs:

1. **[Dice Modifier Pattern](#️-critical-dice-modifier-pattern-common-mistake)** - Prevents double-rolling
2. **[Shared Execution Functions](#️-critical-shared-execution-functions-dry-principle)** - Avoid code duplication
3. **[Declarative Modifiers](#️-critical-declarative-modifiers-vs-execution-functions)** - When to use modifiers vs. execute()

---

## Implementation Order

1. **Core Handler Structure** - UnifiedCheckHandler skeleton, type definitions ✅
2. **Preview Infrastructure** - Preview calculation and formatting ✅
3. **Game Commands Refactor** - Extract execution functions, eliminate globals ✅
4. **Simple Actions** (9) - Resource-only actions 🔄 **In Progress**
5. **Pre-Roll Dialog Actions** (7) - Entity selection actions 🔄 **In Progress**
6. **Game Command Actions** (5) - Actions with complex execution
7. **Custom Resolution Actions** (5) - Special logic actions
8. **Events** (37) - Convert to pipeline configs
9. **Incidents** (30) - Convert to pipeline configs
10. **Cleanup** - Remove old code, archive docs

---

## ⚠️ CRITICAL: Dice Modifier Pattern (COMMON MISTAKE)

**Problem:** Dice modifiers are automatically evaluated by the system. Do NOT roll dice manually in `execute()`.

**How It Works:**
1. User clicks Apply → System evaluates ALL dice modifiers in `outcomes`
2. Results stored in `ctx.resolutionData.numericModifiers`
3. Execute function reads these PRE-ROLLED values
4. Same dice values shown in preview are applied

### ❌ WRONG: Rolling Dice in execute()

```typescript
export const requestEconomicAidPipeline: CheckPipeline = {
  outcomes: {
    criticalSuccess: {
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }
      ]
    }
  },
  
  execute: async (ctx) => {
    // ❌ WRONG - Rolling AGAIN causes double-roll bug!
    const roll = await new Roll('2d6').evaluate();
    const goldAmount = roll.total || 0;
    
    await updateKingdom(k => {
      k.resources.gold += goldAmount;  // Different value than preview!
    });
  }
};
```

**Result:** Gold value changes between preview and application ❌

### ✅ CORRECT: Reading Pre-Rolled Values

```typescript
export const requestEconomicAidPipeline: CheckPipeline = {
  outcomes: {
    criticalSuccess: {
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }
      ]
    }
  },
  
  execute: async (ctx) => {
    // ✅ CORRECT - Read the value that was already rolled
    const goldModifier = ctx.resolutionData.numericModifiers.find((m: any) => m.resource === 'gold');
    const goldAmount = goldModifier?.value || 0;
    
    await updateKingdom(k => {
      k.resources.gold += goldAmount;  // Same value as preview ✅
    });
  }
};
```

**Result:** Preview and application use same dice value ✅

### When Dice Are Evaluated

**Timeline:**
1. Roll completes → Preview calculated (modifiers NOT yet evaluated)
2. User clicks Apply → **OutcomeDisplay.svelte evaluates dice modifiers**
3. User sees rolled values in preview
4. Execute runs → Reads from `ctx.resolutionData.numericModifiers`

**Key Rule:** If you define dice modifiers in `outcomes`, NEVER use `new Roll()` in `execute()`.

---

## ⚠️ CRITICAL: Shared Execution Functions (DRY PRINCIPLE)

**Problem:** Duplicating execution logic across multiple actions creates maintenance burden and inconsistency.

**Solution:** Use shared execution functions from `src/execution/` for common operations.

### Available Shared Functions

All shared execution functions are exported from `src/execution/index.ts`:

| Function | Location | Purpose | Game Command |
|----------|----------|---------|--------------|
| `adjustFactionAttitudeExecution()` | `factions/` | Adjust faction attitude by N steps | `adjustFactionAttitude` |
| `recruitArmyExecution()` | `armies/` | Recruit new army | `recruitArmy` |
| `deployArmyExecution()` | `armies/` | Deploy army to hex | `deployArmy` |
| `disbandArmyExecution()` | `armies/` | Disband existing army | `disbandArmy` |
| `outfitArmyExecution()` | `armies/` | Add equipment to army | `outfitArmy` |
| More functions... | Various | See `src/execution/index.ts` | Various |

### When to Use Shared Functions

**✅ Use Shared Function When:**
- The operation is common across multiple actions (e.g., faction attitude changes)
- A shared function already exists for your use case
- The logic is standardized and doesn't need customization
- You want consistent messaging across the application

**✅ Create New Shared Function When:**
- You're implementing logic that will be reused by multiple actions
- The operation is a common game mechanic (territory, settlement, army, faction operations)
- You want to ensure consistency across similar operations

**❌ Use Custom execute() When:**
- The logic is unique to one action only
- The operation requires complex, action-specific branching
- You need to combine multiple shared functions in a specific way

### Correct Pattern: Using Shared Functions

#### Example: Faction Attitude Adjustment

**✅ CORRECT:** All three faction actions use the same pattern

```typescript
// In preview.calculate()
import { adjustAttitudeBySteps } from '../../utils/faction-attitude-adjuster';

const newAttitude = adjustAttitudeBySteps(faction.attitude, -1);
if (newAttitude) {
  effects.push({
    type: 'status',
    message: `Attitude with ${faction.name} worsens from ${faction.attitude} to ${newAttitude}`,
    variant: 'negative'
  });
}

// In execute()
import { factionService } from '../../services/factions';

const result = await factionService.adjustAttitude(factionId, -1);
if (result.success) {
  return { 
    success: true, 
    message: `Your request offends ${faction.name}! Attitude worsened from ${result.oldAttitude} to ${result.newAttitude}` 
  };
}
```

**❌ WRONG:** Custom implementation per action

```typescript
// DON'T duplicate this logic in each action!
execute: async (ctx) => {
  const faction = getFaction(factionId);
  const attitudeLevels = ['Hostile', 'Unfriendly', 'Indifferent', 'Friendly', 'Helpful'];
  const currentIndex = attitudeLevels.indexOf(faction.attitude);
  const newIndex = Math.max(0, currentIndex - 1);
  faction.attitude = attitudeLevels[newIndex];
  // ❌ This duplicates factionService.adjustAttitude() logic!
}
```

### Standard Messaging Patterns

When using shared functions, follow these messaging conventions:

**Preview (before Apply):**
```typescript
// Format: "Attitude with [Faction] worsens/improves from [Old] to [New]"
message: `Attitude with ${faction.name} worsens from ${faction.attitude} to ${newAttitude}`

// Edge case: "Attitude with [Faction] cannot worsen/improve further"
message: `Attitude with ${faction.name} cannot worsen further (already ${faction.attitude})`
```

**Execute (after Apply):**
```typescript
// Format: "[Action specific context]! Attitude worsened/improved from [Old] to [New]"
message: `Your request offends ${faction.name}! Attitude worsened from ${result.oldAttitude} to ${result.newAttitude}`

// Edge case: Same as preview
message: `Your request offends ${faction.name}, but attitude cannot worsen further (already ${result.oldAttitude})`
```

### Actions Using Shared Functions

**Faction Operations:**
- `establish-diplomatic-relations` - adjustFactionAttitude
- `request-economic-aid` - adjustFactionAttitude  
- `request-military-aid` - adjustFactionAttitude

**All use:**
- Same `factionService.adjustAttitude()` call
- Same `adjustAttitudeBySteps()` for preview
- Same messaging format
- Same game command type in JSON: `"type": "adjustFactionAttitude"`

### Anti-Patterns to Avoid

**❌ Custom gameCommand types instead of shared:**
```json
{
  "type": "requestMilitaryAidFactionAttitude",  // ❌ WRONG
  "steps": -1
}
```
```json
{
  "type": "adjustFactionAttitude",  // ✅ CORRECT - Shared command
  "steps": -1
}
```

**❌ Duplicated messaging formats:**
```typescript
// ❌ WRONG - Inconsistent messaging
message: `${faction.name} is offended! Attitude will worsen from ${faction.attitude} to ${newAttitude}`

// ✅ CORRECT - Standard format
message: `Attitude with ${faction.name} worsens from ${faction.attitude} to ${newAttitude}`
```

**❌ Custom execution instead of shared service:**
```typescript
// ❌ WRONG - Bypassing shared service
execute: async (ctx) => {
  await updateKingdom(k => {
    const faction = k.factions.find(f => f.id === factionId);
    faction.attitude = newAttitude;  // Direct manipulation!
  });
}

// ✅ CORRECT - Using shared service
execute: async (ctx) => {
  const result = await factionService.adjustAttitude(factionId, -1);
  // Service handles validation, edge cases, and consistent state updates
}
```

### Creating New Shared Functions

When creating a new shared execution function:

1. **Location:** Place in `src/execution/[category]/[functionName].ts`
2. **Naming:** Use `[operation]Execution` suffix (e.g., `adjustFactionAttitudeExecution`)
3. **Exports:** Add to `src/execution/index.ts`
4. **Pure Logic:** No preview, no UI - execution only
5. **Consistent Interface:** Return meaningful result objects
6. **Error Handling:** Validate inputs, handle edge cases

**Example Structure:**
```typescript
// src/execution/factions/adjustFactionAttitude.ts
export async function adjustFactionAttitudeExecution(
  factionId: string,
  steps: number,
  options?: { maxLevel?: AttitudeLevel; minLevel?: AttitudeLevel }
): Promise<void> {
  // 1. Validate inputs
  // 2. Get current state
  // 3. Apply changes via service
  // 4. Log results
}
```

### Benefits of Shared Functions

✅ **Consistency** - Same behavior across all actions  
✅ **Maintainability** - Fix bugs once, apply everywhere  
✅ **Testability** - Test shared logic once  
✅ **Readability** - Clear intent, no duplicated code  
✅ **Standards** - Enforces messaging and UX patterns

---

## ⚠️ CRITICAL: Declarative Modifiers vs. Execution Functions

**Problem:** Knowing when to use declarative modifiers vs. custom execution functions for resource changes.

**Solution:** Use declarative modifiers for simple resource changes; use execution functions only for complex operations.

### The Modifier System (Preferred for Simple Resources)

For most resource changes, use **declarative modifiers** in your pipeline's `outcomes` section:

```typescript
outcomes: {
  success: {
    description: 'The people listen.',
    modifiers: [
      { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
      { type: 'dice', resource: 'gold', formula: '1d4+1', duration: 'immediate' }
    ]
  }
}
```

Then use `applyPipelineModifiers` in your execute function:

```typescript
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

execute: async (ctx) => {
  await applyPipelineModifiers(dealWithUnrestPipeline, ctx.outcome);
  return { success: true };
}
```

### Why This Pattern is Better

**✅ Declarative Modifiers:**
- Single call handles all resource changes
- Modifiers are visible in pipeline definition
- Automatic handling by GameCommandsService
- Consistent across all actions
- Less code, fewer bugs

**❌ Custom Execute Functions:**
```typescript
// DON'T do this for simple resource changes!
execute: async (ctx) => {
  await updateKingdom(k => {
    k.unrest -= 2;  // ❌ Bypasses modifier system
    k.gold += 3;    // ❌ Duplicates logic
  });
}
```

### How applyPipelineModifiers Works

**Behind the scenes:**
1. Reads `modifiers` array from pipeline's outcome
2. Calls `GameCommandsService.applyOutcome()` 
3. GameCommandsService applies each modifier to kingdom state
4. Handles static, dice, and choice modifiers automatically
5. Logs results for debugging

**Location:** `src/pipelines/shared/applyPipelineModifiers.ts`

**This is a shared utility, not an execution function** - it's a helper for pipelines.

### When to Use Execution Functions

Use execution functions in `src/execution/` ONLY when:

**✅ Complex Operations:**
- Faction attitude changes (validation, caps, diplomatic capacity)
- Army recruitment (cost calculation, equipment, tracking)
- Settlement operations (validation, growth checks)
- Territory management (hex validation, borders)

**✅ Reused Logic:**
- Multiple actions need identical complex logic
- Operation involves multiple steps/services
- Business rules beyond simple arithmetic

**❌ Simple Resource Changes:**
- Adding/subtracting gold, food, lumber, etc.
- Adjusting unrest, fame, culture
- Immediate numeric changes

### Complete Example: Deal with Unrest

```typescript
export const dealWithUnrestPipeline: CheckPipeline = {
  outcomes: {
    criticalSuccess: {
      description: 'The people rally to your cause.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -3, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The people listen.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Tensions ease slightly.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'No one listens.',
      modifiers: []  // No change
    }
  },

  execute: async (ctx) => {
    // ✅ Single call applies whichever outcome occurred
    await applyPipelineModifiers(dealWithUnrestPipeline, ctx.outcome);
    return { success: true };
  }
};
```

### Special Case: giveActorGoldExecution

You may see `giveActorGoldExecution` in `src/execution/resources/`. This is for **player character rewards** (Foundry actors), not kingdom resources:

```typescript
// ✅ CORRECT - Rewarding a PC with gold
await giveActorGoldExecution(actor, 50);  // Foundry actor's inventory

// ❌ WRONG - Don't use for kingdom resources
// Kingdom resource changes should use modifiers
```

### Anti-Patterns to Avoid

**❌ Bypassing modifier system:**
```typescript
execute: async (ctx) => {
  // DON'T manually update resources that could use modifiers
  await updateKingdom(k => {
    if (ctx.outcome === 'success') {
      k.unrest -= 2;  // ❌ Use modifiers instead!
    }
  });
}
```

**❌ Duplicating modifier logic:**
```typescript
// DON'T repeat the same resource changes in execute
outcomes: {
  success: {
    modifiers: [{ type: 'static', resource: 'gold', value: 10 }]
  }
},
execute: async (ctx) => {
  await updateKingdom(k => k.gold += 10);  // ❌ Already in modifiers!
}
```

**✅ CORRECT pattern:**
```typescript
outcomes: {
  success: {
    modifiers: [{ type: 'static', resource: 'gold', value: 10 }]
  }
},
execute: async (ctx) => {
  await applyPipelineModifiers(pipeline, ctx.outcome);  // ✅ Clean!
}
```

### Summary: Decision Tree

```
Need to change kingdom resources?
├─ Simple arithmetic (add/subtract)?
│  └─ ✅ Use declarative modifiers + applyPipelineModifiers
│
├─ Complex calculation with business rules?
│  └─ ✅ Create execution function in src/execution/
│
└─ Already exists as execution function?
   └─ ✅ Use the existing function (DRY principle)
```

---

## 1. Core Handler Structure

**Goal:** Build UnifiedCheckHandler skeleton without breaking existing systems

**Create:**
- `src/services/UnifiedCheckHandler.ts` - Main handler class
- `src/types/CheckPipeline.ts` - Type definitions
- `src/types/CheckContext.ts` - Shared context structure
- `src/types/PreviewData.ts` - Preview data structures

**Implement:**
```typescript
// UnifiedCheckHandler.ts
export class UnifiedCheckHandler {
  private pipelines = new Map<string, CheckPipeline>();
  
  registerCheck(id: string, pipeline: CheckPipeline): void {
    this.pipelines.set(id, pipeline);
  }
  
  getCheck(id: string): CheckPipeline | undefined {
    return this.pipelines.get(id);
  }
  
  async executeSkillCheck(
    checkId: string, 
    skill: string, 
    metadata?: Metadata
  ): Promise<CheckInstance> {
    // Delegate to existing ActionExecutionHelpers
    // This phase: pass-through only
  }
}
```

**Testing:**
- [ ] Handler instantiates correctly
- [ ] Registration works
- [ ] Retrieval works
- [ ] No impact on existing systems

## 2. Preview Infrastructure

**Implement:**
```typescript
// UnifiedCheckHandler.ts (continued)
async calculatePreview(
  instanceId: string,
  resolutionData: ResolutionData
): Promise<PreviewData> {
  const instance = await getCheckInstance(instanceId);
  const pipeline = this.getCheck(instance.checkId);
  
  if (pipeline.preview.providedByInteraction) {
    // Mode B: Map interaction provides preview
    return { specialEffects: [], resources: [] };
  }
  
  // Mode A: Calculate preview
  const context = buildContext(instance, resolutionData);
  return pipeline.preview.calculate(context);
}

formatPreview(preview: PreviewData): SpecialEffect[] {
  return [
    ...formatResourceBadges(preview.resources),
    ...formatEntityBadges(preview.entities),
    ...preview.specialEffects
  ];
}
```

**Testing:**
- [ ] Preview calculation works
- [ ] Preview formatting works
- [ ] No impact on existing systems

**Deliverables:**
- UnifiedCheckHandler service (functional skeleton)
- Type definitions for pipeline configs
- Preview infrastructure ready
- Zero breaking changes

---

## 3. Game Commands Refactor

**Goal:** Extract execution logic, move preview/pre-roll to pipelines

**Why Critical:** Actions need clean execution functions; preview must move to pipeline level.

### Current State: Mixed Concerns

**Problem:** Commands mix different concerns:
- **Prepare/commit pattern (~5 commands):** `prepare()` mixes pre-roll data gathering + preview calculation; `commit()` has execution
- **Immediate-execute (~20 commands):** Execute directly with no preview support
- **Global variables:** Use `globalThis.__pending*` for state
- **Inconsistent patterns:** Each command structured differently

**This mess needs cleaning up.**

### Refactor Pattern

**Transform:** `prepare()/commit()` → Simple execution functions  
**Eliminate:** Global variables → Use `CheckContext`  
**Move:** Preview logic → Pipeline configs

**Commands to refactor (25+):** Territory, Settlement, Diplomatic, Unrest, Army commands

**Example transformation:**
```typescript
// OLD: Mixed concerns
async recruitArmy(level): Promise<PreparedCommand> {
  return {
    specialEffect: { message: `Will recruit...` },
    commit: async () => { /* execution */ }
  };
}

// NEW: Pure execution
async function recruitArmyExecution(kingdom, armyData): Promise<void> {
  await updateKingdom(k => {
    k.armies.push({ ...armyData });
    k.gold -= calculateCost(armyData.level);
  });
}

// Preview moves to pipeline
{
  execute: async (ctx) => recruitArmyExecution(ctx.kingdom, ctx.metadata)
}
```

**Deliverables:**
- ~25 execution functions (no prepare/commit, no globals)
- Preview logic in pipelines
- State changes identical to old version

---

## 4-7. Actions (26 total)

**Prerequisites:** Steps 1-3 complete

**See:** `ACTION_MIGRATION_CHECKLIST.md` for live progress (currently 4/26 complete)

### Action Migration Checklist

**See:** `docs/refactoring/ACTION_MIGRATION_CHECKLIST.md` for the complete, up-to-date checklist.

**Current Status:** 4/26 actions complete (15%)

**Important:** Update the checklist file as you complete each action migration.

---

### 4. Simple Actions (9 actions)

**Actions:** deal-with-unrest, sell-surplus, purchase-resources, harvest-resources, build-roads, claim-hexes, fortify-hex, create-worksite, send-scouts

**Example pipeline config:**
```typescript
{
  id: 'deal-with-unrest',
  checkType: 'action',
  skills: [{ skill: 'diplomacy', ... }],
  outcomes: {
    success: {
      description: 'The People Listen',
      modifiers: [{ type: 'static', resource: 'unrest', value: -2 }]
    }
  },
  preview: {
    calculate: (ctx) => ({ resources: [{ resource: 'unrest', value: -2 }] })
  }
}
```

### 5. Pre-Roll Dialog Actions (7 actions)

**Actions:** collect-stipend, execute-or-pardon-prisoners, establish-diplomatic-relations, request-economic-aid, request-military-aid, train-army, disband-army

### 6. Game Command Actions (5 actions)

**Actions:** recruit-unit, deploy-army, build-structure, repair-structure, upgrade-settlement

### 7. Custom Resolution Actions (5 actions)

**Actions:** arrest-dissidents, outfit-army, infiltration, establish-settlement, recover-army

**After each migration:** Add action ID to `MIGRATED_ACTIONS` set in `ActionsPhase.svelte`

**Testing:** Action card → Skill triggers → Preview shows → Apply executes → State matches

---

## 8. Events (37 total)

**Prerequisites:** Step 3 complete (game commands refactored)

**Example:** Simple event
```typescript
{
  id: 'good-weather',
  checkType: 'event',
  skills: [{ skill: 'agriculture', ... }],
  outcomes: {
    criticalSuccess: {
      description: 'Exceptional harvest',
      modifiers: [{ type: 'static', resource: 'food', value: 4 }]
    }
  }
}
```

**Testing:** Events trigger → Preview shows → Ongoing persists

---

## 9. Incidents (30 total)

**Prerequisites:** Step 3 complete (game commands refactored)

**Differences:** Trigger (unrest % vs random), Severity (minor/moderate/major vs 1-20)

**Example:** Same structure as events, add `severity` field.

**Testing:** Trigger on unrest → Preview shows → Ongoing persists

---

## 10. Cleanup

**Goal:** Remove old code, archive docs

### Removing Legacy Code

**See:** `CLEANUP_GUIDE.md` for detailed instructions

**Summary:**
- After each action: Delete `src/actions/[action-name]/` folder
- After all 26 actions: Delete `src/controllers/actions/implementations/`
- Final step: Delete `src/actions/` entirely

**Archive (move to docs/archived/):**
- `docs/refactoring/unified-action-handler-architecture.md` (interim doc)
- `docs/refactoring/unified-check-resolution-system.md` (interim doc)
- Old action implementation guides

**Update:**
- `docs/AI_ACTION_GUIDE.md` - Reference new pipeline system
- `docs/ARCHITECTURE.md` - Update with unified system
- `docs/systems/game-commands-system.md` - Document prepare/commit pattern

**Create:**
- `docs/guides/CREATING_CHECKS.md` - How to add new actions/events/incidents

**Final testing:** All 93 checks work identically with preview support

---


## Summary

**Critical Order:** Game Commands (step 3) BEFORE Actions/Events/Incidents (steps 4-9) - preview infrastructure dependency

**Result:** Single unified system for all 93 kingdom challenges with consistent preview support
