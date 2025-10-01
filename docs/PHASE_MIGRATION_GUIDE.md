# Phase Migration Guide

**Quick reference for migrating phases to the new `startPhase()` pattern**

## New Pattern

**Flow:** `TurnManager.nextPhase()` → Update `currentPhase` → Component Mounts → `controller.startPhase()`

**Key Change:** TurnManager no longer triggers controllers. Phases self-execute on mount.

## Controller Template

```typescript
export async function createXPhaseController() {
  return {
    async startPhase() {
      console.log('🟡 [XPhaseController] Starting phase...');
      try {
        await this.doPhaseWork();
        await markPhaseStepCompleted('phase-complete');
        await this.notifyPhaseComplete();
        console.log('✅ [XPhaseController] Phase complete');
        return { success: true };
      } catch (error) {
        console.error('❌ [XPhaseController] Phase failed:', error);
        return { success: false, error: error.message };
      }
    },
    
    async notifyPhaseComplete() {
      const { turnManager } = await import('../stores/turn');
      const manager = get(turnManager);
      if (manager) await manager.markCurrentPhaseComplete();
    }
  };
}
```

## Component Template

```svelte
<script>
import { onMount } from 'svelte';
import { kingdomData, isPhaseStepCompleted } from '../stores/KingdomStore';
import { TurnPhase } from '../models/KingdomState';

let phaseRunning = false;
$: stepComplete = isPhaseStepCompleted('phase-complete');

onMount(async () => {
  if ($kingdomData.currentPhase === TurnPhase.X && !stepComplete) {
    await startPhase();
  }
});

async function startPhase() {
  if (phaseRunning) return;
  phaseRunning = true;
  try {
    const { createXPhaseController } = await import('../controllers/XPhaseController');
    const controller = await createXPhaseController();
    const result = await controller.startPhase();
    if (!result.success) console.error('❌ [XPhase] Failed:', result.error);
  } catch (error) {
    console.error('❌ [XPhase] Error:', error);
  } finally {
    phaseRunning = false;
  }
}
</script>
```

## Migration Checklist

### Controller Updates:
- [ ] Rename `runAutomation()` → `startPhase()`
- [ ] Update console logs to use phase name
- [ ] Ensure `notifyPhaseComplete()` method exists

### TurnManager Updates:
- [ ] Remove `triggerPhaseController()` calls
- [ ] Simplify `nextPhase()` to only update `currentPhase`

### Component Updates:
- [ ] Update to call `controller.startPhase()`
- [ ] Add auto-start logic in `onMount()`
- [ ] Update variable names (`runAutomation` → `startPhase`)

## Data Operations

```typescript
// Read
import { kingdomData, resources } from '../stores/KingdomStore';
const kingdom = get(kingdomData);

// Write
import { setResource, modifyResource, markPhaseStepCompleted } from '../stores/KingdomStore';
await setResource('fame', 1);
await modifyResource('gold', -100);
await markPhaseStepCompleted('step-id');
```

## Rules

**DO:**
- ✅ Use `startPhase()` method name
- ✅ Auto-start on component mount
- ✅ Return `{ success: boolean, error?: string }`

**DON'T:**
- ❌ Trigger from TurnManager
- ❌ Use "automation" terminology
- ❌ Create double execution paths
