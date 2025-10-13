# Phase Controllers

**Purpose:** Implement phase-specific business logic following standardized patterns

---

## Overview

Phase controllers execute the business logic for each of the six kingdom turn phases. They follow a factory function pattern with consistent initialization, execution, and completion flows.

**Key Principle:** Controllers contain business logic only - no UI concerns, no direct data access.

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

**Pattern:** Check roll, optional resolution

**Key Operations:**
- `performEventCheck()` - Roll d20 vs DC
- `resolveEvent()` - Handle skill check outcome
- Integration with CheckInstanceService

### UnrestPhaseController

**Purpose:** Calculate unrest, handle incidents

**Pattern:** Auto-calculate, check for incidents

**Key Operations:**
- `calculateUnrest()` - Display current unrest level
- `checkForIncidents()` - Percentage-based incident check
- `resolveIncident()` - Handle incident resolution

### ActionPhaseController

**Purpose:** Execute player kingdom actions

**Pattern:** Multiple actions, player-driven

**Key Operations:**
- Action validation and execution
- Integration with player action system

### UpkeepPhaseController

**Purpose:** End-of-turn maintenance

**Pattern:** Auto-complete empty operations

**Key Operations:**
- `feedSettlements()` - Food consumption
- `supportMilitary()` - Army maintenance (if armies exist)
- `processBuilds()` - Build queue processing (if builds exist)

---

## Integration Patterns

### With CheckInstanceService

Controllers create and manage check instances:

```typescript
// Create instance
const instanceId = await checkInstanceService.createInstance(
  'event',
  eventId,
  eventData,
  currentTurn
);

// Store outcome
await checkInstanceService.storeOutcome(
  instanceId,
  outcome,
  resolutionData,
  actorName,
  skillName,
  effect
);

// Mark applied
await checkInstanceService.markApplied(instanceId);
```

**Pattern:** All check-based controllers follow the same flow.

### With GameEffectsService

Controllers apply effects through unified service:

```typescript
await gameEffectsService.applyNumericModifiers(
  resolutionData.numericModifiers
);
```

**Pattern:** Controllers receive final numeric values from UI, apply via service.

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
- ❌ Bypass CheckInstanceService for check data
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
- ✅ Clear integration points
- ✅ Separation of concerns (business logic only)
- ✅ Type-safe step references

This architecture ensures maintainable, testable phase implementations that follow consistent patterns across all six kingdom phases.

---

**See Also:**
- `docs/systems/turn-and-phase-system.md` - Turn/phase progression architecture
- `docs/systems/check-instance-system.md` - Check lifecycle integration
- `docs/ARCHITECTURE.md` - Overall system architecture
