# Phase Controllers

**Purpose:** Implement phase-specific business logic following standardized patterns

---

## Overview

Phase controllers execute the business logic for each of the six kingdom turn phases. They follow a factory function pattern with consistent initialization, execution, and completion flows.

**Key Principle:** Controllers contain business logic only - no UI concerns, no direct data access.

**Architecture Note:** For check-based phases (Events, Unrest, Actions), controllers trigger **PipelineCoordinator** for execution while handling phase-specific triggering and persistence logic.

**See:** `docs/systems/pipeline-coordinator.md` for complete check execution architecture.

---

## Architecture Pattern

### Factory Function Structure

All controllers use factory functions that return controller objects:

```typescript
export async function createPhaseController() {
  return {
    async startPhase() {
      // Initialization and execution
    },
    async methodName() {
      // Phase-specific operations
    }
  };
}
```

**Benefits:**
- Consistent interface across all phases
- Easy to test and mock
- Clear lifecycle boundaries

### Phase Guard Pattern

Every controller MUST include a phase guard at the start of `startPhase()`:

```typescript
async startPhase() {
  reportPhaseStart('PhaseController');
  
  try {
    // REQUIRED: Phase guard prevents inappropriate initialization
    const guardResult = checkPhaseGuard(TurnPhase.MY_PHASE, 'PhaseController');
    if (guardResult) return guardResult;
    
    // Safe to initialize - we're in the correct phase
    await initializePhaseSteps(PHASE_STEPS);
    
    // Execute phase logic
    // ...
    
    reportPhaseComplete('PhaseController');
    return createPhaseResult(true);
  } catch (error) {
    reportPhaseError('PhaseController', error);
    return createPhaseResult(false, error.message);
  }
}
```

**Purpose:** Prevents:
- Cross-phase contamination (wrong controller running)
- Component state loss (mid-phase re-initialization)
- Stale step persistence (incorrect steps from other phases)

---

## Step Management

### Predefined Steps

Each phase defines its steps upfront:

```typescript
const PHASE_STEPS = [
  { id: 'step-1', name: 'Human Readable Step Name' },
  { id: 'step-2', name: 'Another Step Name' }
];
```

**Pattern:** Clear, descriptive names using `verb-noun` format for IDs.

### Using Helper Functions

Controllers use shared helper functions for all step operations:

```typescript
import { 
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers';

// Initialize phase
await initializePhaseSteps(PHASE_STEPS);

// Complete step
await completePhaseStepByIndex(0);

// Check completion
if (await isStepCompletedByIndex(0)) {
  // Step already done
}
```

**Key Benefit:** Helpers abstract the complexity of TurnManager/PhaseHandler interaction.

### Dynamic Steps

Some phases add steps conditionally:

```typescript
async performCheck() {
  const result = await this.checkForCondition();
  
  if (result.triggered) {
    // Add resolve step dynamically
    await updateKingdom(kingdom => {
      const hasResolveStep = kingdom.currentPhaseSteps.some(
        s => s.id === 'resolve-condition'
      );
      
      if (!hasResolveStep) {
        kingdom.currentPhaseSteps.push({
          id: 'resolve-condition',
          name: 'Resolve Triggered Condition',
          completed: 0
        });
      }
    });
  }
  
  await completePhaseStepByIndex(0);
}
```

**Use Case:** Events and Unrest phases add resolution steps when checks trigger.

---

## Six Phase Controllers

### StatusPhaseController

**Purpose:** Apply ongoing modifiers, initialize turnState

**Pattern:** Auto-completes immediately after setup

**Key Operations:**
- `ensureTurnState()` - Create/reset turnState at turn boundaries
- `applyOngoingModifiers()` - Process active modifiers
- `cleanupExpiredModifiers()` - Remove expired modifiers

### ResourcePhaseController

**Purpose:** Collect resources from worksites and territory

**Pattern:** Single action, player-triggered

**Key Operations:**
- `collectResources()` - Calculate and grant resources
- Resource calculation based on territory + worksites

### EventPhaseController

**Purpose:** Handle kingdom events (immediate and ongoing)

**Pattern:** Trigger PipelineCoordinator for event execution

**Key Operations:**
- `selectEvent()` - Choose random event or continue ongoing event
- `performEventCheck()` - Trigger PipelineCoordinator with event ID
- `ignoreEvent()` - Bypass pipeline for ignored events (separate flow)
- Event persistence management (turnState.eventsPhase)

**Integration:**
```typescript
async performEventCheck(eventId: string) {
  const coordinator = new PipelineCoordinator();
  const context = await coordinator.executePipeline(eventId, {
    checkType: 'event',
    userId: game.userId
  });
  
  return { success: context.executionResult?.success };
}
```

**See:** `docs/systems/check-type-differences.md` for event-specific behavior.

### UnrestPhaseController

**Purpose:** Calculate unrest, handle incidents

**Pattern:** Trigger d100 check, execute via PipelineCoordinator if triggered

**Key Operations:**
- `calculateUnrest()` - Display current unrest level
- `checkForIncidents()` - d100 roll vs unrest, trigger pipeline if incident occurs
- Incident persistence management (turnState.unrestPhase)

**Integration:**
```typescript
async checkForIncidents() {
  const unrestLevel = kingdom.unrest;
  const roll = d100();
  
  if (roll <= unrestLevel) {
    const severity = determineSeverity(unrestLevel);
    const incident = selectIncident(severity);
    
    const coordinator = new PipelineCoordinator();
    await coordinator.executePipeline(incident.id, {
      checkType: 'incident',
      userId: game.userId
    });
  }
}
```

**See:** `docs/systems/check-type-differences.md` for incident-specific behavior.

### ActionPhaseController

**Purpose:** Execute player kingdom actions

**Pattern:** Trigger PipelineCoordinator for each action

**Key Operations:**
- Action selection and validation
- Trigger PipelineCoordinator with action ID
- Handle pre-roll interactions (Step 2)
- Handle post-apply interactions (Step 7)
- Action logging (turnState.actionsPhase)

**Integration:**
```typescript
async performAction(actionId: string) {
  const coordinator = new PipelineCoordinator();
  const context = await coordinator.executePipeline(actionId, {
    checkType: 'action',
    userId: game.userId
  });
  
  // Log action
  await trackPlayerAction(actionId, context.rollData?.outcome);
  
  return { success: context.executionResult?.success };
}
```

**See:** `docs/systems/check-type-differences.md` for action-specific behavior (pre/post interactions, custom components).

### UpkeepPhaseController

**Purpose:** End-of-turn maintenance

**Pattern:** Auto-complete empty operations

**Key Operations:**
- `feedSettlements()` - Food consumption
- `supportMilitary()` - Army maintenance (if armies exist)
- `processBuilds()` - Build queue processing (if builds exist)

---

## Integration Patterns

### With PipelineCoordinator

Controllers trigger pipeline for all check execution:

```typescript
// Phase controller triggers pipeline
const coordinator = new PipelineCoordinator();
const context = await coordinator.executePipeline(checkId, {
  checkType: this.checkType,  // 'event' | 'incident' | 'action'
  userId: game.userId
});

// Pipeline handles:
// - Requirements check (Step 1)
// - Pre-roll interactions (Step 2)
// - Roll execution (Step 3)
// - Outcome display (Step 4)
// - User interactions (Step 5)
// - Apply button wait (Step 6)
// - Post-apply interactions (Step 7)
// - Effect execution (Step 8)
// - Cleanup (Step 9)

return { success: context.executionResult?.success };
```

**Pattern:** Controllers focus on phase-specific logic (triggering, persistence), PipelineCoordinator handles execution.

**See:** `docs/systems/pipeline-coordinator.md` for complete 9-step flow.

### With OutcomePreviewService

PipelineCoordinator manages OutcomePreview internally:

```typescript
// Controllers no longer call OutcomePreviewService directly
// PipelineCoordinator handles:
// - Step 4: createInstance()
// - Step 4: storeOutcome()
// - Step 8: markApplied()
```

**Pattern:** Controllers delegate to PipelineCoordinator, which uses OutcomePreviewService.

### With GameCommandsService & GameCommandsResolver

PipelineCoordinator applies effects at Step 8:

```typescript
// PipelineCoordinator Step 8: Execute Action
await gameCommandsService.applyNumericModifiers(resolutionData.numericModifiers);
await gameCommandsResolver.executeGameCommands(resolutionData.gameCommands);
```

**Pattern:** Controllers don't call these directly - PipelineCoordinator handles effect application.

### With TurnState

Controllers read/write phase-specific state:

```typescript
// Read
const eventRolled = kingdom.turnState?.eventsPhase?.eventRolled;

// Write
await updateKingdom(k => {
  k.turnState.eventsPhase.eventTriggered = true;
  k.turnState.eventsPhase.eventId = eventId;
});
```

---

## Shared Helpers

### PhaseControllerHelpers

**File:** `src/controllers/shared/PhaseControllerHelpers.ts`

**Key Functions:**

```typescript
// Logging
reportPhaseStart(controllerName: string): void
reportPhaseComplete(controllerName: string): void
reportPhaseError(controllerName: string, error: Error): void

// Results
createPhaseResult(success: boolean, error?: string): PhaseResult

// Phase Guard (REQUIRED)
checkPhaseGuard(phaseName: TurnPhase, controllerName: string): PhaseResult | null

// Step Management
initializePhaseSteps(steps: Array<{ name: string }>): Promise<void>
completePhaseStepByIndex(stepIndex: number): Promise<StepCompletionResult>
isStepCompletedByIndex(stepIndex: number): Promise<boolean>
```

**Pattern:** All controllers import and use these helpers exclusively.

### Type-Safe Step Constants

**File:** `src/controllers/shared/PhaseStepConstants.ts`

**Purpose:** Prevent runtime errors from magic numbers

```typescript
export enum EventsPhaseSteps {
  EVENT_ROLL = 0,
  RESOLVE_EVENT = 1,
  APPLY_MODIFIERS = 2
}

// Usage
await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
```

---

## Best Practices

### DO

- ✅ Include phase guard at start of `startPhase()`
- ✅ Use PhaseControllerHelpers for all step operations
- ✅ Return `{ success: boolean, error?: string }` from operations
- ✅ Use clear console logging with emoji indicators
- ✅ Delegate to services for complex operations
- ✅ Keep business logic in controllers, not components

### DON'T

- ❌ Access TurnManager or PhaseHandler directly
- ❌ Perform UI operations in controllers
- ❌ Bypass OutcomePreviewService for check data
- ❌ Use magic numbers for step indices
- ❌ Trigger other controllers (phases are self-executing)
- ❌ Mix data access with business logic

---

## Component Integration

### Self-Executing Pattern

Components mount and trigger controllers:

```typescript
onMount(async () => {
  if ($kingdomData.currentPhase === OUR_PHASE) {
    const controller = await createPhaseController();
    await controller.startPhase();
  }
});
```

**Key Point:** Components call `startPhase()`, not TurnManager.

### Phase Completion Detection

Components detect completion and advance:

```typescript
const result = await controller.executeOperation();

if (result.success && result.phaseComplete) {
  const turnManager = getTurnManager();
  await turnManager.nextPhase();
}
```

---

## Summary

Phase Controllers provide:

- ✅ Standardized factory function pattern
- ✅ Required phase guard protection
- ✅ Consistent step management
- ✅ Clear integration points (trigger PipelineCoordinator for checks)
- ✅ Separation of concerns (business logic only)
- ✅ Type-safe step references

**Architecture:**
- **Check-based phases** (Events, Unrest, Actions) trigger PipelineCoordinator for execution
- **Non-check phases** (Status, Resource, Upkeep) execute directly
- Controllers handle phase-specific logic (triggering, persistence, state management)
- PipelineCoordinator handles unified check execution (9-step flow)

This architecture ensures maintainable, testable phase implementations that follow consistent patterns across all six kingdom phases.

---

**Related Documents:**
- `docs/systems/pipeline-coordinator.md` - Check execution architecture (9-step flow)
- `docs/systems/check-type-differences.md` - Events vs Incidents vs Actions
- `docs/systems/check-instance-system.md` - OutcomePreview system
- `docs/systems/turn-and-phase-system.md` - Turn/phase progression architecture
- `docs/ARCHITECTURE.md` - Overall system architecture
