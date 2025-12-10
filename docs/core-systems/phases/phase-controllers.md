# Phase Controllers

**Purpose:** Implement phase-specific business logic following standardized patterns

**Last Updated:** 2025-12-10

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

**Pattern:** Custom event execution with OutcomePreviewService

**Key Operations:**

```typescript
// Roll for event (d20 vs DC)
async performEventCheck(currentDC: number): Promise<{
  triggered: boolean;
  event: CheckPipeline | null;
  roll: number;
  newDC: number;
}> {
  const roll = Math.floor(Math.random() * 20) + 1;
  const triggered = roll >= currentDC;
  
  if (triggered) {
    // Select random event
    const allEvents = pipelineRegistry.getPipelinesByType('event');
    const event = allEvents[Math.floor(Math.random() * allEvents.length)];
    
    // Create OutcomePreview instance
    const instanceId = await outcomePreviewService.createInstance(
      'event',
      event.id,
      event,
      kingdom.currentTurn
    );
    
    // Update turnState for display
    await updateKingdom(k => {
      k.eventDC = 15; // Reset DC
      k.turnState.eventsPhase.eventRolled = true;
      k.turnState.eventsPhase.eventTriggered = true;
      k.turnState.eventsPhase.eventId = event.id;
      k.turnState.eventsPhase.eventInstanceId = instanceId;
    });
    
    newDC = 15;
  } else {
    // Reduce DC by 5 (minimum 6)
    newDC = Math.max(6, currentDC - 5);
    await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
    await completePhaseStepByIndex(EventsPhaseSteps.APPLY_MODIFIERS);
  }
  
  return { triggered, event, roll, newDC };
}

// Resolve event outcome
async resolveEvent(
  eventId: string,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  resolutionData: ResolutionData,
  isIgnored: boolean = false,
  actorName?: string,
  skillName?: string,
  playerId?: string
) {
  // Apply numeric modifiers (pre-rolled dice)
  await applyResolvedOutcome(resolutionData, outcome);
  
  // Execute pipeline for game commands (if defined)
  const pipeline = pipelineRegistry.getPipeline(eventId);
  if (pipeline?.execute) {
    await pipeline.execute({
      outcome,
      kingdom,
      resolutionData,
      check: pipeline,
      metadata: {},
      modifiersAlreadyApplied: true
    });
  }
  
  // Update instance with appliedOutcome
  await updateKingdom(kingdom => {
    const instance = kingdom.pendingOutcomes?.find(i => i.previewId === instanceId);
    if (instance) {
      instance.appliedOutcome = {
        outcome,
        actorName,
        skillName,
        effect: outcomeData?.description || '',
        modifiers: resolvedModifiers,
        manualEffects: outcomeData?.manualEffects || [],
        gameCommands: outcomeData?.gameCommands || [],
        effectsApplied: true,
        shortfallResources: []
      };
    }
  });
  
  // Complete steps
  await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
  await completePhaseStepByIndex(EventsPhaseSteps.APPLY_MODIFIERS);
  
  return { success: true };
}

// Ignore event (delegates to IgnoreEventService)
async ignoreEvent(eventId: string, metadata?: Record<string, any>) {
  const { ignoreEventService } = await import('../services/IgnoreEventService');
  return ignoreEventService.ignoreEvent(eventId, {
    isDebugTest: metadata?.isDebugTest || false
  });
}
```

**Key Details:**
- Does NOT use PipelineCoordinator directly
- Manages OutcomePreviewService for instance creation
- Custom resolution logic with turnState integration
- Delegates ignore flow to IgnoreEventService

### UnrestPhaseController

**Purpose:** Calculate unrest, check for incidents

**Pattern:** Roll d100 for incident, create instance if triggered

**Key Operations:**

```typescript
// Roll for incident based on unrest level
async rollForIncident(): Promise<{
  incidentTriggered: boolean;
  roll: number;
  chance: number;
  incidentId: string | null;
  instanceId: string | null;
}> {
  const unrest = kingdom.unrest || 0;
  const tier = getUnrestTier(unrest);
  const incidentChance = getIncidentChance(unrest);
  
  // Roll for incident
  const roll = Math.random();
  const incidentTriggered = roll < incidentChance;
  
  if (incidentTriggered) {
    // Load incident from pipeline registry
    const severity = tier === 1 ? 'minor' : tier === 2 ? 'moderate' : 'major';
    const allIncidents = pipelineRegistry.getPipelinesByType('incident');
    const incidents = allIncidents.filter(p => p.severity === severity);
    const incident = incidents[Math.floor(Math.random() * incidents.length)];
    
    // Create OutcomePreview instance
    const instanceId = await outcomePreviewService.createInstance(
      'incident',
      incident.id,
      incident,
      kingdom.currentTurn
    );
    
    // Update turnState for display
    await updateKingdom(k => {
      k.turnState.unrestPhase.incidentRolled = true;
      k.turnState.unrestPhase.incidentRoll = Math.round(roll * 100);
      k.turnState.unrestPhase.incidentTriggered = true;
    });
    
    return { incidentTriggered: true, roll, chance, incidentId: incident.id, instanceId };
  }
  
  // No incident - complete steps
  await completePhaseStepByIndex(UnrestPhaseSteps.RESOLVE_INCIDENT);
  return { incidentTriggered: false, roll, chance, incidentId: null, instanceId: null };
}
```

**Key Details:**
- Rolls d100 vs unrest level for incident check
- Creates OutcomePreview instance if incident triggers
- Incident resolution handled by UI components (not controller)
- Uses OutcomePreviewService for persistence

### ActionPhaseController

**Purpose:** Execute player kingdom actions

**Pattern:** Delegates to PipelineIntegrationAdapter

**Key Operations:**

```typescript
// Resolve action with pre-computed resolution data
async resolveAction(
  actionId: string,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  resolutionData: ResolutionData,
  actorName?: string,
  skillName?: string,
  playerId?: string,
  instanceId?: string
) {
  // Check if action uses pipeline system
  if (shouldUsePipeline(actionId) && PipelineIntegrationAdapter.hasPipeline(actionId)) {
    // Convert legacy ResolutionData to pipeline format
    const pipelineResolutionData: PipelineResolutionData = {
      diceRolls: resolutionData.diceRolls || {},
      choices: resolutionData.choices || {},
      allocations: resolutionData.allocations || {},
      compoundData: resolutionData.compoundData || {},
      numericModifiers: resolutionData.numericModifiers || [],
      manualEffects: resolutionData.manualEffects || [],
      customComponentData: resolutionData.customComponentData || null
    };
    
    // Get stored metadata from instance
    let metadata: CheckMetadata = {};
    if (instanceId) {
      const storedInstance = kingdom.pendingOutcomes?.find(i => i.previewId === instanceId);
      if (storedInstance?.metadata) {
        metadata = storedInstance.metadata;
      }
    }
    
    // Execute via PipelineIntegrationAdapter
    return await PipelineIntegrationAdapter.executePipelineAction(
      actionId,
      outcome,
      kingdom,
      metadata,
      pipelineResolutionData
    );
  }
  
  // Action not migrated - show error
  logger.error(`Action ${actionId} not found in pipeline system`);
  return { success: false, error: 'Action not migrated' };
}
```

**Key Details:**
- Uses PipelineIntegrationAdapter for action execution
- Adapter bridges legacy system to new pipeline architecture
- Pre-roll interactions (Step 2) handled by UI before rolling
- Post-apply interactions (Step 7) handled by UI after apply button
- Action logging via GameCommandsService

### UpkeepPhaseController

**Purpose:** End-of-turn maintenance

**Pattern:** Auto-complete empty operations

**Key Operations:**
- `feedSettlements()` - Food consumption
- `supportMilitary()` - Army maintenance (if armies exist)
- `processBuilds()` - Build queue processing (if builds exist)

---

## Integration Patterns

### With OutcomePreviewService

Controllers create and manage check instances:

```typescript
// Create instance (Event/Unrest controllers)
const instanceId = await outcomePreviewService.createInstance(
  'event', // or 'incident'
  checkId,
  checkPipeline,
  currentTurn
);

// Update instance with outcome
await updateKingdom(kingdom => {
  const instance = kingdom.pendingOutcomes?.find(i => i.previewId === instanceId);
  if (instance) {
    instance.appliedOutcome = {
      outcome,
      actorName,
      skillName,
      effect: description,
      modifiers: resolvedModifiers,
      effectsApplied: true
    };
  }
});
```

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

### With Services

Controllers delegate complex operations:

```typescript
// GameCommandsService for resource changes
const gameCommandsService = await createGameCommandsService();
await gameCommandsService.applyNumericModifiers(modifiers, outcome);

// IgnoreEventService for event ignoring
const { ignoreEventService } = await import('../services/IgnoreEventService');
return ignoreEventService.ignoreEvent(eventId, options);

// ActionAvailabilityService for requirement checks
return actionAvailabilityService.checkRequirements(action, kingdom);
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
- ✅ Clear service delegation (OutcomePreviewService, IgnoreEventService, etc.)
- ✅ Separation of concerns (business logic only)
- ✅ Type-safe step references

**Architecture:**
- **Event/Unrest phases** create OutcomePreview instances directly
- **Action phase** delegates to PipelineIntegrationAdapter
- **Status/Resource/Upkeep phases** execute directly without checks
- Controllers handle phase-specific logic (triggering, persistence, state management)
- UI components handle user interactions and display

This architecture ensures maintainable, testable phase implementations that follow consistent patterns across all six kingdom phases.

---

**Related Documents:**
- [turn-and-phase-system.md](./turn-and-phase-system.md) - Turn/phase progression architecture
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) - Overall system architecture
- [../pipeline/pipeline-coordinator.md](../pipeline/pipeline-coordinator.md) - Pipeline execution system
- [../../guides/debugging-guide.md](../../guides/debugging-guide.md) - Debugging guide

**Status:** ✅ Accurate as of 2025-12-10  
**Last Updated:** 2025-12-10
