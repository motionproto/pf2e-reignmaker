# Phase Implementation Guide

**Last Updated:** October 1, 2025

## Overview

This guide covers how to implement kingdom turn phases in the PF2e Reignmaker module using our simplified architecture pattern.

## Phase Architecture

Phases in PF2e Reignmaker follow a simple pattern:
1. **Do the work directly** - implement phase logic without complex abstractions
2. **Mark steps complete** - track progress through phase steps  
3. **Notify TurnManager** - tell the system when phase is done

## Phase Implementation Pattern

### Basic Phase Structure

```typescript
// Simple, direct phase implementation
async function runPhaseAutomation() {
  console.log('🟡 [Phase] Starting...');
  
  // Step 1: Do the work directly
  await doPhaseWork();
  await markPhaseStepCompleted('work-done');
  
  // Step 2: Additional work if needed
  await doAdditionalWork();
  await markPhaseStepCompleted('additional-complete');
  
  // Step 3: Tell TurnManager we're done
  await tellTurnManagerDone();
  
  console.log('✅ [Phase] Complete');
}

async function tellTurnManagerDone() {
  const { turnManager } = await import('../stores/turn');
  const manager = get(turnManager);
  await manager.markCurrentPhaseComplete();
}
```

### Controller Structure

```typescript
// src/controllers/ExamplePhaseController.ts
import { markPhaseStepCompleted, setResource, modifyResource } from '../stores/kingdomActor';
import { get } from 'svelte/store';

export async function createExamplePhaseController() {
  return {
    async runAutomation() {
      console.log('🟡 [ExamplePhaseController] Starting automation...');
      
      try {
        // Step 1: Phase-specific business logic
        await this.performPhaseLogic();
        await markPhaseStepCompleted('phase-logic-complete');
        console.log('✅ [ExamplePhaseController] Phase logic complete');
        
        // Step 2: Tell TurnManager we're done
        await this.notifyPhaseComplete();
        console.log('✅ [ExamplePhaseController] Automation complete');
        
        return { success: true };
      } catch (error) {
        console.error('❌ [ExamplePhaseController] Automation failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    
    async performPhaseLogic() {
      // Business logic implementation specific to this phase
      // Use store functions for data operations
      await setResource('someResource', 100);
      await modifyResource('anotherResource', 50);
    },
    
    async notifyPhaseComplete() {
      const { turnManager } = await import('../stores/turn');
      const manager = get(turnManager);
      
      if (manager) {
        await manager.markCurrentPhaseComplete();
        console.log('🟡 [ExamplePhaseController] Notified TurnManager phase complete');
      } else {
        throw new Error('No TurnManager available');
      }
    }
  };
}
```

## Data Operations in Phases

### Reading Kingdom Data

```typescript
import { kingdomData, resources, fame } from '../stores/kingdomActor';
import { get } from 'svelte/store';

// Get current state
const kingdom = get(kingdomData);
const currentResources = get(resources);
const currentFame = get(fame);

console.log(`Turn ${kingdom.currentTurn}, Phase ${kingdom.currentPhase}`);
console.log(`Gold: ${currentResources.gold}, Fame: ${currentFame}`);
```

### Writing Kingdom Data

```typescript
import { updateKingdom, setResource, modifyResource } from '../stores/kingdomActor';

// Simple resource modification
await modifyResource('gold', -100);
await modifyResource('fame', 1);

// Complex state updates
await updateKingdom(kingdom => {
  kingdom.resources.gold -= 50;
  kingdom.fame += 1;
  kingdom.unrest = Math.max(0, kingdom.unrest - 1);
  kingdom.modifiers.push({
    id: 'example-modifier',
    name: 'Example Bonus',
    value: 2,
    duration: 3
  });
});
```

## Phase Step Management

### Marking Steps Complete

```typescript
import { markPhaseStepCompleted, isPhaseStepCompleted } from '../stores/kingdomActor';

// Check if step is already complete
if (!isPhaseStepCompleted('resource-collection')) {
  await collectResources();
  await markPhaseStepCompleted('resource-collection');
}

// Mark multiple steps
await markPhaseStepCompleted('income-collected');
await markPhaseStepCompleted('upkeep-paid');
await markPhaseStepCompleted('events-resolved');
```

## UI Integration

### Phase Component Pattern

```svelte
<script>
import { onMount } from 'svelte';
import { kingdomData, isPhaseStepCompleted } from '../stores/kingdomActor';
import { TurnPhase } from '../models/KingdomState';

// UI State
let automationRunning = false;
let automationComplete = false;

// Reactive UI state based on step completion
$: stepOneComplete = isPhaseStepCompleted('step-one');
$: stepTwoComplete = isPhaseStepCompleted('step-two');

// Auto-run automation when component mounts (if appropriate)
onMount(async () => {
  if ($kingdomData.currentPhase === TurnPhase.PHASE_II && !stepOneComplete) {
    await runAutomation();
  }
});

// UI calls controller - NO business logic in component
async function runAutomation() {
  if (automationRunning) return;
  
  automationRunning = true;
  
  try {
    // Use controller for ALL business logic
    const { createExamplePhaseController } = await import('../controllers/ExamplePhaseController');
    const controller = await createExamplePhaseController();
    
    const result = await controller.runAutomation();
    
    if (result.success) {
      automationComplete = true;
      console.log('✅ [PhaseComponent] Automation completed successfully');
    } else {
      console.error('❌ [PhaseComponent] Automation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ [PhaseComponent] Error running automation:', error);
  } finally {
    automationRunning = false;
  }
}

// Manual step functions for UI testing (optional)
async function manualStepOne() {
  const { createExamplePhaseController } = await import('../controllers/ExamplePhaseController');
  const controller = await createExamplePhaseController();
  await controller.performStepOne(); // Expose individual steps if needed
}
</script>

<div class="phase-content">
  <h2>{$kingdomData.currentPhase}</h2>
  
  <!-- Status Display -->
  <div class="status-grid">
    <div class="status-item" class:complete={stepOneComplete}>
      <i class="fas {stepOneComplete ? 'fa-check-circle' : 'fa-circle'}"></i>
      <span>Step One</span>
    </div>
    
    <div class="status-item" class:complete={stepTwoComplete}>
      <i class="fas {stepTwoComplete ? 'fa-check-circle' : 'fa-circle'}"></i>
      <span>Step Two</span>
    </div>
  </div>
  
  <!-- Automation Controls -->
  {#if automationRunning}
    <div class="automation-running">
      <i class="fas fa-spinner fa-spin"></i>
      Running automation...
    </div>
  {:else if !automationComplete && !stepOneComplete}
    <button class="automation-button" on:click={runAutomation}>
      <i class="fas fa-play"></i>
      Run Phase Automation
    </button>
  {/if}
  
  <!-- Manual Controls (for testing/debugging) -->
  {#if !stepOneComplete}
    <button on:click={manualStepOne} disabled={automationRunning}>
      Manual Step One
    </button>
  {/if}
  
  <!-- Data Display (reactive to store changes) -->
  <div class="resources">
    <p>Gold: {$kingdomData.resources.gold}</p>
    <p>Fame: {$kingdomData.fame}</p>
  </div>
</div>
```

## Turn Manager Integration

### Phase Completion Notification

```typescript
// Tell TurnManager this phase is complete
async function notifyPhaseComplete() {
  const { turnManager } = await import('../stores/turn');
  const manager = get(turnManager);
  await manager.markCurrentPhaseComplete();
}
```

### Turn Progression

The TurnManager handles turn progression automatically:
- `markCurrentPhaseComplete()` - marks phase as done
- `nextPhase()` - advances to next phase automatically
- `endTurn()` - resets to Phase I when all phases complete

## Common Phase Patterns

### Resource Collection Phase

```typescript
async function collectResources() {
  const { resources } = await import('../stores/kingdomActor');
  const { modifyResource } = await import('../stores/kingdomActor');
  
  const currentResources = get(resources);
  
  // Calculate income
  const goldIncome = calculateGoldIncome();
  const foodIncome = calculateFoodIncome();
  
  // Apply income
  await modifyResource('gold', goldIncome);
  await modifyResource('food', foodIncome);
  
  console.log(`Collected ${goldIncome} gold, ${foodIncome} food`);
}
```

### Event Resolution Phase

```typescript
async function resolveEvents() {
  const { kingdomData } = await import('../stores/kingdomActor');
  const { updateKingdom } = await import('../stores/kingdomActor');
  
  const kingdom = get(kingdomData);
  
  for (const event of kingdom.activeEvents) {
    if (!event.resolved) {
      await resolveEvent(event);
      
      await updateKingdom(k => {
        const eventIndex = k.activeEvents.findIndex(e => e.id === event.id);
        if (eventIndex >= 0) {
          k.activeEvents[eventIndex].resolved = true;
        }
      });
    }
  }
}
```

### Upkeep Payment Phase

```typescript
async function payUpkeep() {
  const { resources, settlements } = await import('../stores/kingdomActor');
  const { modifyResource } = await import('../stores/kingdomActor');
  
  const currentResources = get(resources);
  const currentSettlements = get(settlements);
  
  // Calculate upkeep costs
  const totalUpkeep = calculateUpkeepCosts(currentSettlements);
  
  if (currentResources.gold >= totalUpkeep) {
    await modifyResource('gold', -totalUpkeep);
    console.log(`Paid ${totalUpkeep} gold in upkeep`);
  } else {
    await handleInsufficientFunds(totalUpkeep - currentResources.gold);
  }
}
```

## Error Handling

```typescript
async function runPhaseWithErrorHandling() {
  try {
    console.log('🟡 [Phase] Starting...');
    
    await performPhaseLogic();
    await markPhaseStepCompleted('logic-complete');
    
    await notifyPhaseComplete();
    
    console.log('✅ [Phase] Complete');
  } catch (error) {
    console.error('❌ [Phase] Failed:', error);
    
    // Log error details for debugging
    console.error('Error details:', {
      phase: 'ExamplePhase',
      step: 'phase-logic',
      error: error.message,
      stack: error.stack
    });
    
    // Don't notify completion on failure
    throw error;
  }
}
```

## Testing Phase Logic

```typescript
// Test phase implementation
describe('ExamplePhase', () => {
  test('should collect resources correctly', async () => {
    // Setup mock kingdom state
    const mockKingdom = createMockKingdom();
    setupKingdomActor(mockKingdom);
    
    // Run phase logic
    const controller = await createExamplePhaseController();
    await controller.runAutomation();
    
    // Verify results
    const updatedKingdom = get(kingdomData);
    expect(updatedKingdom.resources.gold).toBeGreaterThan(mockKingdom.resources.gold);
    expect(isPhaseStepCompleted('resource-collection')).toBe(true);
  });
});
```

## Key Guidelines

### Do's
- ✅ Keep phase logic direct and simple
- ✅ Use clear console logging with emoji indicators
- ✅ Mark steps complete as you progress
- ✅ Always notify TurnManager when phase is done
- ✅ Handle errors gracefully with meaningful messages

### Don'ts  
- ❌ Don't create complex abstractions unless necessary
- ❌ Don't write to derived stores directly
- ❌ Don't skip error handling
- ❌ Don't forget to mark phase complete
- ❌ Don't over-engineer simple operations

---

This pattern provides a clean, maintainable approach to implementing kingdom turn phases while leveraging the reactive architecture for UI updates.
