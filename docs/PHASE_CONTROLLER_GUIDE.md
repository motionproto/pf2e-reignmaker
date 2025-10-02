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

## Shared Helper Functions

### Core Helpers
```typescript
// Logging
reportPhaseStart(phaseName: string): void
reportPhaseComplete(phaseName: string): void  
reportPhaseError(phaseName: string, error: Error): void

// Results
createPhaseResult(success: boolean, error?: string): { success: boolean; error?: string }

// Step Management (Uses TurnManager)
initializePhaseSteps(steps: Array<{ name: string }>): Promise<void>
completePhaseStepByIndex(stepIndex: number): Promise<{ phaseComplete: boolean }>
isStepCompletedByIndex(stepIndex: number): Promise<boolean>
getRemainingSteps(): Array<{ id: string; name: string; completed: boolean }>
```

### Key Benefits
- **Auto-Progression**: `completePhaseStep()` automatically advances phase when all steps done
- **Duplicate Prevention**: `isStepCompleted()` prevents double-execution
- **UI Integration**: `getRemainingSteps()` provides data for progress display
- **Consistent Logging**: Standard emoji-based console output

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

## Key Improvements

1. **Eliminated Complexity**: No more enum naming mismatches
2. **Clear Definitions**: Steps defined where they're used
3. **Auto-Progression**: Phases advance automatically
4. **Better UI**: Actual step progress displayed
5. **Consistent API**: All controllers use same helpers
6. **Error Prevention**: Can't complete steps twice

---

**Remember**: All business logic goes in controllers, UI components only handle presentation. Use the helpers for all step management - they handle the complexity for you!
