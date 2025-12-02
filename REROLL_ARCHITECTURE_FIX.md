# Reroll Architecture - PROPER FIX

## Problem Identified

The original issue wasn't just that UnrestPhase had the wrong reroll implementation - **the entire architecture was wrong**. Reroll logic was duplicated in THREE separate phase handlers:
- `ActionsPhase.handlePerformReroll()`
- `EventsPhase.handlePerformReroll()` 
- `UnrestPhase.handleReroll()`

This violated the DRY (Don't Repeat Yourself) principle and created maintenance issues.

## Architectural Solution

**Reroll logic now lives in ONE place: OutcomeDisplay.svelte**

### Before (Wrong):
```
OutcomeDisplay → dispatch('performReroll') → BaseCheckCard → Phase Handler → PipelineCoordinator.rerollFromStep3()
                                                           ↑
                                                  Duplicated 3 times!
```

### After (Correct):
```
OutcomeDisplay → PipelineCoordinator.rerollFromStep3() directly
```

## Implementation

**File:** `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte`

The `handleReroll()` function now:
1. Checks fame availability
2. Deducts fame
3. **Calls `PipelineCoordinator.rerollFromStep3()` DIRECTLY**
4. No longer dispatches events to parent phases

```typescript
async function handleReroll() {
  // Check & deduct fame...
  
  // ✅ ARCHITECTURE: Call PipelineCoordinator directly
  const instanceId = instance.previewId;
  const { getPipelineCoordinator } = await import('../../../../services/PipelineCoordinator');
  const pipelineCoordinator = await getPipelineCoordinator();
  
  // Rewind to Step 3 and re-execute with SAME context
  await pipelineCoordinator.rerollFromStep3(instanceId);
}
```

## Benefits

1. **Single Source of Truth** - Reroll logic in one place only
2. **Phase-Independent** - Works for actions, events, and incidents without duplication
3. **Easier Maintenance** - Fix once, works everywhere
4. **Architectural Integrity** - OutcomeDisplay knows about pipelines, not phases

## Phase Handlers (Now Obsolete)

The phase-specific `handlePerformReroll()` handlers can now be:
- **Removed** from ActionsPhase, EventsPhase, UnrestPhase
- **Or kept** as no-ops for backward compatibility

The `on:performReroll` event is still dispatched but no longer needs to be handled by phases.

## Files Modified

1. `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte` - Reroll logic centralized here
2. `src/services/PipelineCoordinator.ts` - Removed duplicate modifier storage (previous fix)
3. `src/services/pf2e/PF2eSkillService.ts` - Added comprehensive debug logging (previous fix)

## Testing

After this fix:
1. **Restart Foundry** completely
2. **Test reroll** on any check type (action, event, or incident)
3. **Look for log:** `🔄 [OutcomeDisplay] Rerolling from Step 3 (same pipeline): <instanceId>`
4. **Verify modifiers** are preserved in the new roll dialog

The architecture is now correct - reroll is a pipeline-level concern, not a phase-level concern.

