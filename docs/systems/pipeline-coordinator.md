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

### 5. Step 5: Custom Component Injection (Outcome Interactions)

**Purpose:** Allow actions to inject interactive UI components inline in OutcomeDisplay for user input after rolling.

**Use Cases:**
- **harvest-resources** - Select which resource to harvest (Food/Lumber/Stone/Ore)
- **sell-surplus** - Select which resource to sell
- **purchase-resources** - Select which resource to buy
- **outfit-army** - Select equipment options
- **Any action needing post-roll user choices**

#### Custom Component Interface

**File:** `src/types/CustomComponentInterface.ts`

All custom components must implement this standardized interface:

```typescript
/**
 * Standard props all custom components receive
 */
export interface CustomComponentProps {
  instance: ActiveCheckInstance | null;  // Check instance data
  outcome: string;                        // Roll outcome
  config?: Record<string, any>;          // Component-specific config
}

/**
 * Standard event payload all components must emit
 */
export interface ComponentResolutionData {
  isResolved: boolean;                   // Component finished?
  modifiers?: EventModifier[];           // Resource changes
  metadata?: Record<string, any>;        // Additional data
}
```

**Contract:**
- Components receive standardized props
- Components emit `resolution` event with ComponentResolutionData
- OutcomeDisplay captures and merges the data

#### Component Registration Pattern

**File:** `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte`

```typescript
// Import all custom components
import ResourceChoiceSelector from './components/ResourceChoiceSelector.svelte';
import CostChoiceSelector from './components/CostChoiceSelector.svelte';

// Registry maps component names to classes
const COMPONENT_REGISTRY: Record<string, any> = {
  'ResourceChoiceSelector': ResourceChoiceSelector,
  'CostChoiceSelector': CostChoiceSelector
};

// Reactive lookup
$: customComponent = preview.appliedOutcome?.componentName 
  ? COMPONENT_REGISTRY[preview.appliedOutcome.componentName]
  : null;

// Render inline
{#if customComponent}
  <div class="custom-resolution-ui">
    <svelte:component 
      this={customComponent} 
      {instance}
      outcome={preview.appliedOutcome.outcome}
      config={preview.appliedOutcome.componentConfig || {}}
      on:resolution={handleComponentResolution}
    />
  </div>
{/if}
```

#### Data Flow (Complete Path)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Pipeline Definition (harvest-resources.ts)              │
├─────────────────────────────────────────────────────────────┤
│ postRollInteractions: [{                                    │
│   type: 'configuration',                                    │
│   component: ResourceChoiceSelector,  // Svelte class       │
│   condition: (ctx) => ctx.outcome === 'success',            │
│   onComplete: async (data) => {                             │
│     // Apply user's selection                               │
│     const { selectedResource, amount } = data;              │
│     await applyResourceChanges([                            │
│       { resource: selectedResource, value: amount }         │
│     ]);                                                      │
│   }                                                          │
│ }]                                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. OutcomePreviewService (component name extraction)       │
├─────────────────────────────────────────────────────────────┤
│ // Extract component name from class                        │
│ const rawName = interaction.component.name;                 │
│ // Strip Proxy wrapper (HMR compatibility)                  │
│ const componentName = rawName.replace(/^Proxy<(.+)>$/, '$1');│
│ // Store in actor flags                                     │
│ preview.appliedOutcome.componentName = 'ResourceChoiceSelector';│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. OutcomeDisplay (component rendering)                    │
├─────────────────────────────────────────────────────────────┤
│ // Reactive lookup from registry                            │
│ $: customComponent = COMPONENT_REGISTRY[componentName];     │
│                                                              │
│ // Render inline                                            │
│ <svelte:component                                           │
│   this={customComponent}                                    │
│   {instance}                                                │
│   outcome={preview.appliedOutcome.outcome}                  │
│   on:resolution={handleComponentResolution}                 │
│ />                                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ResourceChoiceSelector (user interaction)               │
├─────────────────────────────────────────────────────────────┤
│ // User clicks "Lumber (+2)"                                │
│ function selectResource(resource: string) {                 │
│   dispatch('resolution', {                                  │
│     isResolved: true,                                       │
│     modifiers: [{ type: 'static', resource, value: 2 }],    │
│     metadata: { selectedResource: resource, amount: 2 }     │
│   });                                                        │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. OutcomeDisplay (event handler)                          │
├─────────────────────────────────────────────────────────────┤
│ function handleComponentResolution(event: CustomEvent) {    │
│   const { modifiers, metadata } = event.detail;             │
│   // Store in resolution data                               │
│   resolutionData.customComponentData = {                    │
│     ...resolutionData.customComponentData,                  │
│     ...metadata                                              │
│   };                                                         │
│   // Update preview display                                 │
│   if (modifiers) {                                          │
│     resolutionState.resourceModifiers = modifiers;          │
│   }                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. User Clicks "Apply Result"                              │
├─────────────────────────────────────────────────────────────┤
│ // OutcomeDisplay dispatches to BaseCheckCard               │
│ dispatch('primary', {                                       │
│   checkId: instance.checkId,                                │
│   resolution: resolutionData  // Includes customComponentData│
│ });                                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. ActionsPhase → PipelineCoordinator                      │
├─────────────────────────────────────────────────────────────┤
│ // Pass resolution data to coordinator                      │
│ pipelineCoordinator.confirmApply(instanceId, resolutionData);│
│                                                              │
│ // Coordinator stores in context                            │
│ context.resolutionData = {                                  │
│   ...context.resolutionData,                                │
│   ...resolutionData                                          │
│ };                                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. UnifiedCheckHandler.executeCheck() (Step 8)             │
├─────────────────────────────────────────────────────────────┤
│ // Call onComplete with user's selection                    │
│ if (pipeline.postRollInteractions) {                        │
│   for (const interaction of pipeline.postRollInteractions) {│
│     if (interaction.onComplete && customComponentData) {    │
│       await interaction.onComplete(                         │
│         customComponentData,  // { selectedResource, amount }│
│         context                                              │
│       );                                                     │
│     }                                                        │
│   }                                                          │
│ }                                                            │
│                                                              │
│ // Then call pipeline.execute()                             │
│ await pipeline.execute(context);                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Pipeline Execute (harvest-resources.ts)                 │
├─────────────────────────────────────────────────────────────┤
│ execute: async (ctx) => {                                   │
│   // Resources already applied by onComplete handler!       │
│   console.log('✅ Resources harvested via onComplete');     │
│   return { success: true };                                 │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation Example: ResourceChoiceSelector

**File:** `src/view/kingdom/components/OutcomeDisplay/components/ResourceChoiceSelector.svelte`

```typescript
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CustomComponentProps } from '../../../../types/CustomComponentInterface';
  
  // Standard props
  export let instance: CustomComponentProps['instance'] = null;
  export let outcome: CustomComponentProps['outcome'];
  export let config: CustomComponentProps['config'] = {};
  
  const dispatch = createEventDispatcher();
  
  // Component-specific logic
  const amount = outcome === 'criticalSuccess' ? 4 : 2;
  const resources = ['food', 'lumber', 'stone', 'ore'];
  
  function selectResource(resource: string) {
    // Emit standard resolution event
    dispatch('resolution', {
      isResolved: true,
      modifiers: [{ 
        type: 'static', 
        resource, 
        value: amount 
      }],
      metadata: { 
        selectedResource: resource, 
        amount 
      }
    });
  }
</script>

<div class="resource-choice">
  <p>Choose a resource to harvest:</p>
  {#each resources as resource}
    <button on:click={() => selectResource(resource)}>
      {resource} (+{amount})
    </button>
  {/each}
</div>
```

#### Pipeline Integration Pattern

**Define in pipeline (src/pipelines/actions/harvestResources.ts):**

```typescript
import ResourceChoiceSelector from '../../view/kingdom/components/OutcomeDisplay/components/ResourceChoiceSelector.svelte';

export const harvestResourcesPipeline: CheckPipeline = {
  id: 'harvest-resources',
  name: 'Harvest Resources',
  checkType: 'action',
  
  postRollInteractions: [{
    type: 'configuration',
    id: 'resourceSelection',
    component: ResourceChoiceSelector,  // Svelte component class
    
    // Only show on success/crit success
    condition: (ctx) => 
      ctx.outcome === 'success' || 
      ctx.outcome === 'criticalSuccess',
    
    // Apply user's selection
    onComplete: async (data, context) => {
      const { selectedResource, amount } = data;
      
      // Apply resource change
      await applyResourceChanges([{
        resource: selectedResource,
        value: amount
      }]);
      
      console.log(`✅ Harvested ${amount} ${selectedResource}`);
    }
  }],
  
  execute: async (ctx) => {
    // Resources already applied by onComplete!
    return { success: true };
  }
};
```

#### Key Benefits

✅ **Type Safety** - Standardized interface prevents runtime errors  
✅ **Reusability** - Components work with any action  
✅ **Testability** - Components are pure UI, easy to test  
✅ **HMR Compatible** - Proxy wrapper stripped automatically  
✅ **Maintainability** - Single pattern for all custom interactions  

#### Common Mistakes to Avoid

❌ **Storing component CLASS in actor flags**
```typescript
// WRONG - Classes can't be serialized
preview.component = ResourceChoiceSelector;
```

✅ **Store component NAME (string) instead**
```typescript
// CORRECT - Names are strings, serializable
preview.componentName = 'ResourceChoiceSelector';
```

❌ **Using custom event names**
```typescript
// WRONG - OutcomeDisplay won't capture this
dispatch('customEvent', { ... });
```

✅ **Use standard 'resolution' event**
```typescript
// CORRECT - OutcomeDisplay listens for this
dispatch('resolution', { isResolved: true, ... });
```

❌ **Forgetting to check condition**
```typescript
// WRONG - Component shown on all outcomes
postRollInteractions: [{
  component: ResourceChoiceSelector
  // Missing condition!
}]
```

✅ **Always define outcome condition**
```typescript
// CORRECT - Only show on success
postRollInteractions: [{
  component: ResourceChoiceSelector,
  condition: (ctx) => ctx.outcome === 'success'
}]
```

### 6. Conditional Step Execution

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

### 6. Error Handling (Roll Forward)

**Centralized try/catch with "roll forward" philosophy:**

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
    
    // Roll forward: Mark pipeline as failed but DON'T undo changes
    // This preserves state for debugging and maintains optimistic progression
    await updateKingdom(kingdom => {
      const preview = kingdom.pendingOutcomes.find(p => p.previewId === context.previewId);
      if (preview) {
        preview.status = 'failed';
        preview.error = error.message;
        if (preview.pipelineState) {
          preview.pipelineState.currentStep = -1;  // Mark as failed
        }
      }
    });
    
    throw error;
  }
}
```

**No Rollback Philosophy:**
- Failed pipelines stay visible for debugging
- Partial state changes are preserved (optimistic progression)
- GM can manually fix issues if needed
- Errors are logged with full context for investigation

---

## Advanced Features

### 7. State Persistence Strategy

**Problem:** Paused contexts stored in memory are lost on page refresh/tab switch.

**Solution:** Store pipeline execution state in `kingdom.pendingOutcomes` (already persisted by Foundry).

**Updated OutcomePreview Structure:**

```typescript
interface OutcomePreview {
  // Existing fields (already persisted)
  previewId: string;
  checkType: 'action' | 'event' | 'incident';
  checkId: string;
  status: 'pending' | 'resolved' | 'applied' | 'failed';
  
  // ADD: Pipeline execution state (NEW)
  pipelineState?: {
    currentStep: number;           // Which step (1-9) we're at
    pausedAt: 'roll' | 'apply';    // Where we're waiting
    rollData?: RollData;            // Step 3 results
    metadata?: CheckMetadata;       // Step 2 data
    resolutionData?: ResolutionData; // Step 7 data
  };
  
  // Error tracking
  error?: string;                   // Error message if status = 'failed'
}
```

**Implementation:**

```typescript
// Store state at each step transition
private async updatePipelineState(ctx: PipelineContext, step: number, pausedAt?: 'roll' | 'apply') {
  await updateKingdom(kingdom => {
    const preview = kingdom.pendingOutcomes.find(p => p.previewId === ctx.previewId);
    if (preview) {
      if (!preview.pipelineState) {
        preview.pipelineState = { currentStep: step };
      } else {
        preview.pipelineState.currentStep = step;
      }
      
      if (pausedAt) preview.pipelineState.pausedAt = pausedAt;
      if (ctx.rollData) preview.pipelineState.rollData = ctx.rollData;
      if (ctx.metadata) preview.pipelineState.metadata = ctx.metadata;
      if (ctx.resolutionData) preview.pipelineState.resolutionData = ctx.resolutionData;
    }
  });
}

// Resume from persisted state
async resumeFromPersistedState(previewId: string): Promise<void> {
  const kingdom = getKingdom();
  const preview = kingdom.pendingOutcomes.find(p => p.previewId === previewId);
  
  if (!preview?.pipelineState) {
    throw new Error('No persisted state found');
  }
  
  // Reconstruct context from persisted state
  const ctx = this.reconstructContext(preview);
  
  // Resume from saved step
  const step = preview.pipelineState.currentStep;
  if (preview.pipelineState.pausedAt === 'roll') {
    // Waiting for roll callback - can't resume automatically
    console.log('Pipeline paused at roll, waiting for callback');
  } else if (preview.pipelineState.pausedAt === 'apply') {
    // User can click Apply to continue
    this.pendingContexts.set(previewId, ctx);
  }
}
```

**Benefits:**
- ✅ Survives page refresh
- ✅ Syncs across all clients (GM sees player actions)
- ✅ Can resume from any step
- ✅ Full audit trail

**Storage Cost:** Minimal (~1-2KB per pipeline, max ~12KB for 6 clients)

### 8. Concurrency Control (Queue + Lock)

**Problem:** Multiple clients submitting actions simultaneously causes race conditions.

**Solution:** FIFO queue with lock held until completion (no release on pause).

**Data Structure:**

```typescript
interface KingdomData {
  // ... existing fields
  
  // NEW: Pipeline queue and lock
  pipelineQueue: QueuedPipeline[];
  currentPipelineId: string | null;  // Acts as lock
}

interface QueuedPipeline {
  queueId: string;
  checkType: 'action' | 'event' | 'incident';
  checkId: string;
  userId: string;
  queuedAt: number;
  status: 'queued' | 'executing' | 'paused' | 'completed';
}
```

**Implementation:**

```typescript
class PipelineCoordinator {
  async executePipeline(actionId: string, ctx: Partial<PipelineContext>) {
    // 1. Enqueue
    const queueId = await this.enqueue(actionId, ctx.userId);
    
    // 2. Wait for turn (poll until we're first in queue)
    await this.waitForTurn(queueId);
    
    // 3. Acquire lock (mark as executing)
    await this.acquireLock(queueId);
    
    try {
      // 4. Execute ALL steps (1-9), lock held throughout
      await this.runSteps(ctx);
      // Steps pause at Step 3 (roll callback) and Step 6 (apply button)
      // Lock STAYS acquired during these pauses
      
    } finally {
      // 5. Release lock ONLY when fully complete or failed
      await this.releaseLock(queueId);
      await this.processNextInQueue();
    }
  }
  
  private async waitForTurn(queueId: string) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const kingdom = getKingdom();
        const isMyTurn = kingdom.pipelineQueue[0]?.queueId === queueId;
        const noActivePipeline = !kingdom.currentPipelineId;
        
        if (isMyTurn && noActivePipeline) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100); // Check every 100ms
    });
  }
  
  private async acquireLock(queueId: string) {
    await updateKingdom(kingdom => {
      kingdom.currentPipelineId = queueId;
    });
  }
  
  private async releaseLock(queueId: string) {
    await updateKingdom(kingdom => {
      if (kingdom.currentPipelineId === queueId) {
        kingdom.currentPipelineId = null;
      }
      
      // Mark as completed in queue
      const queued = kingdom.pipelineQueue.find(q => q.queueId === queueId);
      if (queued) {
        queued.status = 'completed';
      }
    });
  }
}
```

**Benefits:**
- ✅ FIFO queue (fair ordering)
- ✅ Only one pipeline executes at a time (no race conditions)
- ✅ Lock held during pauses (no mid-execution interruptions)
- ✅ Simple to implement

**Tradeoff:** If Player A pauses for 5 minutes, Player B waits (acceptable for max 6 clients)

### 9. Event Ignore Flow

**Events can be ignored, which applies the failure outcome without rolling.**

**Updated Step 1 (Requirements Check):**

```typescript
/**
 * Step 1: checkRequirements()
 * 
 * EVENTS ONLY: Skip Step (Ignore Event)
 * 
 * Events can be ignored, which skips the roll and applies failure outcome:
 * 
 * - Beneficial events: Auto-apply failure outcome immediately (resolveEvent with isIgnored=true)
 * - Dangerous events: Create pending outcome with failure preview, wait for Apply
 * - Ignore doesn't count as player action (no tracking)
 * 
 * This is handled OUTSIDE the normal 9-step flow (separate code path).
 */
private async step1_checkRequirements(ctx: PipelineContext): Promise<void> {
  // ... existing requirements logic
}
```

**Ignore Implementation (Separate from Pipeline):**

```typescript
// EventPhaseController.ignoreEvent()
async ignoreEvent(eventId: string) {
  const event = eventService.getEventById(eventId);
  const isBeneficial = event.traits?.includes('beneficial');
  const isDangerous = event.traits?.includes('dangerous');
  
  if (isBeneficial && !isDangerous) {
    // Auto-apply failure immediately (bypass pipeline)
    await this.resolveEvent(eventId, 'failure', {
      numericModifiers: [],
      manualEffects: [],
      complexActions: []
    }, true); // isIgnored = true
  } else if (isDangerous) {
    // Create pending outcome with failure preview
    await outcomePreviewService.createInstance('event', eventId, event, currentTurn);
    // Wait for user to Apply (enters pipeline at Step 6)
  } else {
    // Neither beneficial nor dangerous - just clear
    await clearCurrentEvent(eventId);
  }
}
```

**Key Differences:**
- Beneficial events skip Steps 1-6 (direct to execute)
- Dangerous events skip Steps 1-5 (start at Step 6: Wait For Apply)
- Non-beneficial/non-dangerous skip all steps (just clear)

### 10. Testing Strategy

**Goal:** Validate all 100+ actions/events/incidents with 4 outcomes each (~400 tests).

**Automated Smoke Tests:**

```typescript
// test/pipeline-smoke-tests.ts
async function runSmokeTests() {
  const outcomes = [
    { name: 'Critical Success', dc: 10, roll: 30 },  // Always crit success
    { name: 'Success', dc: 15, roll: 20 },           // Always success
    { name: 'Failure', dc: 20, roll: 10 },           // Always failure
    { name: 'Critical Failure', dc: 15, roll: 1 }    // Natural 1 = crit fail
  ];
  
  const results = [];
  
  // Test all actions × 4 outcomes = ~100 × 4 = 400 tests
  for (const actionId of ALL_ACTION_IDS) {
    for (const outcome of outcomes) {
      try {
        const coordinator = new PipelineCoordinator();
        const ctx = await coordinator.executePipeline(actionId, {
          userId: 'test-user',
          actor: { selectedSkill: 'politics' },
          skipInteractions: true,  // Auto-fill choices with defaults
          mockRoll: { 
            dc: outcome.dc, 
            total: outcome.roll,
            outcome: calculateOutcome(outcome.roll, outcome.dc)
          }
        });
        
        results.push({ 
          actionId, 
          outcome: outcome.name,
          status: 'PASS', 
          error: null 
        });
      } catch (error) {
        results.push({ 
          actionId, 
          outcome: outcome.name,
          status: 'FAIL', 
          error: error.message 
        });
      }
    }
  }
  
  // Print report grouped by outcome
  console.log('=== CRITICAL SUCCESS ===');
  console.table(results.filter(r => r.outcome === 'Critical Success'));
  
  console.log('=== SUCCESS ===');
  console.table(results.filter(r => r.outcome === 'Success'));
  
  console.log('=== FAILURE ===');
  console.table(results.filter(r => r.outcome === 'Failure'));
  
  console.log('=== CRITICAL FAILURE ===');
  console.table(results.filter(r => r.outcome === 'Critical Failure'));
  
  return results;
}
```

**What This Catches:**
- ✅ Missing `specialEffects: []` in PreviewData
- ✅ Undefined function calls
- ✅ Type errors
- ✅ Invalid JSON references
- ✅ All 4 outcome code paths validated

**Effort:** 1-2 hours to set up, runs in ~10-20 seconds

**Manual Acceptance Tests (Supplement):**

Test representative examples manually:
- Actions: Simple action, pre-roll interactions, post-apply interactions, dice modifiers
- Events: Beneficial (ignore), dangerous (ignore), ongoing, immediate
- Incidents: Minor, moderate, major

**Effort:** ~2-3 hours for 15-20 cases

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
