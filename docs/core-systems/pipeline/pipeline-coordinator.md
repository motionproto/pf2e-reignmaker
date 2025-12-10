# Pipeline Coordinator

The `PipelineCoordinator` is the single entry point for **all check execution** - actions, events, and incidents. It orchestrates a 9-step pipeline that handles everything from pre-roll interactions to cleanup.

> **📖 Documentation Navigation:**
> - **This document** - Core 9-step architecture overview
> - **[pipeline-patterns.md](./pipeline-patterns.md)** ⭐ - Pattern reference for implementing actions
> - **[pipeline-advanced-features.md](./pipeline-advanced-features.md)** - Custom components, reroll, persistence
> - **[pipeline-implementation-guide.md](./pipeline-implementation-guide.md)** - Developer quick start
> - **[ROLL_FLOW.md](./ROLL_FLOW.md)** - Roll execution details
> - **[../../guides/debugging-guide.md](../../guides/debugging-guide.md)** - Debugging guide
> - **[../../guides/testing-guide.md](../../guides/testing-guide.md)** - Testing guide

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  PipelineCoordinator                     │
│  (Single entry point for actions, events, incidents)    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: Requirements Check          [optional]         │
│  Step 2: Pre-Roll Interactions       [optional]         │
│  Step 3: Execute Roll                [always runs]      │
│  Step 4: Display Outcome             [always runs]      │
│  Step 5: Outcome Interactions        [optional]         │
│  Step 6: Wait For Apply              [always runs]      │
│  Step 7: Post-Apply Interactions     [optional]         │
│  Step 8: Execute Action              [always runs]      │
│  Step 9: Cleanup                     [always runs]      │
│                                                          │
│  Context persists through all steps ──────────────►     │
└─────────────────────────────────────────────────────────┘
```

### Core Principle: Single Context Object

```typescript
interface PipelineContext {
  // Immutable identifiers
  readonly actionId: string;
  readonly checkType: 'action' | 'event' | 'incident';
  readonly userId: string;
  readonly instanceId: string;  // Unique per execution
  
  // Data accumulated through pipeline steps
  actor?: ActorContext;           // Step 1
  metadata: CheckMetadata;         // Step 2
  rollData?: RollData;             // Step 3
  preview?: PreviewData;           // Step 5
  userConfirmed: boolean;          // Step 6
  resolutionData: ResolutionData;  // Step 7
  executionResult?: ExecutionResult; // Step 8
  
  // Helpers
  logs: StepLog[];                 // Centralized logging
}
```

---

## 9-Step Pipeline Details

### Step 1: Requirements Check (Optional)

**Purpose:** Validate action can be performed (resources, prerequisites)

**When it runs:** Only if pipeline defines `requirements` function

**Example:**
```typescript
requirements: () => {
  const kingdom = getKingdom();
  if (kingdom.resources.gold < 50) {
    return { met: false, reason: 'Insufficient gold' };
  }
  return { met: true };
}
```

### Step 2: Pre-Roll Interactions (Optional)

**Purpose:** Execute interactions BEFORE the skill check

**When it runs:** Only if pipeline has `preRollInteractions` array

**Examples:**
- Select settlement
- Choose army
- Configure building options

**See:** [pipeline-patterns.md](./pipeline-patterns.md#pattern-2-pre-roll-entity-selection) for examples

### Step 3: Execute Roll (Always)

**Purpose:** Execute PF2e skill check via Foundry VTT

**Services used:**
- `KingdomModifierService` - Collects kingdom modifiers
- `RollStateService` - Stores/retrieves modifiers for rerolls
- `PF2eSkillService` - Executes the PF2e roll

**Flow:**
1. Get modifiers from kingdom (structures, aids, unrest)
2. If reroll: Restore previous modifiers
3. Execute PF2e skill.roll()
4. Callback stores modifiers and resumes pipeline

**See:** [ROLL_FLOW.md](./ROLL_FLOW.md) for complete roll details

### Step 4: Display Outcome (Always)

**Purpose:** Create visual outcome preview card in UI

**Creates:** OutcomePreview stored in `kingdom.pendingOutcomes`

**Displays:** BaseCheckCard component with outcome information

### Step 5: Outcome Interactions (Optional)

**Purpose:** Calculate what will happen when action is applied

**Automatic:** JSON modifiers converted to badges

**Optional:** Custom preview calculation via `preview.calculate()`

**See:** [pipeline-patterns.md](./pipeline-patterns.md#preview-badges-possible-outcomes-display)

### Step 6: Wait For Apply (Always)

**Purpose:** Pause execution until user clicks "Apply Result"

**Implementation:** Pause/resume pattern with promises

**Button disabled until:** All dice rolled, choices made, components resolved

### Step 7: Post-Apply Interactions (Optional)

**Purpose:** Execute interactions AFTER apply clicked

**When it runs:** Only if pipeline has `postApplyInteractions` array

**Examples:**
- Select hexes on map
- Configure army deployment
- Allocate resources

**See:** [pipeline-patterns.md](./pipeline-patterns.md#pattern-3-post-apply-hex-selection)

### Step 8: Execute Action (Always)

**Purpose:** Apply state changes (resources, entities, etc.)

**Execute-First Pattern:**

1. **Default modifiers applied FIRST** (automatic):
   - Fame +1 on all critical successes
   - Pre-rolled dice modifiers from UI
   - Static JSON modifiers

2. **Custom execute runs SECOND** (if defined):
   - Only implements custom game logic
   - Modifiers already applied!
   - Can add dynamic costs if needed

**See:** [pipeline-patterns.md](./pipeline-patterns.md#execute-first-pattern-core-concept)

### Step 9: Cleanup (Always)

**Purpose:** Clean up temporary state, track action

**Actions:**
- Mark instance as applied
- Track action in log (for turn history)
- Complete phase steps (events/incidents)
- Remove from pending contexts

---

## Data Flow

```
Read:  Party Actor Flags → KingdomStore → Component Display
Write: Component Action → Controller → PipelineCoordinator → 
       KingdomActor → Party Actor Flags → Foundry → All Clients
```

### Context Data Locations

| Data | Set In | Access Pattern |
|------|--------|----------------|
| Pre-roll selections | Step 2 | `ctx.metadata.settlementselection` |
| Roll data | Step 3 | `ctx.rollData.outcome` |
| Preview badges | Step 5 | `ctx.preview.outcomeBadges` |
| Post-apply selections | Step 7 | `ctx.resolutionData.compoundData.selectedHexes` |
| Custom component data | Step 7 | `ctx.resolutionData.customComponentData` |

---

## Key Features

### Instance ID Format

Every execution gets a unique instance ID:

```
T{turn}-{actionId}-{randomId}
```

**Example:** `T5-deploy-army-abc123def456`

**Benefits:**
- Turn-aware validation
- Debugging support
- Modifier isolation per execution

### Reroll Support

When players reroll with fame:

1. Original modifiers stored in `kingdom.turnState.actionsPhase.actionInstances`
2. Reroll rewinds to Step 3
3. Modifiers restored automatically
4. New roll executed with same modifiers

**See:** [ROLL_FLOW.md](./ROLL_FLOW.md#reroll-flow) and [pipeline-advanced-features.md](./pipeline-advanced-features.md#reroll-modifier-system)

### Custom Components

Actions can inject Svelte components inline in OutcomeDisplay for user choices.

**See:** [pipeline-advanced-features.md](./pipeline-advanced-features.md#custom-component-integration)

### Error Handling

**Philosophy:** Roll forward, not rollback

- Failed pipelines stay visible for debugging
- Partial state changes preserved (optimistic progression)
- GM can manually fix issues

**See:** [pipeline-advanced-features.md](./pipeline-advanced-features.md#error-handling)

---

## Implementation Quick Reference

### For New Developers

1. **Start here** → Understand 9-step flow (this document)
2. **Find your pattern** → [pipeline-patterns.md](./pipeline-patterns.md)
3. **Copy example** → Similar action in `src/pipelines/actions/`
4. **Test** → [../../guides/testing-guide.md](../../guides/testing-guide.md)

**See:** [pipeline-implementation-guide.md](./pipeline-implementation-guide.md) for complete guide

### Common Patterns

| Pattern | Count | Examples |
|---------|-------|----------|
| No interactions | 2 | `dealWithUnrest`, `aidAnother` |
| Pre-roll only | 6 | `executeOrPardonPrisoners`, `upgradeSettlement` |
| Post-apply map | 6 | `claimHexes`, `buildRoads`, `fortifyHex` |
| Post-roll component | 4 | `harvestResources`, `sellSurplus` |

**See:** [pipeline-patterns.md](./pipeline-patterns.md#quick-pattern-lookup) for full table

---

## Service Architecture

```
PipelineCoordinator
  ├── KingdomModifierService (kingdom bonuses/penalties)
  ├── RollStateService (reroll persistence)
  ├── PF2eSkillService (Foundry VTT integration)
  ├── UnifiedCheckHandler (check execution)
  ├── OutcomePreviewService (outcome persistence)
  └── GameCommandsService (resource application)
```

**See:** [../services/SERVICE_CONTRACTS.md](../services/SERVICE_CONTRACTS.md) for service details

---

## Benefits

### For Developers

✅ **Single code path** - All actions use same pipeline  
✅ **Easy debugging** - Trace context through 9 steps  
✅ **Clear error handling** - Centralized try/catch  
✅ **Consistent logging** - Uniform format  
✅ **Type safety** - Fully typed context  

### For Maintainability

✅ **Easier to add actions** - Define pipeline config only  
✅ **Easier to modify** - Change once affects all  
✅ **Self-documenting** - Step names indicate function  
✅ **Testable** - Each step independently testable  

### For Users

✅ **Consistent behavior** - All actions work same way  
✅ **Better error messages** - Know which step failed  
✅ **No silent failures** - Error handling ensures consistency  

---

## Related Documentation

### Core Pipeline Docs
- **[pipeline-patterns.md](./pipeline-patterns.md)** ⭐ - Implementation patterns
- **[pipeline-advanced-features.md](./pipeline-advanced-features.md)** - Advanced features
- **[pipeline-implementation-guide.md](./pipeline-implementation-guide.md)** - Quick start
- **[ROLL_FLOW.md](./ROLL_FLOW.md)** - Roll execution flow

### Other Systems
- **[../checks/check-card.md](../checks/check-card.md)** - Check card UI patterns
- **[../effects/typed-modifiers-system.md](../effects/typed-modifiers-system.md)** - Resource modifications
- **[../effects/game-commands-system.md](../effects/game-commands-system.md)** - Non-resource effects
- **[../services/SERVICE_CONTRACTS.md](../services/SERVICE_CONTRACTS.md)** - Service responsibilities

### Guides
- **[../../guides/debugging-guide.md](../../guides/debugging-guide.md)** ⭐ - Common issues & fixes
- **[../../guides/testing-guide.md](../../guides/testing-guide.md)** - Testing workflows

---

**Status:** ✅ Production Ready  
**Last Updated:** 2025-12-10
