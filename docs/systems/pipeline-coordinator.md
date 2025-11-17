# Pipeline Coordinator Design

## Problem Statement

### Current Fragmented Pipeline Execution

The 14 migrated actions currently use a **fragmented approach** where different pipeline steps are called from different places in the codebase, without a central coordinator or persistent context object:

**Current Flow (Fragmented):**
1. **Pre-roll interactions** - Called from `ActionsPhase.handleExecuteSkill()`
2. **Roll execution** - Handled by PF2e roll system with callback
3. **Outcome preview creation** - Called from roll callback
4. **Preview calculation** - Calculated in pipeline definition
5. **OutcomeDisplay** - Mounted as Svelte component
6. **Post-apply interactions** - Called from `ActionsPhase.applyActionEffects()`
7. **Execute** - Called from `ActionPhaseController.resolveAction()`
8. **Cleanup** - Scattered across multiple places

### Problems with Current Architecture

❌ **No central coordinator** - Steps are executed from 5+ different locations  
❌ **No unified context** - Data scattered across `preview.metadata`, `resolutionData`, global state  
❌ **Inconsistent logging** - Each integration point logs differently  
❌ **Hard to debug** - No single place to trace execution flow  
❌ **MIGRATED_ACTIONS branching** - Two parallel code paths instead of one  
❌ **Silent failures** - Each integration point can fail without clear error handling  
❌ **Data persistence issues** - Context doesn't flow cleanly through all steps  

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
│  Step 3: Execute Roll                [always runs]      │
│  Step 4: Display Outcome             [always runs]      │
│  Step 5: Outcome Interactions        [optional]         │
│  Step 6: Wait For Apply              [always runs]      │
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
  previewId?: string;             // Step 4
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
  
  // Individual step implementations (9-step architecture)
  private async step1_checkRequirements(ctx: PipelineContext): Promise<void>
  private async step2_preRollInteractions(ctx: PipelineContext): Promise<void>
  private async step3_executeRoll(ctx: PipelineContext): Promise<void>
  private async step4_displayOutcome(ctx: PipelineContext): Promise<void>
  private async step5_outcomeInteractions(ctx: PipelineContext): Promise<void>
  private async step6_waitForApply(ctx: PipelineContext): Promise<void>
  private async step7_postApplyInteractions(ctx: PipelineContext): Promise<void>
  private async step8_executeAction(ctx: PipelineContext): Promise<void>
  private async step9_cleanup(ctx: PipelineContext): Promise<void>
  
  // Error handling
  private async rollback(ctx: PipelineContext): Promise<void>
  
  // Logging
  private log(ctx: PipelineContext, step: number, message: string): void
}
```

**Step Descriptions:**

**Step 1: checkRequirements()**
- Validate action can be performed
- Check resources, prerequisites
- Optional - skip if no requirements

**Step 2: preRollInteractions()**
- Execute interactions BEFORE roll
- Examples: select settlement, choose army
- Optional - skip if no pre-roll interactions

**Step 3: executeRoll()**
- Execute PF2e skill check with callback
- Callback resumes pipeline when roll completes
- **CALLBACK INJECTION POINT**
- Always runs

**Step 4: displayOutcome()**
- Create OutcomePreview data structure
- Mount OutcomeDisplay component
- Store in kingdom.pendingOutcomes
- Always runs

**Step 5: outcomeInteractions()**
- Wait for user to interact with OutcomeDisplay
- User rolls on tables, makes choices, updates preview
- Passive - handled by OutcomeDisplay component
- Optional - skip if no outcome interactions defined

**Step 6: waitForApply()**
- Wait for user to click "Apply Result" button
- Pause/resume pattern (see below)
- Always runs

**Step 7: postApplyInteractions()**
- Execute interactions AFTER apply clicked
- Examples: select hexes on map, allocate resources
- Optional - skip if no post-apply interactions

**Step 8: executeAction()**
- Apply state changes to kingdom
- Update resources, create entities
- Always runs

**Step 9: cleanup()**
- Delete OutcomePreview from kingdom.pendingOutcomes
- Track action in log
- Always runs

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

### 3. Step 6 Special Handling (Wait For Apply)

**Challenge:** Step 6 waits for user to click "Apply Result" in OutcomeDisplay

**Solution:** Pause/Resume Pattern

```typescript
// Store context in memory
private pendingContexts = new Map<string, PipelineContext>();

private async step6_waitForApply(ctx: PipelineContext): Promise<void> {
  this.log(ctx, 6, 'Pausing for user to click Apply Result...');
  
  // Store context
  this.pendingContexts.set(ctx.previewId!, ctx);
  
  // Return promise that resolves when user clicks Apply
  return new Promise((resolve) => {
    ctx._resumeCallback = resolve;
  });
}

// Called from OutcomeDisplay when user clicks Apply
resumePipeline(previewId: string): void {
  const ctx = this.pendingContexts.get(previewId);
  if (ctx && ctx._resumeCallback) {
    ctx.userConfirmed = true;
    ctx._resumeCallback();
    
    // Continue with Steps 7-9
    await this.step7_postApplyInteractions(ctx);
    await this.step8_executeAction(ctx);
    await this.step9_cleanup(ctx);
  }
}
```

### 4. Callback Integration (Step 3)

**Challenge:** PF2e roll callback fires asynchronously after user completes roll

**Solution:** Callback resumes pipeline at Step 4

```typescript
private async step3_executeRoll(ctx: PipelineContext): Promise<void> {
  this.log(ctx, 3, 'Executing skill check');
  
  // CREATE CALLBACK that resumes pipeline
  const callback: CheckRollCallback = async (roll, outcome, message, event) => {
    console.log('✅ [Callback] Roll complete:', { outcome, total: roll.total });
    
    // Update context with roll data
    ctx.rollData = {
      skill: skillName,
      dc,
      roll,
      outcome: outcome ?? 'failure',
      rollBreakdown: { ... }
    };
    
    // Resume pipeline at Step 4
    await this.resumeAfterRoll(ctx);
  };
  
  // Call PF2eSkillService with callback
  await pf2eSkillService.performKingdomSkillCheck(
    skillName, 'action', actionName, actionId, outcomes,
    undefined, // actionId
    callback   // ← Pass callback
  );
  
  // Step 3 returns - callback will resume pipeline later
}

private async resumeAfterRoll(ctx: PipelineContext): Promise<void> {
  await this.step4_displayOutcome(ctx);
  await this.step5_outcomeInteractions(ctx);
  await this.step6_waitForApply(ctx);
  // Steps 7-9 happen after user clicks Apply (see step6)
}
```

### 5. Conditional Step Execution

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

### 6. Error Handling & Rollback

**Centralized try/catch with rollback:**

```typescript
async executePipeline(actionId, initialContext) {
  const context = this.initializeContext(actionId, initialContext);
  
  try {
    await this.step1_checkRequirements(context);
    await this.step2_preRollInteractions(context);
    await this.step3_executeRoll(context);
    // Steps 4-9 happen via callbacks
    
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
  // Clear outcome preview if created
  // Restore deducted resources if needed
}
```

---

## Migration Status

### ✅ Phase 1: Callback Refactor (Complete)

- [x] Remove event-based roll completion system
- [x] Implement callback-based architecture in PipelineCoordinator
- [x] Step 3 creates callback, PF2e calls it when roll completes
- [x] Callback resumes pipeline at Step 4
- [x] Tested with claim-hexes and deal-with-unrest

### ✅ Phase 2: Naming Cleanup (Complete)

- [x] Rename `CheckInstance` → `OutcomePreview`
- [x] Rename `activeCheckInstances` → `pendingOutcomes`
- [x] Rename `instanceId` → `previewId`
- [x] Update all documentation
- [x] Build verified successful

### 🔄 Phase 3: Full Pipeline Integration (In Progress)

**Goal:** Migrate ActionsPhase to use coordinator for ALL actions

- [ ] Update ActionsPhase to call `executePipeline()` as single entry point
- [ ] Remove `MIGRATED_ACTIONS` branching
- [ ] Test all 26 actions with unified pipeline
- [ ] Remove old helper methods

### 📋 Phase 4: Cleanup (Pending)

**Goal:** Remove old implementation system

- [ ] Delete `src/actions/*/ActionClass.ts` files (24 files)
- [ ] Delete `src/controllers/actions/implementations/index.ts`
- [ ] Delete `src/actions/shared/InlineActionHelpers.ts`
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

## Related Documents

- `docs/refactoring/CALLBACK_REFACTOR_MIGRATION.md` - Callback system migration
- `docs/refactoring/OUTCOME_PREVIEW_RENAMING.md` - Terminology cleanup
- `docs/refactoring/ACTION_MIGRATION_CHECKLIST.md` - Per-action migration tracking
- `.clinerules/ARCHITECTURE_SUMMARY.md` - System architecture overview

---

**Status:** � Active Development  
**Current Phase:** Phase 3 (Full Pipeline Integration)  
**Last Updated:** 2025-11-17
