# Phase Implementation Guide

**Quick Reference for PF2e Reignmaker Phase Development**

## Core Pattern

1. **Controller** = Business logic only
2. **Svelte** = UI only, delegates to controller  
3. **Flow:** Do work → Mark steps → Notify TurnManager

## Controller Template

```typescript
// src/controllers/ExamplePhaseController.ts
import { markPhaseStepCompleted, setResource, modifyResource } from '../stores/kingdomActor';
import { get } from 'svelte/store';

export async function createExamplePhaseController() {
  return {
    async runAutomation() {
      try {
        await this.performPhaseLogic();
        await markPhaseStepCompleted('logic-complete');
        await this.notifyPhaseComplete();
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    
    async performPhaseLogic() {
      // Business logic here
      await setResource('fame', 1);
      await modifyResource('gold', -100);
    },
    
    async notifyPhaseComplete() {
      const { turnManager } = await import('../stores/turn');
      await get(turnManager).markCurrentPhaseComplete();
    }
  };
}
```

## UI Template

```svelte
<script>
import { onMount } from 'svelte';
import { kingdomData, isPhaseStepCompleted } from '../stores/kingdomActor';

let automationRunning = false;
$: stepComplete = isPhaseStepCompleted('logic-complete');

onMount(async () => {
  if ($kingdomData.currentPhase === 'TARGET_PHASE' && !stepComplete) {
    await runAutomation();
  }
});

async function runAutomation() {
  if (automationRunning) return;
  automationRunning = true;
  
  try {
    const { createExamplePhaseController } = await import('../controllers/ExamplePhaseController');
    const controller = await createExamplePhaseController();
    const result = await controller.runAutomation();
    
    if (!result.success) {
      console.error('❌ [Phase] Failed:', result.error);
    }
  } catch (error) {
    console.error('❌ [Phase] Error:', error);
  } finally {
    automationRunning = false;
  }
}
</script>

<div class="phase-content">
  <div class="status-item" class:complete={stepComplete}>
    {stepComplete ? '✅' : '⏳'} Phase Logic
  </div>
  
  {#if automationRunning}
    <div>🔄 Running...</div>
  {:else if !stepComplete}
    <button on:click={runAutomation}>Run Phase</button>
  {/if}
</div>
```

## Data Operations

```typescript
// Read data
import { kingdomData, resources } from '../stores/kingdomActor';
const kingdom = get(kingdomData);
const gold = get(resources).gold;

// Write data
import { updateKingdom, setResource, modifyResource } from '../stores/kingdomActor';
await setResource('fame', 1);                    // Set absolute value
await modifyResource('gold', -100);              // Add/subtract
await updateKingdom(k => k.unrest = 0);          // Complex updates

// Step tracking
import { markPhaseStepCompleted, isPhaseStepCompleted } from '../stores/kingdomActor';
await markPhaseStepCompleted('step-id');
const isDone = isPhaseStepCompleted('step-id');
```

## Common Patterns

### Resource Collection
```typescript
async function collectResources() {
  const income = calculateIncome();
  await modifyResource('gold', income.gold);
  await modifyResource('food', income.food);
}
```

### Event Resolution
```typescript
async function resolveEvents() {
  const kingdom = get(kingdomData);
  for (const event of kingdom.activeEvents) {
    if (!event.resolved) {
      await resolveEvent(event);
      await updateKingdom(k => {
        k.activeEvents.find(e => e.id === event.id).resolved = true;
      });
    }
  }
}
```

## Key Rules

**DO:**
- ✅ Business logic in controllers only
- ✅ UI state management in Svelte only  
- ✅ Return `{ success: boolean, error?: string }`
- ✅ Use emoji logging: 🟡 starting, ✅ success, ❌ error

**DON'T:**
- ❌ Business logic in Svelte components
- ❌ UI concerns in controllers
- ❌ Write to derived stores directly
- ❌ Skip error handling or step completion
