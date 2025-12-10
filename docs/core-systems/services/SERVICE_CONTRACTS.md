# Service Contracts

This document defines the responsibilities and boundaries of each service in the roll/resolution system.

## Roll Execution Layer

### KingdomModifierService (`src/services/domain/KingdomModifierService.ts`)

**Responsibility:** Extract kingdom-specific modifiers for skill checks

**Public API:**
- `getModifiersForCheck(options)` - Get all applicable modifiers for a skill check
- `hasKeepHigherAid(actionId, checkType)` - Check if any aid grants keep-higher

**Options:**
```typescript
interface ModifierCheckOptions {
  skillName: string;
  actionId?: string;
  checkType: 'action' | 'event' | 'incident';
  onlySettlementId?: string;
  enabledSettlement?: string;
  enabledStructure?: string;
}
```

**Modifier Sources:**
- Structure bonuses (via `structuresService`)
- Unrest penalty (via `UnrestService`)
- Active aids (from `turnState.actionsPhase/eventsPhase.activeAids`)

**Does NOT:**
- Execute rolls
- Interact with PF2e system
- Store state

---

### PF2eSkillService (`src/services/pf2e/PF2eSkillService.ts`)

**Responsibility:** Pure PF2e system integration for skill checks

**Public API:**
- `executeSkillRoll(options)` - Execute a PF2e skill roll with provided modifiers
- `getSkillSlug(skillName)` - Map skill name to PF2e system slug
- `getSkill(actor, skillName)` - Get skill from actor by name
- `getKingdomActionDC(characterLevel?)` - Calculate DC based on character level
- `convertToPF2eModifiers(modifiers)` - Convert RollModifier[] to PF2e format
- `showLoreSelectionDialog(loreItems)` - Show lore skill selection UI

**ExecuteSkillRoll Options:**
```typescript
interface ExecuteSkillRollOptions {
  actor: any;
  skill: any;
  dc: number;
  label: string;
  modifiers: RollModifier[];
  rollTwice?: 'keep-higher' | false;
  callback?: RollCallback;
  extraRollOptions?: string[];
}
```

**Legacy API (deprecated):**
- `performKingdomSkillCheck()` - Full skill check with modifier collection (uses KingdomModifierService internally)
- `performKingdomActionRoll()` - Legacy wrapper for backward compatibility

**Dependencies:**
- `PF2eCharacterService` - For character selection

**Does NOT:**
- Collect kingdom modifiers (that's KingdomModifierService)
- Store modifier state (that's RollStateService)
- Manage pipeline state
- Orchestrate multi-step flows

---

### RollStateService (`src/services/roll/RollStateService.ts`)

**Responsibility:** Manage roll modifier state for rerolls

**Public API:**
- `storeRollModifiers(instanceId, turnNumber, actionId, modifiers)` - Store modifiers from initial roll
- `getRollModifiers(instanceId, currentTurn)` - Retrieve modifiers for reroll (turn-aware)
- `clearStaleTurnData(currentTurn)` - Clear data from previous turns
- `clearAllRollState()` - Clear all roll state
- `hasStoredModifiers(instanceId)` - Check if modifiers exist for instance

**Storage Location:** `kingdom.turnState.actionsPhase.actionInstances[instanceId]`

**Does NOT:**
- Execute rolls
- Interact with PF2e system
- Collect kingdom modifiers

---

### PF2eRollService (`src/services/pf2e/PF2eRollService.ts`)

**Responsibility:** Pure utility functions for roll calculations

**Public API:**
- `calculateOutcome(roll, dc)` - Determine outcome from roll result
- `getDegreeOfSuccess(roll, dc)` - Get degree of success enum

**Does NOT:**
- Execute rolls
- Store state
- Interact with actors

---

## Pipeline Layer

### PipelineCoordinator (`src/services/PipelineCoordinator.ts`)

**Responsibility:** Orchestrate the 9-step action pipeline

**Public API:**
- `executePipeline(actionId, initialContext)` - Start new pipeline execution
- `rerollFromStep3(instanceId)` - Rewind to Step 3 and re-execute roll
- `confirmApply(instanceId, resolutionData?)` - Resume pipeline after user confirms

**State Management:**
- `pendingContexts` Map - In-memory pipeline contexts awaiting user action
- Generates `instanceId` in format: `T{turn}-{actionId}-{randomId}`

**Step 3 Flow:**
```
1. Call KingdomModifierService.getModifiersForCheck()
2. If reroll: Call RollStateService.getRollModifiers() and merge
3. Check KingdomModifierService.hasKeepHigherAid()
4. Call PF2eSkillService.executeSkillRoll()
5. In callback: Call RollStateService.storeRollModifiers() (initial roll only)
```

**Does NOT:**
- Collect kingdom modifiers directly (delegates to KingdomModifierService)
- Execute PF2e rolls directly (delegates to PF2eSkillService)
- Apply game effects (delegates to GameCommandsService)

---

### OutcomePreviewService (`src/services/OutcomePreviewService.ts`)

**Responsibility:** Manage outcome preview lifecycle

**Public API:**
- `createInstance(checkType, checkId, checkData, currentTurn, metadata?)` - Create new preview
- `getInstance(previewId, kingdom)` - Get preview by ID
- `storeOutcome(previewId, outcome, resolutionData, options)` - Store roll outcome
- `markApplied(previewId)` - Mark effects as applied
- `clearInstance(previewId)` - Delete preview

**Storage Location:** `kingdom.pendingOutcomes[]`

**Does NOT:**
- Execute rolls
- Orchestrate pipeline steps
- Apply game effects

---

## Resolution Layer

### OutcomeApplicationService (`src/services/resolution/OutcomeApplicationService.ts`)

**Responsibility:** Apply resolved outcomes to kingdom state

**Does NOT:**
- Execute rolls
- Manage UI state
- Handle rerolls

---

### UnifiedCheckHandler (`src/services/UnifiedCheckHandler.ts`)

**Responsibility:** Handle check interactions (pre-roll, post-roll, post-apply)

**Public API:**
- `executePreRollInteractions(checkId, checkType, metadata)` - Run pre-roll interactions
- `executePostRollInteractions(checkId, outcome)` - Run post-roll interactions
- `executePostApplyInteractions(instanceId, outcome)` - Run post-apply interactions

**Does NOT:**
- Execute rolls
- Store state
- Apply game effects directly

---

## Domain Layer

### ModifierService (`src/services/ModifierService.ts`)

**Responsibility:** Manage ongoing kingdom modifiers (NOT roll modifiers)

**Public API:**
- `applyModifier(modifier)` - Apply a new modifier
- `removeExpiredModifiers()` - Clean up expired modifiers
- `getActiveModifiers()` - Get summary of active modifiers

**Does NOT:**
- Handle roll modifiers (that's RollStateService)
- Execute rolls
- Interact with PF2e system

---

### GameCommandsService (`src/services/GameCommandsService.ts`)

**Responsibility:** Apply kingdom state changes via game commands

**Does NOT:**
- Execute rolls
- Manage UI state
- Handle rerolls

---

## Component Layer

### OutcomeDisplay (`src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte`)

**Responsibility:** Display roll outcomes and handle user interactions

**Key Behaviors:**
- Handles "Reroll with Fame" button click
- Calls `PipelineCoordinator.rerollFromStep3()` directly (not via events)
- Displays outcome badges, modifiers, and effects

**Does NOT:**
- Execute rolls directly
- Store modifier state
- Dispatch reroll events to parent components

---

## Data Flow Summary

### Initial Roll
```
User clicks skill button
  → Phase component calls executeSkillCheck()
    → PipelineCoordinator.executePipeline()
      → Step 3:
        → KingdomModifierService.getModifiersForCheck()
        → KingdomModifierService.hasKeepHigherAid()
        → PF2eSkillService.executeSkillRoll()
          → PF2e skill.roll() with callback
            → callback extracts modifiers
              → RollStateService.storeRollModifiers()
            → Pipeline continues to Step 4+
```

### Reroll
```
User clicks "Reroll with Fame" in OutcomeDisplay
  → OutcomeDisplay.handleReroll()
    → Deduct fame
    → PipelineCoordinator.rerollFromStep3(instanceId)
      → Marks context.isReroll = true
      → Step 3:
        → KingdomModifierService.getModifiersForCheck()
        → RollStateService.getRollModifiers(instanceId, currentTurn)
        → Merge stored modifiers with fresh kingdom modifiers
        → PF2eSkillService.executeSkillRoll()
          → PF2e skill.roll() (does NOT store modifiers on reroll)
          → Pipeline continues to Step 4+
```

---

## Key Design Decisions

### 1. Single Source of Truth for Modifiers
RollStateService is the ONLY place that stores/retrieves roll modifiers for rerolls.

### 2. KingdomModifierService is Domain Logic
Lives in `domain/` not `pf2e/` because it deals with kingdom concepts (structures, unrest, aids), not PF2e concepts.

### 3. PF2eSkillService is Pure PF2e
Contains only DC calculation, skill slug mapping, and `skill.roll()` invocation. No kingdom-specific logic.

### 4. Turn-Aware Storage
Modifiers include `turnNumber` to enable validation and cleanup at turn boundaries.

### 5. Instance ID Format
Format: `T{turn}-{actionId}-{randomId}` (e.g., `T5-deploy-army-abc123`)
- Includes turn for traceability
- Includes action ID for debugging
- Random suffix for uniqueness

### 6. Centralized Reroll Handling
OutcomeDisplay calls PipelineCoordinator directly for rerolls, eliminating duplicate handlers in phase components.

### 7. No Module-Level State
RollStateService stores state in kingdom data (persisted), not in module-level variables (transient).
