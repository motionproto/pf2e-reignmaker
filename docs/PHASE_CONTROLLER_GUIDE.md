# Phase Controller Development Guide

## Overview

Phase controllers handle the business logic for each kingdom turn phase. This guide outlines the standardized patterns and architecture used across all controllers.

## Architecture Principles

### 1. Factory Function Pattern
All controllers use factory functions that return controller objects:

```typescript
export async function createPhaseController() {
  return {
    async startPhase() { /* initialization */ },
    async methodName() { /* business logic */ }
  };
}
```

### 2. Simplified Step Array System
Each phase defines its steps upfront and uses helper functions for tracking:

```typescript
// Define steps for the phase
const PHASE_STEPS = [
  { id: 'step-1', name: 'Human Readable Step Name' },
  { id: 'step-2', name: 'Another Step Name' }
  // Dynamic steps can be added during execution if needed
];

export async function createPhaseController() {
  return {
    async startPhase() {
      // Initialize phase with predefined steps
      await initializePhaseSteps(PHASE_STEPS);
      
      // Phase-specific initialization logic
      reportPhaseComplete('PhaseController');
      return createPhaseResult(true);
    }
  };
}
```

### 3. Step Management with PhaseControllerHelpers

All step management is handled through the shared helper functions:

```typescript
import { 
  initializePhaseSteps,
  completePhaseStep,
  isStepCompleted,
  getRemainingSteps
} from './shared/PhaseControllerHelpers';

// In your controller methods
async someAction() {
  // Check if step already completed
  if (isStepCompleted('step-id')) {
    return createPhaseResult(false, 'Step already completed');
  }

  try {
    // Do the work
    await this.doSomething();
    
    // Mark step complete (auto-advances phase if all done)
    await completePhaseStep('step-id');
    
    return createPhaseResult(true);
  } catch (error) {
    return createPhaseResult(false, error.message);
  }
}
```

## Step Naming Conventions

### Step ID Format
Use clear `verb-noun` pattern for step IDs:
- ✅ `show-status`, `collect-resources`, `event-check`
- ❌ `statusPhase`, `resource_collection`, `checkEvents`

### Step Names
Human-readable descriptions for UI display:
- ✅ `"Show Kingdom Status"`, `"Collect Kingdom Resources"`, `"Perform Event Check"`
- ❌ `"Status"`, `"Resources"`, `"Events"`

## Standard Patterns

### 1. Basic Controller Structure

```typescript
import { 
  reportPhaseStart, 
  reportPhaseComplete, 
  reportPhaseError, 
  createPhaseResult,
  initializePhaseSteps,
  completePhaseStep,
  isStepCompleted
} from './shared/PhaseControllerHelpers';

// Define steps for this phase
const PHASE_STEPS = [
  { id: 'step-1', name: 'First Step' },
  { id: 'step-2', name: 'Second Step' }
];

export async function createPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('PhaseController');
      
      try {
        // Initialize phase with predefined steps
        await initializePhaseSteps(PHASE_STEPS);
        
        // Auto-complete any steps that don't apply
        await this.autoCompleteSkippedSteps();
        
        reportPhaseComplete('PhaseController');
        return createPhaseResult(true);
      } catch (error) {
        reportPhaseError('PhaseController', error instanceof Error ? error : new Error(String(error)));
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    async executeStep1() {
      if (isStepCompleted('step-1')) {
        return createPhaseResult(false, 'Step already completed');
      }

      try {
        // Do the work
        await this.doStep1Work();
        
        // Complete the step
        await completePhaseStep('step-1');
        
        return createPhaseResult(true);
      } catch (error) {
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };
}
```

### 2. Dynamic Step Addition

For phases that may need conditional steps (like Events or Unrest):

```typescript
async performCheck() {
  // Do the check
  const result = await this.checkForCondition();
  
  if (result.triggered) {
    // Add resolve step dynamically
    const actor = getKingdomActor();
    if (actor) {
      await actor.updateKingdom((kingdom) => {
        const hasResolveStep = kingdom.currentPhaseSteps.some(s => s.id === 'resolve-condition');
        if (!hasResolveStep) {
          kingdom.currentPhaseSteps.push({
            id: 'resolve-condition',
            name: 'Resolve Triggered Condition',
            completed: false
          });
        }
      });
    }
  }
  
  await completePhaseStep('check-condition');
  return result;
}
```

### 3. Auto-Skipping Steps

For phases that may not need all steps:

```typescript
async startPhase() {
  await initializePhaseSteps(PHASE_STEPS);
  
  // Auto-complete steps that don't apply
  const kingdom = get(kingdomData);
  
  if (kingdom.armies?.length === 0) {
    await completePhaseStep('support-military');
    console.log('✅ Military support auto-completed (no armies)');
  }
  
  if (kingdom.buildQueue?.length === 0) {
    await completePhaseStep('process-builds');
    console.log('✅ Build queue auto-completed (no projects)');
  }
}
```

## TurnManager Interface

### Overview

**TurnManager** is the central coordinator for all turn and phase progression in the kingdom system. It manages:
- Turn and phase progression
- Phase step tracking (via PhaseHandler)
- Player action management
- Turn-scoped state

### Architecture Layers

```
Controller/Component
    ↓ (uses helpers)
PhaseControllerHelpers (src/controllers/shared/)
    ↓ (creates & delegates to)
TurnManager (src/models/turn-manager/)
    ↓ (delegates step logic to)
PhaseHandler (src/models/turn-manager/phase-handler.ts)
    ↓ (reads/writes)
KingdomActor (single source of truth)
```

**Key Principle:** Controllers use PhaseControllerHelpers, which internally create TurnManager instances and delegate to its methods.

### Core TurnManager Methods

#### Phase Progression

```typescript
// Advance to next phase in sequence
async nextPhase(): Promise<void>
// - Resets phase steps (sets currentPhaseSteps to [])
// - Updates currentPhase to next in PHASE_ORDER
// - If at end of turn, calls endTurn() instead
// - Triggers onPhaseChanged callback

// Set phase directly (for testing/special cases)
async setCurrentPhase(phase: TurnPhase): Promise<void>

// Skip to specific phase
async skipToPhase(phase: TurnPhase): Promise<void>

// Get current phase
async getCurrentPhase(): Promise<string>

// Mark phase as complete (logs only, doesn't auto-advance)
async markPhaseComplete(): Promise<void>
```

#### Step Management (Delegates to PhaseHandler)

```typescript
// Initialize phase with step definitions
async initializePhaseSteps(steps: Array<{ name: string }>): Promise<void>

// Complete a step by index
async completePhaseStepByIndex(stepIndex: number): Promise<{ phaseComplete: boolean }>
// Returns: { success: boolean, phaseComplete: boolean }
// - Marks step at index as completed
// - Advances currentPhaseStepIndex to next incomplete step
// - Returns phaseComplete: true if ALL steps done

// Check if step completed
async isStepCompletedByIndex(stepIndex: number): Promise<boolean>

// Check if current phase complete
async isCurrentPhaseComplete(): Promise<boolean>
```

#### Turn Management

```typescript
// End current turn and start new one
async endTurn(): Promise<void>
// - Increments currentTurn
// - Resets to STATUS phase
// - Resets player actions
// - Clears oncePerTurnActions
// - Decrements modifier durations
// - Triggers callbacks

// Increment turn manually
async incrementTurn(): Promise<void>

// Start new game
async startNewGame(): Promise<void>
```

#### Player Actions

```typescript
// Spend a player action in specific phase
spendPlayerAction(playerId: string, phase: TurnPhase): boolean

// Reset player's action
resetPlayerAction(playerId: string): void

// Get player action state
getPlayerAction(playerId: string): PlayerAction | undefined

// Check if once-per-turn action available
async canPerformAction(actionId: string): Promise<boolean>

// Mark action as used this turn
async markActionUsed(actionId: string): Promise<void>
```

#### Utility Methods

```typescript
// Get unrest penalty for checks
async getUnrestPenalty(): Promise<number>

// Spend fame for reroll
async spendFameForReroll(): Promise<boolean>

// Get turn summary
async getTurnSummary(): Promise<string>

// Reset phase steps
async resetPhaseSteps(): Promise<void>
```

### How Phase Progression Works

#### 1. Phase Initialization
When a phase component mounts:
```typescript
// In phase component onMount
const controller = await createPhaseController();
await controller.startPhase(); // Initializes steps

// In controller.startPhase()
await initializePhaseSteps(PHASE_STEPS);
// This calls TurnManager → PhaseHandler → KingdomActor
```

#### 2. Step Completion
When a controller completes work:
```typescript
// In controller method
const result = await completePhaseStepByIndex(0);
// Returns: { success: true, phaseComplete: false }

// PhaseHandler logic:
// 1. Marks step[0].completed = 1
// 2. Finds next incomplete step
// 3. Updates currentPhaseStepIndex
// 4. Checks if ALL steps done
// 5. Returns { phaseComplete: true/false }
```

#### 3. Phase Advancement
When all steps complete, **the component or UI must call nextPhase()**:
```typescript
// In phase component (watching for completion)
if (result.phaseComplete) {
  const turnManager = getTurnManager();
  await turnManager.nextPhase();
}

// TurnManager.nextPhase() logic:
// 1. Calls resetPhaseSteps() - clears currentPhaseSteps
// 2. Calculates next phase from PHASE_ORDER
// 3. Updates currentPhase in KingdomActor
// 4. If end of turn, calls endTurn() instead
```

**Important:** PhaseHandler does NOT call `nextPhase()` automatically. It only reports completion status. The calling code (controller or component) must handle advancement.

#### 4. Turn End
When the last phase (Upkeep) completes:
```typescript
// TurnManager.nextPhase() detects end of PHASE_ORDER
await this.endTurn();

// endTurn() logic:
// 1. Increments currentTurn
// 2. Sets currentPhase = STATUS
// 3. Resets all player actions
// 4. Clears oncePerTurnActions
// 5. Decrements modifier durations
// 6. Triggers turn/phase changed callbacks
```

### PhaseHandler Reference

PhaseHandler is a utility class used by TurnManager for step logic:

```typescript
// Static methods only - no instances created
class PhaseHandler {
  // Initialize steps
  static async initializePhaseSteps(
    steps: Array<{ name: string; completed?: 0 | 1 }>
  ): Promise<void>
  
  // Complete step by index
  static async completePhaseStepByIndex(
    stepIndex: number
  ): Promise<StepCompletionResult>
  
  // Check step completion
  static async isStepCompletedByIndex(stepIndex: number): Promise<boolean>
  
  // Check phase completion
  static async isCurrentPhaseComplete(): Promise<boolean>
  
  // Get current step info
  static getCurrentStepInfo(): { 
    index: number; 
    name: string; 
    totalSteps: number 
  }
  
  // Get phase status
  static getPhaseStatus(): { 
    completed: number; 
    total: number; 
    isComplete: boolean 
  }
}
```

### Usage in Controllers

Controllers should **not** create TurnManager instances directly. Instead, use PhaseControllerHelpers:

```typescript
import {
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers';

export async function createPhaseController() {
  return {
    async startPhase() {
      // Initialize steps using helper
      await initializePhaseSteps(PHASE_STEPS);
      
      // Do phase work...
      
      // Complete step using helper
      const result = await completePhaseStepByIndex(0);
      
      // Check if phase complete
      if (result.phaseComplete) {
        console.log('✅ All steps done - phase complete');
      }
      
      return createPhaseResult(true);
    }
  };
}
```

### Usage in Components

Components can access TurnManager when needed for progression:

```typescript
import { getTurnManager } from '../stores/KingdomStore';

// In component
onMount(async () => {
  const controller = await createPhaseController();
  const result = await controller.startPhase();
  
  // If phase auto-completes, advance
  if (result.success && result.phaseComplete) {
    const turnManager = getTurnManager();
    if (turnManager) {
      await turnManager.nextPhase();
    }
  }
});
```

## Shared Helper Functions

### Core Helpers
```typescript
// Logging
reportPhaseStart(phaseName: string): void
reportPhaseComplete(phaseName: string): void  
reportPhaseError(phaseName: string, error: Error): void

// Results
createPhaseResult(success: boolean, error?: string): { success: boolean; error?: string }

// Step Management (Creates TurnManager internally)
initializePhaseSteps(steps: Array<{ name: string }>): Promise<void>
completePhaseStepByIndex(stepIndex: number): Promise<{ phaseComplete: boolean }>
isStepCompletedByIndex(stepIndex: number): Promise<boolean>
getRemainingSteps(): Array<{ id: string; name: string; completed: boolean }>
getAllSteps(): Array<{ id: string; name: string; completed: boolean }>
```

### Key Benefits
- **Completion Detection**: `completePhaseStepByIndex()` returns `phaseComplete` status
- **Duplicate Prevention**: `isStepCompletedByIndex()` prevents double-execution
- **UI Integration**: `getRemainingSteps()` and `getAllSteps()` provide data for progress display
- **Consistent Logging**: Standard emoji-based console output
- **Abstraction**: Controllers don't need to know about TurnManager internals

## Current Phase Steps Reference

### Status Phase
```typescript
const STATUS_PHASE_STEPS = [
  { id: 'show-status', name: 'Show Kingdom Status' }
];
```
- Auto-completes immediately
- Processes resource decay from previous turn
- Initializes Fame to 1

### Resources Phase  
```typescript
const RESOURCES_PHASE_STEPS = [
  { id: 'collect-resources', name: 'Collect Kingdom Resources' }
];
```
- Single action collects territory + settlement resources
- One-time completion by any player

### Events Phase
```typescript
const EVENTS_PHASE_STEPS = [
  { id: 'event-check', name: 'Perform Event Check' }
  // 'resolve-event' added dynamically if event triggered
];
```
- Changed from "stability roll" to "event check"
- Dynamic resolution step

### Unrest Phase
```typescript
const UNREST_PHASE_STEPS = [
  { id: 'show-unrest', name: 'Calculate and Show Unrest' },
  { id: 'incident-check', name: 'Check for Incidents' }
  // 'resolve-incident' added dynamically if incident occurs
];
```
- Auto-calculates unrest display
- Dynamic incident resolution

### Action Phase
```typescript
const ACTION_PHASE_STEPS = [
  { id: 'execute-actions', name: 'Execute Player Actions' },
  { id: 'resolve-results', name: 'Resolve Action Results' }
];
```
- Manual completion when players finish
- Separate execution and resolution

### Upkeep Phase
```typescript
const UPKEEP_PHASE_STEPS = [
  { id: 'feed-settlements', name: 'Feed Settlements' },
  { id: 'support-military', name: 'Support Military' },
  { id: 'process-builds', name: 'Process Build Queue' }
];
```
- Auto-skips military/builds if none exist
- Resource decay moved to Status phase

## Error Handling

Always use consistent error handling:

```typescript
try {
  // Phase logic here
  await completePhaseStep('step-id');
  return createPhaseResult(true);
} catch (error) {
  reportPhaseError('PhaseController', error instanceof Error ? error : new Error(String(error)));
  return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
}
```

## Testing Integration

Controllers should provide display data for UI components:

```typescript
getDisplayData() {
  return {
    currentState: /* current phase state */,
    stepsCompleted: {
      step1: isStepCompleted('step-1'),
      step2: isStepCompleted('step-2')
    },
    /* other UI-relevant data */
  };
}
```

## Migration from Old System

The new system maintains backward compatibility:
- Old `markPhaseStepCompleted()` calls still work
- New `completePhaseStep()` is preferred
- UI components updated to use new step arrays
- KingdomStore provides compatibility layer

## Working with Modifiers

### ModifierService Integration

Controllers that create modifiers (EventPhaseController, UnrestPhaseController) use the simplified ModifierService:

```typescript
import { createModifierService } from '../services/ModifierService';
import { updateKingdom } from '../stores/KingdomStore';

export async function createEventPhaseController() {
  const modifierService = await createModifierService();
  
  return {
    async handleFailedEvent(event: EventData, currentTurn: number) {
      // Create modifier from unresolved event
      const kingdomEvent = {
        ...event,
        tier: event.ifUnresolved?.tier || 1
      } as any;
      
      const modifier = modifierService.createFromUnresolvedEvent(kingdomEvent, currentTurn);
      
      // Add to KingdomActor directly
      await updateKingdom(kingdom => {
        if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
        kingdom.activeModifiers.push(modifier);
      });
      
      console.log(`📋 Created modifier: ${modifier.name}`);
    }
  };
}
```

### StatusPhaseController Pattern

The Status phase applies ongoing modifiers each turn:

```typescript
async startPhase() {
  await initializePhaseSteps(STATUS_PHASE_STEPS);
  
  // Apply ongoing modifiers
  const modifierService = await createModifierService();
  await modifierService.applyOngoingModifiers();
  
  // Clean up expired modifiers
  await modifierService.cleanupExpiredModifiers();
  
  await completePhaseStepByIndex(0);
  return createPhaseResult(true);
}
```

### Key ModifierService Methods

```typescript
// Create modifier from event/incident
createFromUnresolvedEvent(event: KingdomEvent, currentTurn: number): ActiveModifier

// Apply all ongoing modifiers (called in Status phase)
applyOngoingModifiers(): Promise<void>

// Remove expired turn-based modifiers
cleanupExpiredModifiers(): Promise<void>

// Attempt to resolve a modifier
attemptResolution(modifierId: string, rollResult: number, levelBasedDC: number): Promise<ResolutionResult>

// Get list of active modifiers
getActiveModifiers(): ActiveModifier[]
```

## Event & Incident Handling

### EventPhaseController Pattern

Events use a normalized structure with standardized outcomes:

```typescript
async handleEventResolution(
  event: EventData,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  currentTurn: number
) {
  // Check if event becomes a modifier on failure
  if (event.ifUnresolved && (outcome === 'failure' || outcome === 'criticalFailure')) {
    // Cast EventData to include tier
    const kingdomEvent = { ...event, tier: 1 } as any;
    
    const modifier = modifierService.createFromUnresolvedEvent(kingdomEvent, currentTurn);
    
    await updateKingdom(kingdom => {
      if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
      kingdom.activeModifiers.push(modifier);
    });
    
    console.log(`📋 Event failed - created modifier: ${modifier.name}`);
  }
  
  // Clear current event
  await updateKingdom(kingdom => {
    kingdom.currentEventId = null;
  });
}
```

### UnrestPhaseController Pattern

Incidents follow the same pattern as events:

```typescript
async handleIncidentResolution(
  incident: IncidentData,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  currentTurn: number
) {
  // Similar to event handling
  if (incident.ifUnresolved && (outcome === 'failure' || outcome === 'criticalFailure')) {
    const kingdomIncident = { ...incident, tier: 1 } as any;
    const modifier = modifierService.createFromUnresolvedEvent(kingdomIncident, currentTurn);
    
    await updateKingdom(kingdom => {
      if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
      kingdom.activeModifiers.push(modifier);
    });
  }
}
```

### Key Differences from Old System

**Old System (Removed):**
- ❌ Complex `KingdomModifier` with priority, escalation, effects
- ❌ `ModifierUtils` class with complex application logic
- ❌ Event-level duration and fixed DCs
- ❌ Nested stages structure

**New System (Current):**
- ✅ Simple `ActiveModifier` with EventModifier array
- ✅ Direct KingdomActor manipulation via `updateKingdom()`
- ✅ Duration only in modifiers
- ✅ Level-based DCs only
- ✅ Flat skills array

## Key Improvements

1. **Eliminated Complexity**: No more enum naming mismatches
2. **Clear Definitions**: Steps defined where they're used
3. **Auto-Progression**: Phases advance automatically
4. **Better UI**: Actual step progress displayed
5. **Consistent API**: All controllers use same helpers
6. **Error Prevention**: Can't complete steps twice
7. **Simplified Modifiers**: Direct storage, no complex priority logic
8. **Standardized Events**: All events/incidents use same structure

---

**Remember**: All business logic goes in controllers, UI components only handle presentation. Use the helpers for all step management - they handle the complexity for you! When creating modifiers, always use ModifierService and store them directly in KingdomActor's `activeModifiers` array.
