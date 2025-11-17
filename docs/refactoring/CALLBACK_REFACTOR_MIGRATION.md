# Callback Refactor Migration Guide

## Overview

This document describes the **breaking change** from event-based roll handling to PF2e's native callback pattern in the PipelineCoordinator.

**Date:** 2025-11-16  
**Breaking Change:** YES - All actions must be retested  
**Backward Compatibility:** NONE - Complete replacement

## What Changed

### Before (Event-Based - REMOVED)
```
Step 3: executeRoll() → stores flag → returns
  ↓ (waits for event)
PF2eRollService Hook detects chat message
  ↓
Dispatches 'kingdomRollComplete' event
  ↓
ActionsPhase.svelte listener handles event
  ↓
continueFromRollComplete() → Steps 4-9
```

### After (Callback-Based - NEW)
```
Step 3: executeRoll() with callback
  ↓
skill.roll({ callback })
  ↓
[USER COMPLETES ROLL]
  ↓
PF2e calls callback(roll, outcome, message) → IMMEDIATELY resumes pipeline
  ↓
Steps 4-9 execute
```

## Removed Components

### Removed Methods
- ❌ `PF2eRollService.initializeRollResultHandler()` - Event system hook
- ❌ `ActionsPhase.handleRollComplete()` - Event listener
- ❌ `PipelineCoordinator.executePipelinePreRoll()` - Pre-roll split
- ❌ `PipelineCoordinator.continueFromRollComplete()` - Post-roll continuation
- ❌ Flag-based state management (`pendingCheck` flags)

### Removed Events
- ❌ `kingdomRollComplete` custom event - No longer dispatched

### Removed Infrastructure
- ❌ Event listener registration in ActionsPhase
- ❌ Deduplication tracking (`processedRolls` Set)
- ❌ `preRollContexts` Map in PipelineCoordinator
- ❌ Hook registration for chat message creation

## New Architecture

### Single Entry Point
```typescript
async executePipeline(actionId, initialContext): Promise<void> {
  const ctx = this.initializeContext(actionId, initialContext);
  
  await this.step1_checkRequirements(ctx);
  await this.step2_preRollInteractions(ctx);
  await this.step3_executeRoll(ctx); // Returns after setting up callback
  
  // Callback will resume with Steps 4-9
}
```

### Step 3 with Callback
```typescript
private async step3_executeRoll(ctx: PipelineContext): Promise<void> {
  // CREATE CALLBACK that resumes pipeline
  const callback: CheckRollCallback = async (roll, outcome, message, event) => {
    // Update context with roll data
    ctx.rollData = { skill, dc, roll, outcome, rollBreakdown };
    
    // Resume pipeline at Step 4
    await this.resumeAfterRoll(ctx);
  };
  
  // Call PF2e roll with callback
  await skill.roll({ dc, label, callback });
  
  // Step 3 returns - callback will resume pipeline later
}
```

### Resume Method
```typescript
private async resumeAfterRoll(ctx: PipelineContext): Promise<void> {
  await this.step4_displayOutcome(ctx);
  await this.step5_outcomeInteractions(ctx);
  await this.step6_waitForApply(ctx);
  await this.step7_postApplyInteractions(ctx);
  await this.step8_executeAction(ctx);
  await this.step9_cleanup(ctx);
}
```

## Renamed Components

### Step Names
- `step4_createCheckInstance` → `step4_displayOutcome`
- `step5_calculatePreview` → `step5_outcomeInteractions`
- `step6_waitForUserConfirmation` → `step6_waitForApply`
- `confirmOutcome()` → `confirmApply()`

### Services/Types (Phase 3)
- `OutcomePreviewService` → `OutcomePreviewService`
- `CheckInstanceHelpers` → `OutcomePreviewHelpers`
- `OutcomePreview` → `OutcomePreview`
- `previewId` → `previewId`
- `pendingOutcomes` → `pendingOutcomes`

## Migration Impact

### All Actions Require Retesting
After this refactor, **ALL** actions must be retested because:
- Event-based roll handling is completely removed
- New callback pattern may expose timing issues
- Flag-based state no longer exists
- Pipeline flow is fundamentally different

### Migration Status Reset
```typescript
// All actions reset to 'untested'
export const ACTION_STATUS: Record<string, ActionMigrationStatus> = {
  'claim-hexes': 'untested',
  'deal-with-unrest': 'untested',
  // ... all actions
};

// Empty the migrated sets
export const MIGRATED_ACTIONS = new Set<string>([]);
export const MIGRATED_ACTION_NUMBERS = new Set<number>([]);
```

## Testing Checklist

After refactor, test in this order:
1. ✅ Verify PF2e callback fires after roll completion
2. ✅ Test claim-hexes (hex selection + callback)
3. ✅ Test deal-with-unrest (simple callback flow)
4. ✅ Test OutcomeDisplay rendering with new naming
5. ✅ Test Step 6 pause/resume (Apply Result button)
6. ✅ Test error handling and rollback
7. ✅ Verify no event system remnants

## Benefits

### Why This Change?

**Reliability:**
- ✅ Direct callback = no event dispatch failures
- ✅ No hook chain latency
- ✅ No flag desync issues
- ✅ Native PF2e integration

**Simplicity:**
- ✅ Single entry point (no pre/post split)
- ✅ Linear pipeline flow
- ✅ Less state management
- ✅ Fewer moving parts

**Maintainability:**
- ✅ Easier to debug (synchronous flow)
- ✅ Clearer execution path
- ✅ Better type safety
- ✅ Standard PF2e pattern

## Rollback Plan

If issues arise:
1. Revert commit
2. Event system was in previous commit
3. All actions revert to event-based flow
4. No data migration needed (kingdom data unchanged)

## Recommended Execute Pattern

All action pipelines should use an **explicit switch statement** to handle outcomes:

```typescript
execute: async (ctx) => {
  switch (ctx.outcome) {
    case 'criticalSuccess':
      // Explicitly apply modifiers or custom logic
      await applyPipelineModifiers(myActionPipeline, ctx.outcome);
      return { success: true };
      
    case 'success':
      // Explicitly apply modifiers or custom logic
      await applyPipelineModifiers(myActionPipeline, ctx.outcome);
      return { success: true };
      
    case 'failure':
      // Explicitly apply modifiers or custom logic
      await applyPipelineModifiers(myActionPipeline, ctx.outcome);
      return { success: true };
      
    case 'criticalFailure':
      // Explicitly handle (may be no-op if no modifiers)
      await applyPipelineModifiers(myActionPipeline, ctx.outcome);
      return { success: true };
      
    default:
      // Error handling - should never reach
      return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
  }
}
```

### Why Explicit Switch Statements?

**✅ Benefits:**
- **Self-documenting:** Each outcome is visible in the code
- **Type-safe:** TypeScript enforces all outcomes are handled
- **Debuggable:** Clear execution path for each outcome
- **Maintainable:** Easy to see what each outcome does
- **No surprises:** No implicit fallthrough or hidden behavior

**❌ Avoid Generic Patterns:**
```typescript
// ❌ BAD - Not explicit about outcomes
execute: async (ctx) => {
  await applyPipelineModifiers(myActionPipeline, ctx.outcome);
  return { success: true };
}
```

This pattern hides the logic and makes it unclear what happens for each outcome. Use the explicit switch statement instead.

## Notes

- This refactor does NOT change kingdom data structure
- Existing games are compatible (no save migration needed)
- Only affects action execution flow
- Event/Incident systems unchanged (for now)
