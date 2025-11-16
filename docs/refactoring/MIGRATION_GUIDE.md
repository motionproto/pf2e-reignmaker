# Unified Check Resolution System: Migration Guide

**Purpose:** Step-by-step implementation plan for unifying Actions, Events, and Incidents

**Last Updated:** 2025-11-14

---

## Architecture Overview

**Current:** Three separate systems (Actions, Events, Incidents) with duplicated check resolution logic.

**Target:** Single unified pipeline where:
- **CheckPipeline** = Config object defining: skills, outcomes, interactions, preview
- **UnifiedCheckHandler** = Executes pipelines, manages check instances
- **Preview** = Calculated before Apply, shows resource/entity changes
- **Interactions** = Pre-roll (selection), post-roll (choices), post-apply (map)

**Key Change:** Move business logic from scattered custom files → Centralized pipeline configs

**Full Architecture:** See `docs/UNIFIED_CHECK_ARCHITECTURE.md`

---

## Implementation Order

1. **Core Handler Structure** - UnifiedCheckHandler skeleton, type definitions
2. **Preview Infrastructure** - Preview calculation and formatting
3. **Game Commands Refactor** - Extract execution functions, eliminate globals
4. **Simple Actions** - Resource-only actions (deal-with-unrest, etc.)
5. **Pre-Roll Dialog Actions** - Entity selection actions (collect-stipend, etc.)
6. **Game Command Actions** - Actions with complex execution (recruit-unit, etc.)
7. **Custom Resolution Actions** - Special logic actions (arrest-dissidents, etc.)
8. **Events** - Convert 37 events to pipeline configs
9. **Incidents** - Convert 30 incidents to pipeline configs
10. **Cleanup** - Remove old code, archive docs

---

## Pipeline Flow (Complete Check Resolution)

```
1. Check Triggered
   └─> CheckPipeline config loaded by UnifiedCheckHandler

2. Pre-Roll Interactions (optional)
   └─> Entity selection, configuration dialogs
   └─> Results stored in metadata

3. Skill Check Execution
   └─> Roll against DC + modifiers
   └─> Determine outcome (critical success/success/failure/critical failure)

4. Post-Roll Interactions (optional)
   └─> Choice widgets (inline in preview)
   └─> Dice rolls based on outcome
   └─> Results affect preview calculation

5. Preview Calculation
   └─> pipeline.preview.calculate(context)
   └─> Returns: resources, entities, specialEffects
   └─> Formatted into preview badges
   └─> NO state changes

6. User Review
   └─> User sees outcome + preview
   └─> Clicks "Apply" to commit
   └─> NO state changes (UI only)

7. Post-Apply Interactions (optional)
   └─> Map selections (full-screen)
   └─> Complex workflows requiring commitment first
   └─> MAY update kingdom state (e.g., claim-hexes updates hex ownership)

8. Final Execution (if not handled by step 7)
   └─> pipeline.execute(context) OR game commands
   └─> Applies remaining state changes to kingdom

9. Check Instance Updated
   └─> Status set to 'resolved'
   └─> History recorded
```

**Key:** Steps 2, 4, 7 are the three interaction phases. All are optional.

**Note:** Steps 7 and 8 may both update kingdom state. Some actions complete entirely in step 7 (map interactions), others use step 8 for final execution.

---

## Interaction Patterns (NEW)

**Three distinct patterns** for user interactions, each suited to different action types:

### Pattern 1: Pre-Roll Interactions (NEW - Actions #11+)

**When to use:** Action needs user input BEFORE the roll (entity selection)

**Examples:** execute-or-pardon-prisoners (#11), diplomatic relations (#12), aid requests (#13-14), army actions (#15-16)

**How it works:**
1. User clicks skill → Pre-roll dialog appears
2. User selects entity (settlement, faction, army) → Stored in `PipelineMetadataStorage`
3. Roll dialog appears → User rolls
4. Roll completes → Metadata retrieved and merged into `CheckContext`
5. Preview/Execute have access to metadata via `ctx.metadata`

**Code pattern:**
```typescript
{
  preRollInteractions: [
    { id: 'settlement', type: 'entity-selection', entityType: 'settlement' }
  ],
  execute: async (ctx) => {
    const settlementId = ctx.metadata.settlement.id;  // ✅ Available!
    await performAction(settlementId);
  }
}
```

### Pattern 2: Post-Apply Interactions (Existing - Actions #1, #6-9)

**When to use:** Action needs user input AFTER roll (map selection, entity creation)

**Examples:** claim-hexes (#1), build-roads (#6), fortify-hex (#7), create-worksite (#8), send-scouts (#9)

**How it works:**
1. User clicks skill → Roll dialog appears
2. User rolls → Preview calculated
3. User clicks Apply → Post-apply dialog appears (map selection)
4. User selects items → `onComplete()` callback executes with full context
5. State changes applied directly in callback

**Code pattern:**
```typescript
{
  postApplyInteractions: [
    {
      type: 'map-selection',
      onComplete: async (hexIds, ctx) => {
        await markHexesClaimed(hexIds);  // Execute directly
      }
    }
  ]
}
```

### Pattern 3: No Interactions (Existing - Actions #2-5)

**When to use:** Action is fully automatic (no user input needed)

**Examples:** deal-with-unrest (#2), sell-surplus (#3), purchase-resources (#4), harvest-resources (#5)

**How it works:**
1. User clicks skill → Roll dialog appears
2. User rolls → Preview calculated
3. User clicks Apply → Execute runs immediately

**Code pattern:**
```typescript
{
  execute: async (ctx) => {
    await updateKingdom(kingdom => {
      kingdom.unrest -= 2;
    });
  }
}
```

**Full Details:** See `PIPELINE_DATA_FLOW.md` for complete architectural documentation.

---

## Prerequisites

- [x] Architecture doc reviewed
- [x] Staging environment ready
- [ ] Feature branch: `feature/unified-check-system`
- [ ] Document current behavior for regression testing

**Safety:** Changes behind feature flag, old code remains until Phase 6

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
