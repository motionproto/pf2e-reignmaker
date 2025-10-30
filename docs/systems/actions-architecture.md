# Actions Architecture & Data Flow

**Last Updated:** October 30, 2025

## Overview

The Actions system provides a structured, type-safe approach to executing player actions in kingdom management. This document describes the complete action lifecycle from UI interaction to game state changes, including the recent refactoring that improved code organization and eliminated duplication.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Roles](#component-roles)
3. [Action Lifecycle](#action-lifecycle)
4. [Data Flow Diagram](#data-flow-diagram)
5. [Custom Action Implementations](#custom-action-implementations)
6. [Code Organization](#code-organization)
7. [Best Practices](#best-practices)

---

## Architecture Overview

The Actions system uses a **layered architecture** with clear separation of concerns:

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

---

## Component Roles

### 1. UI Layer Components

#### **ActionsPhase.svelte** (Orchestrator)
- **Location:** `src/view/kingdom/turnPhases/ActionsPhase.svelte`
- **Size:** ~950 lines (reduced from 1600+ via refactoring)
- **Responsibilities:**
  - Phase lifecycle management (onMount/onDestroy)
  - Action dialog coordination
  - Event routing to controllers
  - Reactive display state

**Key Refactoring:**
- ✅ Extracted dialog management to `ActionDialogManager.svelte` (~100 lines saved)
- ✅ Extracted category rendering to `ActionCategorySection.svelte` (~120 lines saved)
- ✅ Extracted aid system to `AidSystemHelpers.ts` (~150 lines saved)
- ✅ Extracted roll execution to `ActionExecutionHelpers.ts` (~180 lines saved)

#### **ActionDialogManager.svelte**
- **Location:** `src/view/kingdom/turnPhases/components/ActionDialogManager.svelte`
- **Size:** ~110 lines
- **Responsibilities:**
  - Manages all 6 action dialogs (Build, Repair, Upgrade, Faction, Aid, Settlement)
  - Centralizes dialog state
  - Dispatches events to parent component

#### **ActionCategorySection.svelte**
- **Location:** `src/view/kingdom/turnPhases/components/ActionCategorySection.svelte`
- **Size:** ~190 lines
- **Responsibilities:**
  - Renders single action category
  - Loops through actions with BaseCheckCard
  - Reduces template duplication

---

### 2. Roll Orchestration Layer

#### **ActionExecutionHelpers.ts** (NEW - October 2025)
- **Location:** `src/controllers/actions/ActionExecutionHelpers.ts`
- **Size:** ~170 lines
- **Purpose:** Consolidates roll execution logic that was duplicated 5 times in ActionsPhase.svelte

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

**Responsibilities:**
- Character selection (getCurrentUser or showDialog)
- DC calculation via controller
- Execute `performKingdomActionRoll()`
- Error handling & user feedback
- Cancellation cleanup

**Used By:** ActionsPhase.svelte for all action roll execution

**Before/After Example:**
```typescript
// ❌ BEFORE - Duplicated 5 times (~40 lines each)
async function executeBuildStructureRoll(buildAction) {
  if (!buildAction.structureId) return;
  
  let actingCharacter = getCurrentUserCharacter();
  if (!actingCharacter) {
    actingCharacter = await showCharacterSelectionDialog();
    if (!actingCharacter) {
      pendingBuildAction = null;
      return;
    }
  }
  
  try {
    const characterLevel = actingCharacter.level || 1;
    const dc = controller.getActionDC(characterLevel);
    const action = actionLoader.getAllActions().find(a => a.id === 'build-structure');
    if (!action) return;
    
    await performKingdomActionRoll(
      actingCharacter, buildAction.skill, dc,
      action.name, action.id,
      { criticalSuccess: action.criticalSuccess, /* ... */ }
    );
  } catch (error) {
    logger.error("Error:", error);
    pendingBuildAction = null;
  }
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

---

### 3. Aid System

#### **AidSystemHelpers.ts** (NEW - October 2025)
- **Location:** `src/controllers/shared/AidSystemHelpers.ts`
- **Size:** ~230 lines
- **Purpose:** Reusable aid system for both Actions and Events phases

**Exports:**
```typescript
export function createAidManager(config: AidManagerConfig): AidManager

interface AidManager {
  executeAidRoll(skill: string, targetActionId: string, targetActionName: string): Promise<void>
  getAidResult(actionId: string): { outcome: string; bonus: number } | null
  cleanup(): void
}
```

**Responsibilities:**
- Aid roll execution with proficiency-based bonuses
- Aid result tracking in kingdom state
- Event listener management
- Automatic cleanup

**Used By:** ActionsPhase.svelte and EventsPhase.svelte

---

### 4. Action Implementation Layer

#### **src/actions/** (Custom Action Logic)

**Structure:**
```
src/actions/
├── build-structure/
│   └── BuildStructureAction.ts          # 50% cost reduction on crit success
├── upgrade-settlement/
│   └── UpgradeSettlementAction.ts       # Tier transitions & gold cost calculation
├── repair-structure/
│   └── RepairStructureAction.ts         # Structure repair mechanics
├── claim-hexes/
│   └── ClaimHexesAction.ts              # Standard action (no custom logic)
└── shared/
    └── ActionHelpers.ts                 # Domain validation utilities
```

**When to Create Custom Action Implementation:**

✅ **YES - Create custom implementation when:**
- Action has post-roll behavior (like 50% cost reduction)
- Outcome calculations are complex
- Custom UI is needed for the action

❌ **NO - Standard action when:**
- Action only applies resource modifiers
- No special logic needed
- Standard success/failure outcomes

**Example: BuildStructureAction.ts**
```typescript
export const BuildStructureAction: ActionImplementation = {
  id: 'build-structure',
  
  customResolution: {
    execute: async (resolution: ResolutionData, customData?: any): Promise<any> => {
      const { structureId, settlementId } = customData;
      
      // Apply 50% cost reduction on critical success
      if (resolution.outcome === 'criticalSuccess') {
        // Reduce costs by 50%
        resolution.numericModifiers = resolution.numericModifiers.map(mod => ({
          ...mod,
          value: mod.value === 0 ? 0 : Math.ceil(mod.value / 2)
        }));
      }
      
      // Add to build queue
      const project = { 
        structureId, 
        settlementId, 
        remainingTurns: 1 
      };
      await buildQueueService.addToQueue(project);
      
      return { success: true };
    }
  }
};
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
findSettlementWithCapacity(kingdom): Settlement | null

// Army operations
findArmyById(kingdom, id): Army | null
countArmiesByLevel(kingdom, minLevel): number

// Unrest management
calculateImprisonmentCapacity(kingdom): ImprisonmentCapacity
hasUnrestToArrest(kingdom): boolean

// Template utilities
replaceTemplatePlaceholders(template, replacements): string

// Result builders
createSuccessResult(message, data?): ResolveResult
createErrorResult(error): ResolveResult

// Logging
logActionStart(actionId, details?): void
logActionSuccess(actionId, details?): void
logActionError(actionId, error): void
```

**Used By:** Action implementations for validation and utilities

---

### 5. Outcome Application Layer

#### **OutcomeApplicationService.ts**
- **Location:** `src/services/resolution/OutcomeApplicationService.ts`
- **Responsibilities:**
  - Apply ResolutionData from UI
  - Apply numeric modifiers (resources)
  - Automatic +1 fame on critical success
  - Delegate complex actions to ActionEffectsService

#### **ActionEffectsService.ts**
- **Location:** `src/services/ActionEffectsService.ts`
- **Responsibilities:**
  - Complex game state changes (claim hexes, build structures, etc.)
  - Entity creation/modification/destruction
  - Post-resolution mechanics

---

## Action Lifecycle

### Complete Flow (Example: Build Structure Action)

```
1. USER INTERACTION
   User clicks "Build Structure" skill button
   ↓
   ActionsPhase.svelte.handleExecuteSkill(event, action)

2. PRE-ROLL DIALOG CHECK
   CUSTOM_ACTION_HANDLERS['build-structure'].requiresPreDialog === true
   ↓
   showBuildStructureDialog = true
   ↓
   User selects structure & settlement in BuildStructureDialog
   ↓
   Dialog emits 'structureQueued' event with {structureId, settlementId}

3. ROLL EXECUTION (via ActionExecutionHelpers)
   ActionsPhase.executeBuildStructureRoll(buildAction)
   ↓
   executeActionRoll(
     createExecutionContext('build-structure', skill, { structureId, settlementId }),
     { getDC: (level) => controller.getActionDC(level) }
   )
   ↓
   Character selected (getCurrentUser or showCharacterSelectionDialog)
   ↓
   DC calculated from character level
   ↓
   performKingdomActionRoll() executed (PF2e system integration)
   ↓
   Roll result displayed in chat

4. ROLL COMPLETION
   'kingdomRollComplete' event fires with {checkId, outcome, actorName, rollBreakdown}
   ↓
   ActionsPhase.handleRollComplete(event)
   ↓
   ActionsPhase.onActionResolved(actionId, outcome, actorName, ...)

5. INSTANCE CREATION
   CheckInstanceService.createInstance('action', actionId, action, currentTurn, metadata)
   ↓
   Store preliminary ResolutionData (modifiers from action JSON)
   ↓
   Action card expanded, shows outcome with "Apply Result" button

6. USER CONFIRMATION
   User clicks "Apply Result" button
   ↓
   BaseCheckCard emits 'primary' event with {checkId, resolution: ResolutionData}
   ↓
   ActionsPhase.applyActionEffects(event)

7. CUSTOM RESOLUTION (if exists)
   Controller checks for custom implementation
   ↓
   BuildStructureAction.customResolution.execute(resolution, {structureId, settlementId})
   ↓
   Applies 50% cost reduction on critical success
   ↓
   Adds structure to build queue

8. OUTCOME APPLICATION
   OutcomeApplicationService.applyResolvedOutcome(resolutionData, outcome)
   ↓
   Apply numeric modifiers (spend resources)
   ↓
   Automatic +1 fame on critical success

9. COMPLEX ACTIONS (if needed)
   ActionEffectsService.applyComplexActions(complexActions)
   ↓
   Execute gameplay mechanics (claim hexes, create armies, etc.)

10. ACTION TRACKING
    GameCommandsService.trackPlayerAction(userId, userName, actorName, actionId, phase)
    ↓
    Add entry to actionLog (turn-scoped tracking)

11. CLEANUP
    CheckInstanceService.clearInstance(instanceId)
    ↓
    Remove instance from storage
    ↓
    Card resets to initial state (can be performed again)

12. REACTIVE UPDATE
    KingdomActor updated
    ↓
    Foundry syncs to all clients
    ↓
    KingdomStore reactive updates
    ↓
    UI automatically refreshes
```

---

## Data Flow Diagram

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER ACTION                             │
│           (Click skill button in ActionsPhase)              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              PRE-ROLL DIALOG (if needed)                     │
│     showBuildStructureDialog / showAidSelectionDialog       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              ROLL EXECUTION                                  │
│         ActionExecutionHelpers.executeActionRoll()          │
│    • Character selection                                     │
│    • DC calculation                                          │
│    • performKingdomActionRoll()                             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              ROLL COMPLETE EVENT                             │
│    'kingdomRollComplete' → handleRollComplete()             │
│    • Create CheckInstance                                    │
│    • Store preliminary ResolutionData                        │
│    • Expand action card                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              USER CONFIRMATION                               │
│       User reviews outcome, clicks "Apply Result"           │
│       BaseCheckCard emits 'primary' event                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              CUSTOM RESOLUTION (if exists)                   │
│    BuildStructureAction.customResolution.execute()          │
│    • Modify ResolutionData (e.g., 50% cost reduction)       │
│    • Execute custom logic (e.g., add to build queue)        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              OUTCOME APPLICATION                             │
│    OutcomeApplicationService.applyResolvedOutcome()         │
│    • Apply numeric modifiers (resources)                     │
│    • Automatic +1 fame on critical success                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              COMPLEX ACTIONS (if needed)                     │
│    ActionEffectsService.applyComplexActions()               │
│    • Claim hexes, build structures, create armies           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              ACTION TRACKING                                 │
│    GameCommandsService.trackPlayerAction()                  │
│    Add to actionLog for turn-scoped tracking                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              KINGDOM ACTOR UPDATE                            │
│         updateKingdom() → KingdomActor → Foundry            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              REACTIVE UI UPDATE                              │
│    KingdomStore reactive updates → UI refreshes            │
└─────────────────────────────────────────────────────────────┘
```

---

## Custom Action Implementations

### When to Create Custom Implementation

**Decision Tree:**
```
Does the action need post-roll behavior?
├─ YES → Create custom implementation in src/actions/[action]/
│
├─ NO → Does it have complex outcome calculations?
│   ├─ YES → Create custom implementation
│   └─ NO → Standard action (JSON only)
```

### Creating a Custom Action

**1. Create Action File:**
```typescript
// src/actions/my-action/MyAction.ts
import type { ActionImplementation, ResolutionData } from '../types';

export const MyAction: ActionImplementation = {
  id: 'my-action',
  
  // Optional: Custom resolution logic
  customResolution: {
    execute: async (resolution: ResolutionData, customData?: any): Promise<any> => {
      // Your custom logic here
      // Example: Modify costs, add to queues, trigger side effects
      
      return { success: true };
    }
  },
  
  // Optional: Custom outcome calculations
  getModifiers: (outcome: string, kingdom: KingdomData) => {
    // Calculate dynamic modifiers based on kingdom state
    return [];
  }
};
```

**2. Register Action:**
```typescript
// src/controllers/actions/implementations/index.ts
import { MyAction } from '../../../actions/my-action/MyAction';

export const ACTION_IMPLEMENTATIONS = {
  'my-action': MyAction,
  'build-structure': BuildStructureAction,
  // ... other implementations
};
```

**3. Add Custom Dialog (if needed):**
```typescript
// src/actions/my-action/MyActionDialog.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  function handleConfirm() {
    dispatch('confirm', { /* custom data */ });
  }
</script>

<div class="dialog">
  <!-- Your custom UI -->
  <button on:click={handleConfirm}>Confirm</button>
</div>
```

**4. Wire Up in ActionsPhase:**
```typescript
// In ActionsPhase.svelte CUSTOM_ACTION_HANDLERS
const CUSTOM_ACTION_HANDLERS = {
  'my-action': {
    requiresPreDialog: true,
    showDialog: () => { showMyActionDialog = true; },
    storePending: (skill: string) => { pendingMyAction = { skill }; }
  }
};
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
│   │   ├── ActionExecutionHelpers.ts ✨ NEW - Roll orchestration
│   │   └── implementations/
│   │       └── index.ts               # Action implementation registry
│   └── shared/
│       └── AidSystemHelpers.ts        ✨ NEW - Reusable aid system
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
        ├── ActionDialogManager.svelte  ✨ NEW - Dialog management
        └── ActionCategorySection.svelte ✨ NEW - Category rendering
```

### Component Boundaries

| Component | Responsibility | What It Does NOT Do |
|-----------|---------------|---------------------|
| **ActionsPhase.svelte** | Phase orchestration, event routing | Business logic, roll execution details |
| **ActionExecutionHelpers** | Roll setup & execution | Custom action logic, outcome application |
| **ActionHelpers** | Domain validation | Roll execution, outcome application |
| **Custom Actions** | Post-roll behavior | Roll execution, generic validation |
| **OutcomeApplicationService** | Apply ResolutionData | Roll execution, custom action logic |
| **ActionEffectsService** | Complex state changes | Roll execution, resource modifiers |

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

---

## Recent Improvements (October 2025)

### Phase 2-4 Refactoring Summary

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

**Benefits:**
- 🎯 **Clear separation** of roll execution vs custom action logic
- 🔄 **Reusable helpers** across Actions and Events phases
- 📦 **Modular design** makes testing easier
- 🚀 **Better performance** from reduced code size
- 📖 **Improved readability** with focused, single-purpose modules

---

## Future Enhancements

**Potential Improvements:**
1. Action validation service (pre-roll requirement checks)
2. Action queue system (chain multiple actions)
3. Macro support (record/playback action sequences)
4. Action templates (save common configurations)
5. Enhanced analytics (track most-used actions)

---

## Related Documentation

- **Main Architecture:** `docs/ARCHITECTURE.md`
- **Game Commands System:** `docs/systems/game-commands-system.md`
- **Check Instance System:** `docs/systems/check-instance-system.md`
- **Phase Controllers:** `docs/systems/phase-controllers.md`

---

**This architecture provides a clean, maintainable system** that properly separates concerns while maximizing code reuse. The recent refactoring demonstrates how large components can be broken down into focused, reusable pieces without losing functionality.
