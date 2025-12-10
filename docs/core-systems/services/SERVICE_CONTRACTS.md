# Service Contracts

**Purpose:** Define responsibilities and boundaries of services in the check execution system

**Last Updated:** 2025-12-10

---

## Overview

Services follow clear separation of concerns:
- **Roll Execution** - Collect modifiers, execute PF2e rolls
- **Pipeline** - Orchestrate multi-step check flows
- **Resolution** - Apply outcomes to kingdom state
- **Domain** - Kingdom-specific business logic

---

## Roll Execution Services

### KingdomModifierService
**Location:** `src/services/domain/KingdomModifierService.ts`

**Responsibility:** Collect kingdom-specific modifiers for skill checks

**Key Methods:**
```typescript
getModifiersForCheck(options: {
  skillName: string;
  actionId?: string;
  checkType: 'action' | 'event' | 'incident';
  onlySettlementId?: string;
}) => RollModifier[]

hasKeepHigherAid(actionId, checkType) => boolean
```

**Modifier Sources:**
- Structure bonuses (via StructuresService)
- Unrest penalties (via UnrestService)
- Active aids (from turnState)

**Does NOT:** Execute rolls, interact with PF2e system, store state

---

### PF2eSkillService
**Location:** `src/services/pf2e/PF2eSkillService.ts`

**Responsibility:** Pure PF2e system integration

**Key Methods:**
```typescript
executeSkillRoll(options: {
  actor: any;
  skill: any;
  dc: number;
  label: string;
  modifiers: RollModifier[];
  rollTwice?: 'keep-higher' | false;
  callback?: RollCallback;
}) => Promise<any>

getKingdomActionDC(characterLevel?) => number
getSkillSlug(skillName) => string
convertToPF2eModifiers(modifiers) => PF2eModifier[]
```

**Does NOT:** Collect kingdom modifiers, store state, orchestrate pipelines

**See:** [skill-service.md](./skill-service.md) for complete API

---

### RollStateService
**Location:** `src/services/roll/RollStateService.ts`

**Responsibility:** Persist roll modifiers for rerolls

**Key Methods:**
```typescript
storeRollModifiers(instanceId, turnNumber, actionId, modifiers) => Promise<void>
getRollModifiers(instanceId, currentTurn) => Promise<RollModifier[]>
clearStaleTurnData(currentTurn) => Promise<void>
```

**Storage:** `kingdom.turnState.actionsPhase.actionInstances[instanceId]`

**Instance ID Format:** `T{turn}-{actionId}-{randomId}` (e.g., `T5-deploy-army-abc123`)

---

## Pipeline Services

### PipelineCoordinator
**Location:** `src/services/PipelineCoordinator.ts`

**Responsibility:** Orchestrate 9-step check execution

**Key Methods:**
```typescript
executePipeline(actionId, initialContext) => Promise<PipelineContext>
rerollFromStep3(instanceId) => Promise<void>
confirmApply(instanceId, resolutionData?) => Promise<void>
```

**Step 3 Flow:**
1. Call `KingdomModifierService.getModifiersForCheck()`
2. If reroll: Call `RollStateService.getRollModifiers()` and merge
3. Check `KingdomModifierService.hasKeepHigherAid()`
4. Call `PF2eSkillService.executeSkillRoll()`
5. In callback: Call `RollStateService.storeRollModifiers()` (initial roll only)

**State:** `pendingContexts` Map (in-memory, awaiting user action)

**See:** [../pipeline/pipeline-coordinator.md](../pipeline/pipeline-coordinator.md)

---

### OutcomePreviewService
**Location:** `src/services/OutcomePreviewService.ts`

**Responsibility:** Manage outcome preview lifecycle

**Key Methods:**
```typescript
createInstance(checkType, checkId, checkData, currentTurn, metadata?) => Promise<string>
getInstance(previewId, kingdom) => OutcomePreview | null
storeOutcome(previewId, outcome, resolutionData, options) => Promise<void>
markApplied(previewId) => Promise<void>
clearInstance(previewId) => Promise<void>
```

**Storage:** `kingdom.pendingOutcomes[]`

---

### UnifiedCheckHandler
**Location:** `src/services/UnifiedCheckHandler.ts`

**Responsibility:** Execute check interactions (pre-roll, post-roll, post-apply)

**Key Methods:**
```typescript
executePreRollInteractions(checkId, checkType, metadata) => Promise<CheckMetadata>
executePostRollInteractions(checkId, outcome) => Promise<void>
executePostApplyInteractions(instanceId, outcome) => Promise<void>
```

---

## Domain Services

### ModifierService
**Location:** `src/services/ModifierService.ts`

**Responsibility:** Manage ongoing kingdom modifiers (NOT roll modifiers)

**Key Methods:**
```typescript
applyModifier(modifier: ActiveModifier) => Promise<void>
removeExpiredModifiers() => Promise<void>
getActiveModifiers() => ActiveModifier[]
```

**Note:** Roll modifiers handled by RollStateService

---

### GameCommandsService
**Location:** `src/services/GameCommandsService.ts`

**Responsibility:** Apply kingdom state changes

**Key Methods:**
```typescript
applyNumericModifiers(modifiers, outcome) => Promise<void>
applyOutcome(options) => Promise<void>
trackPlayerAction(playerId, playerName, actorName, actionId, phase) => Promise<void>
```

---

## Data Flow

### Initial Roll
```
PipelineCoordinator.executePipeline()
  → Step 3:
    → KingdomModifierService.getModifiersForCheck()
    → PF2eSkillService.executeSkillRoll()
      → PF2e skill.roll()
        → callback:
          → RollStateService.storeRollModifiers()
```

### Reroll
```
OutcomeDisplay → handleReroll()
  → PipelineCoordinator.rerollFromStep3(instanceId)
    → context.isReroll = true
    → Step 3:
      → KingdomModifierService.getModifiersForCheck()
      → RollStateService.getRollModifiers()  // Restore stored modifiers
      → Merge fresh + stored modifiers
      → PF2eSkillService.executeSkillRoll()
        → callback: (does NOT store on reroll)
```

---

## Key Design Principles

1. **Single Source of Truth** - RollStateService is ONLY place storing roll modifiers
2. **Domain Separation** - Kingdom logic (KingdomModifierService) separate from PF2e integration (PF2eSkillService)
3. **Turn-Aware Storage** - Modifiers include turnNumber for validation/cleanup
4. **No Module State** - All state in kingdom data (persisted), not module variables (transient)
5. **Direct Reroll** - OutcomeDisplay calls PipelineCoordinator directly, no event bubbling

---

## Related Documentation

- [../pipeline/pipeline-coordinator.md](../pipeline/pipeline-coordinator.md) - Pipeline execution
- [../pipeline/ROLL_FLOW.md](../pipeline/ROLL_FLOW.md) - Complete roll flow
- [skill-service.md](./skill-service.md) - PF2e integration details

**Status:** ✅ Accurate as of 2025-12-10
