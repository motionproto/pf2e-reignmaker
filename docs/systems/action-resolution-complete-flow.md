# Action Resolution: Complete Reference Guide

**Last Updated:** October 30, 2025  
**Purpose:** Comprehensive reference for implementing kingdom actions

This document describes the complete lifecycle of kingdom action resolution, covering all implementation patterns, architecture components, and troubleshooting guidance.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Implementation Patterns](#implementation-patterns)
4. [Complete Data Flow](#complete-data-flow)
5. [Data Structures](#data-structures)
6. [Game Command Execution](#game-command-execution)
7. [Code Organization](#code-organization)
8. [Best Practices](#best-practices)
9. [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

Kingdom actions follow a unified flow through several architectural layers:

```
User Interaction
    ↓
Pre-Roll Dialog (if needed)
    ↓
Check Instance Creation
    ↓
Skill Roll Execution
    ↓
Outcome Display (dice, choices)
    ↓
ResolutionData Construction
    ↓
Game Command Execution
    ↓
State Updates & Cleanup
```

### Key Principles

1. **Single Source of Truth**: All check state lives in `KingdomActor.activeCheckInstances`
2. **Typed Modifiers**: All outcomes use standardized modifier types (static, dice, choice)
3. **Separation of Concerns**: UI builds ResolutionData, controllers apply it
4. **Game Commands**: Complex effects (recruit army, reduce imprisoned, etc.) use game commands

---

## Architecture Components

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  UI Layer (Svelte Components)               │
│          ActionsPhase.svelte (orchestration only)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Roll Orchestration Helpers                      │
│         ActionExecutionHelpers.ts (roll setup)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              PF2e Roll System Integration                    │
│          performKingdomActionRoll() (dice + chat)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Custom Action Implementations                   │
│         src/actions/[action]/ (post-roll behavior)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Outcome Application Services                    │
│    OutcomeApplicationService.ts → ActionEffectsService.ts   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Single Source of Truth                        │
│              KingdomActor (Foundry persistence)             │
└─────────────────────────────────────────────────────────────┘
```

### Component Roles

| Component | Responsibility | What It Does NOT Do |
|-----------|---------------|---------------------|
| **ActionsPhase.svelte** | Phase orchestration, event routing | Business logic, roll execution details |
| **ActionExecutionHelpers** | Roll setup & execution | Custom action logic, outcome application |
| **ActionHelpers** | Domain validation | Roll execution, outcome application |
| **Custom Actions** | Post-roll behavior | Roll execution, generic validation |
| **OutcomeApplicationService** | Apply ResolutionData | Roll execution, custom action logic |
| **ActionEffectsService** | Complex state changes | Roll execution, resource modifiers |

### Key Components Details

#### **ActionsPhase.svelte** (Orchestrator)
- **Location:** `src/view/kingdom/turnPhases/ActionsPhase.svelte`
- **Size:** ~950 lines (reduced from 1600+ via refactoring)
- **Responsibilities:**
  - Phase lifecycle management (onMount/onDestroy)
  - Action dialog coordination
  - Event routing to controllers
  - Reactive display state

**Recent Refactoring (October 2025):**
- ✅ Extracted dialog management to `ActionDialogManager.svelte` (~100 lines saved)
- ✅ Extracted category rendering to `ActionCategorySection.svelte` (~120 lines saved)
- ✅ Extracted aid system to `AidSystemHelpers.ts` (~150 lines saved)
- ✅ Extracted roll execution to `ActionExecutionHelpers.ts` (~180 lines saved)

#### **ActionExecutionHelpers.ts**
- **Location:** `src/controllers/actions/ActionExecutionHelpers.ts`
- **Size:** ~170 lines
- **Purpose:** Consolidates roll execution logic that was duplicated 5 times

**Exports:**
```typescript
// Factory function to create execution context
export function createExecutionContext(
  actionId: string,
  skill: string,
  metadata?: Record<string, any>
): ExecutionContext

// Main execution function
export async function executeActionRoll(
  context: ExecutionContext,
  options: ExecutionOptions
): Promise<void>
```

**Before/After Example:**
```typescript
// ❌ BEFORE - Duplicated 5 times (~40 lines each)
async function executeBuildStructureRoll(buildAction) {
  let actingCharacter = getCurrentUserCharacter();
  if (!actingCharacter) {
    actingCharacter = await showCharacterSelectionDialog();
    if (!actingCharacter) {
      pendingBuildAction = null;
      return;
    }
  }
  // ... 30+ lines of boilerplate
}

// ✅ AFTER - Consolidated to 8 lines
async function executeBuildStructureRoll(buildAction) {
  await executeActionRoll(
    createExecutionContext('build-structure', buildAction.skill, {
      structureId: buildAction.structureId,
      settlementId: buildAction.settlementId
    }),
    {
      getDC: (level) => controller.getActionDC(level),
      onRollCancel: () => { pendingBuildAction = null; }
    }
  );
}
```

#### **ActionHelpers.ts** (Domain Validation)
- **Location:** `src/actions/shared/ActionHelpers.ts`
- **Size:** ~350 lines
- **Purpose:** Shared validation & utility functions

**Key Functions:**
```typescript
// Resource validation
hasRequiredResources(kingdom, required): ResourceCheckResult
formatMissingResources(missing): string

// Settlement operations
hasSettlementCapacity(settlement): CapacityCheckResult
findSettlementById(kingdom, id): Settlement | null

// Army operations
findArmyById(kingdom, id): Army | null

// Unrest management
calculateImprisonmentCapacity(kingdom): ImprisonmentCapacity

// Result builders
createSuccessResult(message, data?): ResolveResult
createErrorResult(error): ResolveResult

// Logging
logActionStart(actionId, details?): void
logActionSuccess(actionId, details?): void
logActionError(actionId, error): void
```

---

## Implementation Patterns

### Pattern Decision Tree

```
┌─ Does action need user selection BEFORE roll?
│  ├─ YES → Pre-Roll Dialog Pattern
│  └─ NO → Continue
│
├─ Does outcome need calculation beyond simple modifiers?
│  ├─ YES → Custom Resolution Pattern
│  └─ NO → Continue
│
├─ Does action create/modify entities (armies, settlements)?
│  ├─ YES → Game Command Pattern
│  └─ NO → Continue
│
├─ Does UI need complex interaction AFTER outcome?
│  ├─ YES → Custom Component Pattern
│  └─ NO → Standard JSON-Only Action
```

---

### Pattern 1: Standard JSON-Only Action

**When to Use:**
- Simple resource modifiers
- No special logic needed
- Standard success/failure outcomes

**Examples:** `claim-hexes`, `deal-with-unrest`

**Implementation:**
1. Create JSON file in `data/player-actions/{action-id}.json`
2. Define effects with modifiers
3. No additional code needed

**Example JSON:**
```json
{
  "id": "deal-with-unrest",
  "name": "Deal with Unrest",
  "category": "uphold-stability",
  "skills": [{"skill": "diplomacy", "description": "diplomatic engagement"}],
  "effects": {
    "success": {
      "description": "The People Listen",
      "modifiers": [{
        "type": "static",
        "resource": "unrest",
        "value": -2,
        "duration": "immediate"
      }]
    }
  }
}
```

---

### Pattern 2: Pre-Roll Dialog Pattern

**When to Use:**
- Settlement selection - Income/effects vary by settlement
- Structure selection - Different costs/requirements
- Faction selection - Diplomatic target must be known
- Prisoner location - Which settlement's prisoners

**Examples:** `collect-stipend`, `build-structure`, `execute-or-pardon-prisoners`

#### Implementation Steps

**Step 1: Create Dialog Component**

Create `src/actions/{action-id}/SettlementSelectionDialog.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';

  export let show: boolean = false;
  const dispatch = createEventDispatcher();

  // Filter and prepare selection data
  $: eligibleItems = ($kingdomData?.settlements || [])
    .filter(s => meetsRequirements(s))
    .sort((a, b) => sortPriority(a, b));

  function handleSelect(itemId: string) {
    dispatch('settlementSelected', { settlementId: itemId });
    show = false;
  }
</script>

{#if show}
  <div class="dialog-overlay" on:click={() => show = false}>
    <div class="dialog-content" on:click|stopPropagation>
      <!-- Your selection UI -->
    </div>
  </div>
{/if}
```

**Step 2: Register in Action Handlers Config**

In `src/controllers/actions/action-handlers-config.ts`:

```typescript
export function createCustomActionHandlers(context) {
  return {
    'your-action-id': {
      requiresPreDialog: true,
      showDialog: () => context.setShowYourDialog(true),
      storePending: (skill: string) => context.setPendingYourAction({ skill })
    }
  };
}
```

**Step 3: Add State to ActionsPhase**

In `src/view/kingdom/turnPhases/ActionsPhase.svelte`:

```typescript
// Add dialog visibility flag
let showYourDialog: boolean = false;

// Add pending action data
let pendingYourAction: { skill: string; yourSelectionId?: string } | null = null;

// Pass to custom handlers factory
$: CUSTOM_ACTION_HANDLERS = createCustomActionHandlers({
  setShowYourDialog: (show) => { showYourDialog = show; },
  setPendingYourAction: (action) => { pendingYourAction = action; }
});
```

**Step 4: Add Selection Handler**

```typescript
async function handleYourSelectionMade(event: CustomEvent) {
  const { yourSelectionId } = event.detail;
  
  if (pendingYourAction) {
    pendingYourAction.yourSelectionId = yourSelectionId;
    showYourDialog = false;
    
    // Store in global state for action-resolver
    (globalThis as any).__pendingYourSelection = yourSelectionId;
    
    await executeYourActionRoll(pendingYourAction);
  }
}

async function executeYourActionRoll(actionData) {
  await executeActionRoll(
    createExecutionContext('your-action-id', actionData.skill, {
      yourSelectionId: actionData.yourSelectionId
    }),
    {
      getDC: (level) => controller.getActionDC(level),
      onRollCancel: () => { 
        pendingYourAction = null;
        delete (globalThis as any).__pendingYourSelection;
      }
    }
  );
}
```

**Step 5: Register in ActionDialogManager**

In `src/view/kingdom/turnPhases/components/ActionDialogManager.svelte`:

```svelte
<script lang="ts">
  import YourDialog from '../../../../actions/your-action-id/YourDialog.svelte';
  
  export let showYourDialog: boolean = false;
  
  function handleYourSelection(event: CustomEvent) {
    dispatch('yourSelection', event.detail);
  }
</script>

<YourDialog
  bind:show={showYourDialog}
  on:yourSelectionEvent={handleYourSelection}
/>
```

#### Common Patterns

**Global State for Action Resolver:**
```typescript
// In selection handler
(globalThis as any).__pendingYourSelection = selectionId;

// In action-resolver.ts
const selectionId = (globalThis as any).__pendingYourSelection;

// Clean up after resolution
delete (globalThis as any).__pendingYourSelection;
```

**Testing Checklist:**
- [ ] Dialog opens when action button clicked
- [ ] Dialog shows only valid selections
- [ ] Selecting item closes dialog
- [ ] Canceling dialog clears pending state
- [ ] Skill roll executes with correct context
- [ ] Selection data accessible in action resolver
- [ ] Global state cleaned up after resolution
- [ ] Action can be performed multiple times

---

### Pattern 3: Custom Resolution Pattern

**When to Use:**
- Outcome calculations are complex
- Post-roll behavior needed (like 50% cost reduction)
- Tier transitions or state changes

**Examples:** `build-structure` (50% cost reduction), `upgrade-settlement` (tier transitions)

#### Implementation

**Step 1: Create Action File**

Create `src/actions/{action-id}/YourAction.ts`:

```typescript
import type { ActionImplementation, ResolutionData } from '../types';

export const YourAction: ActionImplementation = {
  id: 'your-action',
  
  customResolution: {
    execute: async (resolution: ResolutionData, customData?: any): Promise<any> => {
      // Apply special logic based on outcome
      if (resolution.outcome === 'criticalSuccess') {
        // Modify costs, add bonuses, etc.
        resolution.numericModifiers = resolution.numericModifiers.map(mod => ({
          ...mod,
          value: mod.value === 0 ? 0 : Math.ceil(mod.value / 2)
        }));
      }
      
      // Execute custom state changes
      // e.g., add to build queue, update tiers, etc.
      
      return { success: true };
    }
  }
};
```

**Step 2: Register Action**

In `src/controllers/actions/implementations/index.ts`:

```typescript
import { YourAction } from '../../../actions/your-action/YourAction';

export const ACTION_IMPLEMENTATIONS = {
  'your-action': YourAction,
  'build-structure': BuildStructureAction,
  // ... other implementations
};
```

---

### Pattern 4: Game Command Pattern

**When to Use:**
- Complex state changes beyond simple resource modifiers
- Entity creation/modification (armies, settlements)
- Settlement-specific data updates (imprisoned unrest)
- Character gold transfers

**Examples:** 
- `recruit-unit` (recruitArmy)
- `execute-or-pardon-prisoners` (reduceImprisoned)
- `collect-stipend` (giveActorGold)
- `disband-army` (disbandArmy)

#### Available Game Commands

| Command | Purpose | Parameters |
|---------|---------|------------|
| `recruitArmy` | Create new army unit | `level` (number or "kingdom-level") |
| `disbandArmy` | Remove army unit | `targetArmy` (army ID) |
| `foundSettlement` | Create new settlement | `name`, `location`, `grantFreeStructure` |
| `reduceImprisoned` | Reduce imprisoned unrest | `settlementId`, `amount` ("all", "rolled", or number) |
| `giveActorGold` | Transfer gold to player | `multiplier`, `settlementId` |

#### Implementation in Action JSON

```json
{
  "success": {
    "description": "Remove imprisoned unrest",
    "modifiers": [{
      "type": "dice",
      "resource": "imprisoned",
      "formula": "1d4",
      "operation": "subtract"
    }],
    "gameCommands": [{
      "type": "reduceImprisoned",
      "amount": "rolled"
    }]
  }
}
```

#### How Game Commands Execute

```typescript
// ActionResolver.executeAction()
// 1. Apply resource modifiers first
await gameCommandsService.applyOutcome({
  type: 'action',
  sourceId: action.id,
  outcome,
  modifiers,
  preRolledValues
});

// 2. Execute game commands
for (const gameCommand of gameCommands) {
  await this.executeGameCommand(
    gameCommand,
    resolver,
    kingdomData,
    outcome === 'criticalSuccess',
    preRolledValues,
    modifiers  // Pass for dice value lookups
  );
}
```

#### Adding New Game Commands

**Step 1: Add to ActionResolver.executeGameCommand()**

In `src/controllers/actions/action-resolver.ts`:

```typescript
switch (gameCommand.type) {
  case 'yourNewCommand': {
    // Extract parameters from gameCommand
    const param = gameCommand.yourParam;
    
    // Handle special values (like "rolled")
    if (param === 'rolled') {
      const modifierIndex = modifiers.findIndex(m => m.resource === 'target');
      param = preRolledValues?.get(modifierIndex);
    }
    
    return await resolver.yourNewCommand(param);
  }
}
```

**Step 2: Implement in GameCommandsResolver**

In `src/services/GameCommandsResolver.ts`:

```typescript
async yourNewCommand(param: any): Promise<CommandResult> {
  const kingdom = await this.getKingdomData();
  
  // Your logic here
  await updateKingdom(k => {
    // Modify kingdom state
  });
  
  return {
    success: true,
    message: 'Command executed',
    data: { /* result data */ }
  };
}
```

---

### Pattern 5: Custom Component Pattern

**When to Use:**
- User needs to make choices AFTER seeing outcome
- Complex UI needed for resolution
- Multi-step post-outcome interaction

**Examples:** `arrest-dissidents` (choose amount to imprison)

#### Implementation

**Step 1: Create Custom Component**

Create `src/view/kingdom/components/OutcomeDisplay/components/YourCustomResolution.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../stores/KingdomStore';
  
  export let outcome: string;
  export let maxAmount: number;
  
  const dispatch = createEventDispatcher();
  let selectedAmount = 0;
  
  function handleApply() {
    dispatch('apply', { amount: selectedAmount });
  }
</script>

<div class="custom-resolution">
  <!-- Your custom UI -->
  <button on:click={handleApply}>Apply</button>
</div>
```

**Step 2: Register in Action JSON**

```json
{
  "success": {
    "description": "Choose amount",
    "modifiers": [],
    "customResolution": true
  }
}
```

**Step 3: Integrate in OutcomeDisplay**

The component will be automatically mounted when `customResolution: true` is detected.

---

### Pattern 6: Hybrid Pattern (Combinations)

**Common Combinations:**
1. **Pre-Roll + Game Commands** - `collect-stipend`, `execute-or-pardon-prisoners`
2. **Pre-Roll + Custom Resolution** - `build-structure`, `repair-structure`
3. **Custom Resolution + Game Commands** - `build-structure`
4. **Pre-Roll + Custom Resolution + Game Commands** - Most complex actions

**Example: build-structure**
- ✅ Pre-Roll Dialog (select structure + settlement)
- ✅ Custom Resolution (50% cost reduction on crit success)
- ✅ Game Commands (add to build queue)

---

## Complete Data Flow

### Step-by-Step Example: Execute or Pardon Prisoners

#### Phase 1: Pre-Roll Dialog

```
1. User clicks "Execute or Pardon Prisoners" skill button
   ↓
2. ActionsPhase.handleExecuteSkill() checks CUSTOM_ACTION_HANDLERS
   ↓
3. requiresPreDialog === true → Opens dialog
   ↓
4. User selects settlement (e.g., "Olegton" with 5 imprisoned)
   ↓
5. Dialog emits 'settlementSelected' event
   ↓
6. ActionsPhase stores: 
   - pendingExecuteOrPardonAction = { skill: 'Diplomacy', settlementId: 'olegton-123' }
   - globalThis.__pendingExecuteOrPardonSettlement = 'olegton-123'
```

#### Phase 2: Skill Roll

```
7. ActionsPhase.executeExecuteOrPardonRoll()
   ↓
8. ActionExecutionHelpers.executeActionRoll() with context
   ↓
9. Character selection (if needed)
   ↓
10. DC calculation from character level
   ↓
11. performKingdomActionRoll() executes PF2e roll
   ↓
12. Roll result: "Success" → kingdomRollComplete event fires
```

#### Phase 3: Check Instance Creation

```
13. ActionsPhase.handleRollComplete() receives event
   ↓
14. CheckInstanceHelpers.createActionCheckInstance()
   ↓
15. Creates ActiveCheckInstance with:
    - checkType: 'action'
    - checkId: 'execute-or-pardon-prisoners'
    - status: 'pending'
    - appliedOutcome: {
        outcome: 'success',
        modifiers: [{
          type: 'dice',
          resource: 'imprisoned',
          formula: '1d4',
          operation: 'subtract'
        }]
      }
   ↓
16. Stores in KingdomActor.activeCheckInstances[]
   ↓
17. Action card expands, OutcomeDisplay renders
```

#### Phase 4: Outcome Interaction

```
18. OutcomeDisplay mounts with instance
   ↓
19. DiceRoller component detects dice modifier:
    - resource: 'imprisoned'
    - formula: '1d4'
    - originalIndex: 0
   ↓
20. User clicks "Roll 1d4 for Imprisoned" button
   ↓
21. DiceRoller.handleRoll()
    - Rolls dice: result = 3
    - Emits 'roll' event with { modifierIndex: 0, result: 3 }
   ↓
22. OutcomeDisplay.handleDiceRoll()
    - Stores in instance.resolutionState.resolvedDice[0] = 3
    - Updates via CheckInstanceService
   ↓
23. Primary button ("Apply Result") becomes enabled
```

#### Phase 5: Resolution Application

```
24. User clicks "Apply Result" button
   ↓
25. OutcomeDisplay.handlePrimary()
    - Calls computeResolutionData()
    - Builds ResolutionData:
      {
        numericModifiers: [{
          resource: 'imprisoned',
          value: 3  // Already rolled!
        }],
        manualEffects: [],
        complexActions: []
      }
    - Emits 'primary' event with ResolutionData
   ↓
26. ActionsPhase.applyActionEffects() receives event
   ↓
27. Calls controller.resolveAction(actionId, outcome, resolutionData)
```

#### Phase 6: Game Command Execution

```
28. ActionPhaseController.resolveAction()
   ↓
29. Checks for custom implementation (none for this action)
   ↓
30. ⚠️ CRITICAL STEP: Converts ResolutionData to preRolledValues Map
    ```typescript
    const preRolledValues = new Map<number | string, number>();
    const actionModifiers = this.getActionModifiers(action, outcome);
    
    resolutionData.numericModifiers.forEach(rolled => {
      const modifierIndex = actionModifiers.findIndex(m => m.resource === rolled.resource);
      if (modifierIndex !== -1) {
        preRolledValues.set(modifierIndex, rolled.value);
      }
    });
    // Result: preRolledValues.set(0, 3)
    ```
   ↓
31. Calls actionResolver.executeAction(action, outcome, kingdom, preRolledValues)
   ↓
32. ActionResolver applies modifiers FIRST (resources like food, gold)
   ↓
33. ActionResolver executes game commands from action JSON:
    ```typescript
    const gameCommand = {
      type: 'reduceImprisoned',
      amount: 'rolled'
    };
    ```
   ↓
34. ActionResolver.executeGameCommand() handles 'rolled' amount:
    ```typescript
    if (amount === 'rolled') {
      const imprisonedModifierIndex = modifiers.findIndex(m => 
        m.resource === 'imprisoned' && m.type === 'dice'
      );
      const rolledValue = preRolledValues.get(imprisonedModifierIndex); // Gets 3
      amount = rolledValue;
    }
    ```
   ↓
35. Calls GameCommandsResolver.reduceImprisoned(settlementId, 3)
   ↓
36. GameCommandsResolver:
    - Gets settlement: findSettlementById(kingdom, 'olegton-123')
    - Reduces: settlement.imprisonedUnrest -= 3
    - Updates via updateKingdom()
   ↓
37. State syncs to all clients via Foundry VTT
```

#### Phase 7: Cleanup

```
38. CheckInstanceService.markApplied(instanceId)
   ↓
39. Instance status: 'pending' → 'applied'
   ↓
40. UI shows "✓ Applied" badge
   ↓
41. GameCommandsService.trackPlayerAction() logs action
   ↓
42. Clean up pending state:
    - delete globalThis.__pendingExecuteOrPardonSettlement
    - pendingExecuteOrPardonAction = null
   ↓
43. CheckInstanceService.clearInstance(instanceId) 
   ↓
44. Card resets, can be performed again
```

---

## Data Structures

### ActiveCheckInstance

**Storage:** `KingdomActor.activeCheckInstances: ActiveCheckInstance[]`

```typescript
interface ActiveCheckInstance {
  // Identity
  instanceId: string;
  checkType: 'event' | 'incident' | 'action';
  checkId: string;
  checkData: KingdomEvent | KingdomIncident | PlayerAction;
  
  // Lifecycle
  createdTurn: number;
  status: 'pending' | 'resolved' | 'applied';
  
  // Applied outcome (syncs across clients)
  appliedOutcome?: {
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    actorName: string;
    skillName: string;
    effect: string;
    modifiers: EventModifier[];  // Preliminary (from JSON)
    manualEffects: string[];
    shortfallResources: string[];
    effectsApplied: boolean;
  };
  
  // Resolution state (UI interactions)
  resolutionState?: {
    selectedChoice: number | null;
    resolvedDice: Record<number | string, number>;  // Dice roll results
    selectedResources: Record<number, string>;
    customComponentData: any;
  };
}
```

### ResolutionData

**Format returned by OutcomeDisplay:**

```typescript
interface ResolutionData {
  // Numeric changes (dice already rolled, choices already made)
  numericModifiers: Array<{
    resource: ResourceType;  // 'food', 'gold', 'imprisoned', etc.
    value: number;           // Resolved value (e.g., dice roll result)
  }>;
  
  // Manual effects (displayed to user, not auto-applied)
  manualEffects: string[];
  
  // Complex actions (future - not yet implemented)
  complexActions: any[];
  
  // Custom component data (action-specific)
  customComponentData?: any;
}
```

### Game Commands

**Format in action JSON files:**

```json
{
  "success": {
    "description": "Remove imprisoned unrest",
    "modifiers": [{
      "type": "dice",
      "resource": "imprisoned",
      "formula": "1d4",
      "operation": "subtract"
    }],
    "gameCommands": [{
      "type": "reduceImprisoned",
      "settlementId": "stored-in-globalThis",
      "amount": "rolled"
    }]
  }
}
```

---

## Game Command Execution

### Why Game Commands Exist

Some action outcomes require complex state changes beyond simple resource modifiers:
- **reduceImprisoned**: Update settlement.imprisonedUnrest (not a kingdom resource)
- **recruitArmy**: Create new army entity
- **foundSettlement**: Create settlement, grant free structure on crit success
- **giveActorGold**: Transfer kingdom gold to player character

### Game Command Flow

```
Action JSON → ActionResolver → GameCommandsResolver → State Updates
```

### Execution in ActionResolver

```typescript
// ActionResolver.executeAction()

// 1. Apply resource modifiers first
const result = await gameCommandsService.applyOutcome({
  type: 'action',
  sourceId: action.id,
  outcome,
  modifiers,
  preRolledValues
});

// 2. Execute game commands
const gameCommands = action[outcome]?.gameCommands || [];
for (const gameCommand of gameCommands) {
  await this.executeGameCommand(
    gameCommand,
    resolver,
    kingdomData,
    outcome === 'criticalSuccess',
    preRolledValues,
    modifiers  // Pass for dice value lookups
  );
}
```

### Game Command Handlers

```typescript
// ActionResolver.executeGameCommand()
switch (gameCommand.type) {
  case 'reduceImprisoned': {
    let settlementId = (globalThis as any).__pendingExecuteOrPardonSettlement;
    let amount = gameCommand.amount;
    
    if (amount === 'rolled') {
      const imprisonedModifierIndex = modifiers.findIndex(m => 
        m.resource === 'imprisoned' && m.type === 'dice'
      );
      const rolledValue = preRolledValues?.get(imprisonedModifierIndex);
      amount = rolledValue;
    }
    
    return await resolver.reduceImprisoned(settlementId, amount);
  }
  
  case 'recruitArmy': {
    const level = gameCommand.level === 'kingdom-level' 
      ? getPartyLevel() 
      : gameCommand.level;
    return await resolver.recruitArmy(level);
  }
  
  // ... other commands
}
```

---

## Code Organization

### Directory Structure

```
src/
├── actions/                           # Custom action implementations
│   ├── build-structure/
│   │   └── BuildStructureAction.ts   # Post-roll: 50% cost reduction
│   ├── upgrade-settlement/
│   │   └── UpgradeSettlementAction.ts # Post-roll: tier transitions
│   ├── repair-structure/
│   │   └── RepairStructureAction.ts   # Post-roll: repair mechanics
│   └── shared/
│       └── ActionHelpers.ts           # Domain validation utilities
│
├── controllers/
│   ├── actions/
│   │   ├── ActionExecutionHelpers.ts  # Roll orchestration
│   │   └── implementations/
│   │       └── index.ts               # Action implementation registry
│   └── shared/
│       └── AidSystemHelpers.ts        # Reusable aid system
│
├── services/
│   ├── ActionDispatcher.ts            # GM/player socket communication
│   ├── ActionEffectsService.ts        # Complex state changes
│   └── resolution/
│       └── OutcomeApplicationService.ts # Outcome application
│
└── view/kingdom/turnPhases/
    ├── ActionsPhase.svelte            # Main orchestrator (~950 lines)
    └── components/
        ├── ActionDialogManager.svelte  # Dialog management
        └── ActionCategorySection.svelte # Category rendering
```

### Recent Refactoring (October 2025)

**Goals Achieved:**
1. ✅ Reduced ActionsPhase.svelte from 1600+ to ~950 lines (41% reduction)
2. ✅ Eliminated code duplication (5 execute*Roll functions → 1 helper)
3. ✅ Improved reusability (Aid system usable by EventsPhase)
4. ✅ Better maintainability (changes in one place affect all uses)
5. ✅ Preserved all functionality (no breaking changes)

**New Components Created:**
- `ActionExecutionHelpers.ts` - Roll orchestration (~170 lines)
- `AidSystemHelpers.ts` - Reusable aid system (~230 lines)
- `ActionDialogManager.svelte` - Dialog management (~110 lines)
- `ActionCategorySection.svelte` - Category rendering (~190 lines)

---

## Best Practices

### 1. Use Helpers for Common Patterns

**✅ DO:**
```typescript
// Use ActionExecutionHelpers for roll execution
await executeActionRoll(
  createExecutionContext('my-action', skill, metadata),
  { getDC: (level) => controller.getActionDC(level) }
);

// Use ActionHelpers for validation
const check = hasRequiredResources(kingdom, required);
if (!check.valid) {
  return createErrorResult(`Missing: ${formatMissingResources(check.missing)}`);
}
```

**❌ DON'T:**
```typescript
// Don't duplicate roll execution logic
let actingCharacter = getCurrentUserCharacter();
if (!actingCharacter) {
  actingCharacter = await showCharacterSelectionDialog();
  // ... 30+ lines of boilerplate
}
```

### 2. Custom Actions Only When Needed

**✅ DO:**
```typescript
// Create custom implementation for post-roll behavior
export const BuildStructureAction: ActionImplementation = {
  customResolution: {
    execute: async (resolution, customData) => {
      // Special logic: 50% cost reduction
      // Add to build queue
    }
  }
};
```

**❌ DON'T:**
```typescript
// Don't create custom implementation for simple modifiers
// These should be in the action JSON file instead
```

### 3. Keep Components Presentational

**✅ DO:**
```typescript
// Component delegates to helper
async function handleBuild() {
  await executeActionRoll(
    createExecutionContext('build-structure', skill, metadata),
    { getDC: (level) => controller.getActionDC(level) }
  );
}
```

**❌ DON'T:**
```typescript
// Don't put business logic in components
async function handleBuild() {
  const character = getCurrentUserCharacter();
  const dc = 15 + Math.floor(character.level / 2);
  // ... 50+ lines of logic
}
```

### 4. Use Type Safety

**✅ DO:**
```typescript
import type { ActionImplementation, ResolutionData } from '../types';
import { logActionStart, logActionSuccess } from '../shared/ActionHelpers';

export const MyAction: ActionImplementation = {
  id: 'my-action',
  customResolution: {
    execute: async (resolution: ResolutionData, customData?: any) => {
      logActionStart('my-action');
      // Implementation
      logActionSuccess('my-action');
      return { success: true };
    }
  }
};
```

### 5. Consistent Error Handling

**✅ DO:**
```typescript
try {
  await executeActionRoll(context, options);
} catch (error) {
  logActionError('my-action', error);
  ui.notifications?.error(`Failed: ${error.message}`);
}
```

### 6. Pattern Selection Guide

**Decision Table:**

| Requirement | Pattern(s) to Use |
|------------|------------------|
| Simple resource changes | Standard JSON-Only |
| Need context before roll | Pre-Roll Dialog |
| Complex outcome calculation | Custom Resolution |
| Create/modify entities | Game Commands |
| Complex post-outcome UI | Custom Component |
| Multiple requirements | Hybrid (combine patterns) |

---

## Common Issues & Solutions

### Issue 1: Dice Values Not Being Applied

**Symptom:** User rolls dice, clicks Apply, but rolled value not used in game command.

**Root Cause:** ResolutionData not being converted back to preRolledValues Map.

**Solution:**
```typescript
// ActionPhaseController must convert ResolutionData → preRolledValues
const preRolledValues = new Map();
resolutionData.numericModifiers.forEach(rolled => {
  const modifierIndex = actionModifiers.findIndex(m => m.resource === rolled.resource);
  if (modifierIndex !== -1) {
    preRolledValues.set(modifierIndex, rolled.value);
  }
});
```

### Issue 2: Duplicate Dice Rollers

**Symptom:** Same dice appears twice in outcome display.

**Root Cause:** Both DiceRoller.svelte and StateChanges.svelte rendering dice buttons.

**Solution:** DiceRoller handles dice, StateChanges only shows static results:
```typescript
// StateChanges.svelte
$: diceModifiersToShow = [];  // Don't render dice buttons
$: hasDiceModifiers = false;   // Let DiceRoller handle it
```

### Issue 3: originalIndex Mismatch

**Symptom:** Dice roll stored at index 0, but ActionResolver looks at index 1.

**Root Cause:** Filtering array BEFORE setting originalIndex.

**Solution:** Set originalIndex BEFORE filtering:
```typescript
// ✅ CORRECT
$: diceModifiers = modifiers
  ?.map((m, originalIdx) => ({ ...m, originalIndex: originalIdx }))
  .filter(m => hasDice(m)) || [];

// ❌ WRONG
$: diceModifiers = modifiers
  ?.filter(m => hasDice(m))
  .map((m, idx) => ({ ...m, originalIndex: idx })) || [];
```

### Issue 4: Game Commands Not Executing

**Symptom:** Resource modifiers apply, but game command effects don't happen.

**Root Cause:** Controller bypassing ActionResolver.executeAction().

**Solution:** Always call ActionResolver.executeAction() for actions with game commands:
```typescript
// ✅ CORRECT - ActionPhaseController
await actionResolver.executeAction(action, outcome, kingdom, preRolledValues);

// ❌ WRONG - Bypassing ActionResolver
await resolvePhaseOutcome(actionId, 'action', outcome, resolutionData, []);
```

### Issue 5: Game Commands Not Loading from JSON

**Symptom:** Action JSON has gameCommands, but ActionResolver finds none.

**Root Cause:** action-loader.ts not copying gameCommands from JSON.

**Solution:** Ensure action-loader includes gameCommands in all outcome mappings:
```typescript
// action-loader.ts
success: {
  description: raw.effects.success?.description || '',
  modifiers: raw.effects.success?.modifiers,
  gameCommands: raw.effects.success?.gameCommands  // ✅ Must include!
}
```

### Issue 6: Pre-Roll Dialog Not Opening

**Symptom:** Click action button, nothing happens.

**Root Cause:** Missing registration in CUSTOM_ACTION_HANDLERS or dialog not bound.

**Solution:** Verify registration and binding:
```typescript
// 1. Check action-handlers-config.ts
'your-action': {
  requiresPreDialog: true,
  showDialog: () => context.setShowYourDialog(true)
}

// 2. Check ActionsPhase.svelte
let showYourDialog: boolean = false;

// 3. Check ActionDialogManager.svelte
<YourDialog bind:show={showYourDialog} />
```

### Issue 7: Selection Data Not Accessible in Resolver

**Symptom:** Pre-roll dialog selection made, but game command doesn't have data.

**Root Cause:** Not storing selection in global state.

**Solution:** Store in global state after dialog selection:
```typescript
// In selection handler
(globalThis as any).__pendingYourSelection = selectionId;

// In action resolver
const selectionId = (globalThis as any).__pendingYourSelection;

// Clean up after
delete (globalThis as any).__pendingYourSelection;
```

---

## Summary

The complete action resolution system ensures:

- ✅ **Six implementation patterns** cover all action types
- ✅ **Pre-roll dialogs** collect necessary context before skill checks
- ✅ **Check instances** provide single source of truth for check state
- ✅ **ResolutionData** captures all user interactions in standardized format
- ✅ **Game commands** execute complex state changes beyond simple resources
- ✅ **Proper data flow** maintains consistency from UI through to state updates
- ✅ **Reusable helpers** eliminate code duplication
- ✅ **Type safety** prevents runtime errors

This architecture supports all action types through a unified, maintainable pattern that can be extended as needed.

---

## Related Documentation

- **Main Architecture:** `docs/ARCHITECTURE.md`
- **Game Commands System:** `docs/systems/game-commands-system.md`
- **Check Instance System:** `docs/systems/check-instance-system.md`
- **Phase Controllers:** `docs/systems/phase-controllers.md`

---

**Last Major Update:** October 30, 2025 - Consolidated from three separate documents (actions-architecture.md, pre-roll-dialog-pattern.md, action-resolution-complete-flow.md)
