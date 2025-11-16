# Pipeline Coordinator Design

## Problem Statement

### Current Fragmented Pipeline Execution

The 14 migrated actions currently use a **fragmented approach** where different pipeline steps are called from different places in the codebase, without a central coordinator or persistent context object:

**Current Flow (Fragmented):**
1. **Pre-roll interactions** - Called from `ActionsPhase.handleExecuteSkill()`
2. **Roll execution** - Handled by PF2e roll system
3. **Check instance creation** - Called from `ActionsPhase.onActionResolved()`
4. **Preview calculation** - Called in `CheckInstanceHelpers.createActionCheckInstance()`
5. **OutcomeDisplay** - Mounted as Svelte component
6. **Post-apply interactions** - Called from `ActionsPhase.applyActionEffects()`
7. **Execute** - Called from `ActionPhaseController.resolveAction()`
8. **Cleanup** - Scattered across multiple places

### Problems with Current Architecture

❌ **No central coordinator** - Steps are executed from 5+ different locations  
❌ **No unified context** - Data scattered across `instance.metadata`, `resolutionData`, global state  
❌ **Inconsistent logging** - Each integration point logs differently  
❌ **Hard to debug** - No single place to trace execution flow  
❌ **MIGRATED_ACTIONS branching** - Two parallel code paths instead of one  
❌ **Silent failures** - Each integration point can fail without clear error handling  
❌ **Data persistence issues** - Context doesn't flow cleanly through all steps  

### Example: claim-hexes Bug

The recent claim-hexes bug illustrates this problem:
- Pipeline defined `postApplyInteractions` for hex selection
- But no `onComplete` handler was defined to save the selected hexes
- Result: User selected hexes, but they were never claimed
- Root cause: Fragmented execution meant the hex selection interaction and execution logic were disconnected

---

## Proposed Solution: Unified PipelineCoordinator

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  PipelineCoordinator                     │
│  (Single entry point for ALL action execution)          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: Requirements Check          [optional]         │
│  Step 2: Pre-Roll Interactions       [optional]         │
│  Step 3: Roll Execution              [always runs]      │
│  Step 4: Check Instance Creation     [always runs]      │
│  Step 5: Preview Calculation         [optional]         │
│  Step 6: User Confirmation (UI)      [always runs]      │
│  Step 7: Post-Apply Interactions     [optional]         │
│  Step 8: Execute Action              [always runs]      │
│  Step 9: Cleanup                     [always runs]      │
│                                                          │
│  Context persists through all steps ──────────────►     │
└─────────────────────────────────────────────────────────┘
```

### Core Principle: Single Context Object

```typescript
interface PipelineContext {
  // Immutable identifiers
  readonly actionId: string;
  readonly checkType: 'action' | 'event' | 'incident';
  readonly userId: string;
  
  // Data accumulated through pipeline steps
  actor?: ActorContext;           // Step 1
  metadata: CheckMetadata;         // Step 2
  rollData?: RollData;             // Step 3
  instanceId?: string;             // Step 4
  preview?: PreviewData;           // Step 5
  userConfirmed: boolean;          // Step 6
  resolutionData: ResolutionData;  // Step 7
  executionResult?: ExecutionResult; // Step 8
  
  // Helpers
  logs: StepLog[];                 // Centralized logging
  getKingdom(): KingdomData;       // Access to live data
  getPipeline(): CheckPipeline;    // Access to pipeline config
}
```

---

## Detailed Design

### 1. PipelineContext Type

**File:** `src/types/PipelineContext.ts`

**Purpose:** Single data container that persists through all 9 pipeline steps

**Key Features:**
- Immutable identifiers prevent corruption
- Step-specific data sections clearly organized
- Helper methods provide access to live kingdom data
- Centralized logging for debugging

**Data Flow:**
```
Empty Context → [Step 1-9] → Complete Context
     ↓
   Metadata collected at each step
     ↓
   Full audit trail of execution
```

### 1.5. PreviewData Structure (Critical!)

**File:** `src/types/PreviewData.ts`

**⚠️ CRITICAL:** Preview calculations must return a **complete** `PreviewData` object.

**Required Structure:**

```typescript
interface PreviewData {
  resources: ResourceChange[];       // ✅ Always required
  entities?: EntityOperation[];      // Optional
  specialEffects: SpecialEffect[];   // ✅ Always required (even if empty)
  warnings?: string[];               // Optional
}
```

**Common Bug:**

```typescript
// ❌ This will crash when formatting preview
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: -2 }]
  })
}

// ✅ Always include both required arrays
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: -2 }],
    specialEffects: []  // Required!
  })
}
```

**Why This Matters:**

The `defaultFormatPreview` method in `UnifiedCheckHandler` iterates over `specialEffects`:

```typescript
// UnifiedCheckHandler.ts
defaultFormatPreview(preview: PreviewData) {
  // ...
  for (const effect of preview.specialEffects) {  // ← Crashes if undefined
    effects.push(effect);
  }
  // ...
}
```

**Error you'll see:**
```
TypeError: preview.specialEffects is not iterable (cannot read property undefined)
```

**Helper Function (Recommended):**

Use `createEmptyPreviewData()` to ensure complete structure:

```typescript
import { createEmptyPreviewData } from '../types/PreviewData';

preview: {
  calculate: (ctx) => {
    const preview = createEmptyPreviewData();
    preview.resources.push({ resource: 'unrest', value: -2 });
    return preview;
  }
}
```

This guarantees all required properties are present and prevents runtime errors.

### 2. PipelineCoordinator Class

**File:** `src/services/PipelineCoordinator.ts`

**Purpose:** Central orchestrator for ALL action execution

**Key Methods:**

```typescript
class PipelineCoordinator {
  // Main entry point
  async executePipeline(
    actionId: string,
    initialContext: Partial<PipelineContext>
  ): Promise<PipelineContext>
  
  // Individual step implementations
  private async step1_checkRequirements(ctx: PipelineContext): Promise<void>
  private async step2_preRollInteractions(ctx: PipelineContext): Promise<void>
  private async step3_executeRoll(ctx: PipelineContext): Promise<void>
  private async step4_createCheckInstance(ctx: PipelineContext): Promise<void>
  private async step5_calculatePreview(ctx: PipelineContext): Promise<void>
  private async step6_waitForUserConfirmation(ctx: PipelineContext): Promise<void>
  private async step7_postApplyInteractions(ctx: PipelineContext): Promise<void>
  private async step8_executeAction(ctx: PipelineContext): Promise<void>
  private async step9_cleanup(ctx: PipelineContext): Promise<void>
  
  // Error handling
  private async rollback(ctx: PipelineContext): Promise<void>
  
  // Logging
  private log(ctx: PipelineContext, step: number, message: string): void
}
```

**Execution Flow:**

```typescript
// BEFORE (fragmented):
async function handleAction(actionId) {
  // Check if migrated
  if (MIGRATED_ACTIONS.has(actionId)) {
    // Do pipeline stuff
    await someFunction();
    await anotherFunction();
    // ... scattered logic
  } else {
    // Do old custom action stuff
  }
}

// AFTER (unified):
async function handleAction(actionId) {
  const coordinator = new PipelineCoordinator();
  const context = await coordinator.executePipeline(actionId, {
    userId: currentUserId,
    actor: { selectedSkill: 'survival' }
  });
  
  // Done! All 9 steps executed with persistent context
}
```

### 3. Step 6 Special Handling (User Confirmation)

**Challenge:** Step 6 waits for user to click "Apply Result" in OutcomeDisplay

**Solution:** Pause/Resume Pattern

```typescript
// Store context in memory
private pendingContexts = new Map<string, PipelineContext>();

private async step6_waitForUserConfirmation(ctx: PipelineContext): Promise<void> {
  this.log(ctx, 6, 'Pausing for user confirmation...');
  
  // Store context
  this.pendingContexts.set(ctx.instanceId!, ctx);
  
  // Return promise that resolves when user clicks Apply
  return new Promise((resolve) => {
    ctx._resumeCallback = resolve;
  });
}

// Called from OutcomeDisplay when user clicks Apply
resumePipeline(instanceId: string): void {
  const ctx = this.pendingContexts.get(instanceId);
  if (ctx && ctx._resumeCallback) {
    ctx.userConfirmed = true;
    ctx._resumeCallback();
  }
}
```

### 4. Conditional Step Execution

Each step checks if it's needed before executing:

```typescript
private async step2_preRollInteractions(ctx: PipelineContext): Promise<void> {
  const pipeline = ctx.getPipeline();
  
  if (!pipeline.preRollInteractions || pipeline.preRollInteractions.length === 0) {
    this.log(ctx, 2, 'No pre-roll interactions, skipping');
    return; // ← Skip if not needed
  }
  
  // Execute step...
}
```

### 5. Error Handling & Rollback

**Centralized try/catch with rollback:**

```typescript
async executePipeline(actionId, initialContext) {
  const context = this.initializeContext(actionId, initialContext);
  
  try {
    await this.step1_checkRequirements(context);
    await this.step2_preRollInteractions(context);
    // ... all 9 steps
    
    this.logSuccess(context);
    return context;
    
  } catch (error) {
    this.logError(context, error);
    await this.rollback(context); // ← Undo partial changes
    throw error;
  }
}

private async rollback(ctx: PipelineContext): Promise<void> {
  // Check which steps completed
  // Undo state changes from completed steps
  // Clear check instance if created
  // Restore deducted resources if needed
}
```

---

## Migration Plan

### Phase 1: Infrastructure (Week 1)

**Goal:** Create core coordinator without breaking existing functionality

- [ ] Create `src/types/PipelineContext.ts`
- [ ] Create `src/services/PipelineCoordinator.ts` (stub implementation)
- [ ] Add tests for context initialization
- [ ] Document API

### Phase 2: Step-by-Step Integration (Week 2-3)

**Goal:** Migrate ActionsPhase to use coordinator, one step at a time

- [ ] Implement Step 1 (requirements)
- [ ] Implement Step 2 (pre-roll interactions)
- [ ] Implement Step 3 (roll execution)
- [ ] Implement Step 4 (check instance creation)
- [ ] Implement Step 5 (preview calculation)
- [ ] Implement Step 6 (user confirmation - pause/resume)
- [ ] Implement Step 7 (post-apply interactions)
- [ ] Implement Step 8 (execute)
- [ ] Implement Step 9 (cleanup)

### Phase 3: Refactor ActionsPhase (Week 4)

**Goal:** Remove fragmented code, simplify ActionsPhase

- [ ] Replace `handleExecuteSkill()` with coordinator call
- [ ] Replace `applyActionEffects()` with coordinator resume
- [ ] Remove `MIGRATED_ACTIONS` branching
- [ ] Delete old helper methods
- [ ] Test all 26 actions

### Phase 4: Cleanup (Week 5)

**Goal:** Remove old implementation system

- [ ] Delete `src/actions/*/ActionClass.ts` files (24 files)
- [ ] Delete `src/controllers/actions/implementations/index.ts`
- [ ] Delete `src/actions/shared/InlineActionHelpers.ts`
- [ ] Add deprecation notices to old files
- [ ] Update documentation

---

## Benefits

### For Developers

✅ **Single code path** - No more branching on `MIGRATED_ACTIONS`  
✅ **Easy debugging** - Trace context object through all 9 steps  
✅ **Clear error handling** - Centralized try/catch with rollback  
✅ **Consistent logging** - All steps log in the same format  
✅ **Type safety** - Context object is fully typed  

### For Maintainability

✅ **Easier to add new actions** - Just define pipeline config, coordinator handles the rest  
✅ **Easier to modify pipeline** - Change in one place affects all actions  
✅ **Self-documenting** - Step names clearly indicate what happens  
✅ **Testable** - Can test each step independently  

### For Users

✅ **Consistent behavior** - All actions work the same way  
✅ **Better error messages** - Know exactly which step failed  
✅ **No more silent failures** - Rollback ensures data consistency  

---

## Open Questions

1. **Async UI Step (Step 6):**  
   Q: Should we use a pause/resume pattern or a callback-based approach?  
   A: TBD - need to discuss trade-offs

2. **Rollback Complexity:**  
   Q: How granular should rollback be? Per-step or all-or-nothing?  
   A: TBD - depends on step complexity

3. **Migration Strategy:**  
   Q: Big-bang migration or gradual rollout?  
   A: Prefer gradual - migrate one category at a time (e.g., Simple Actions first)

4. **Performance:**  
   Q: Will single coordinator become a bottleneck?  
   A: Unlikely - actions are infrequent, and coordinator is stateless

5. **Context Size:**  
   Q: Will context object become too large?  
   A: Monitor - can split into sub-contexts if needed

---

## Next Steps

1. **Review this document** - Discuss design decisions
2. **Create PipelineContext type** - Start with type definitions
3. **Create PipelineCoordinator stub** - Basic class structure
4. **Implement Step 1** - Simplest step to validate approach
5. **Test with one action** - Prove concept with claim-hexes
6. **Iterate** - Refine based on learnings

---

## Related Documents

- `docs/refactoring/MIGRATION_GUIDE.md` - Overall migration progress
- `docs/refactoring/ACTION_MIGRATION_CHECKLIST.md` - Per-action migration tracking
- `.clinerules/ARCHITECTURE_SUMMARY.md` - System architecture overview

---

**Status:** 📋 Design Phase  
**Owner:** Architecture Team  
**Last Updated:** 2025-11-16
