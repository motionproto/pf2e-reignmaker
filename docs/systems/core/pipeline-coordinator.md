# Pipeline Coordinator

The `PipelineCoordinator` is the single entry point for **all check execution** - actions, events, and incidents. It orchestrates a 9-step pipeline that handles everything from pre-roll interactions to cleanup.

> **📖 For Implementation:** This document covers the architecture and design. For practical implementation patterns, see:
> - **[pipeline-patterns.md](./pipeline-patterns.md)** - Pattern lookup with code examples
> - **[../../refactoring/DEBUGGING_GUIDE.md](../../refactoring/DEBUGGING_GUIDE.md)** - Common issues & solutions
> - **[../../refactoring/TESTING_GUIDE.md](../../refactoring/TESTING_GUIDE.md)** - Testing workflows

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  PipelineCoordinator                     │
│  (Single entry point for actions, events, incidents)    │
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

### 1.5. PreviewData Structure

**File:** `src/types/PreviewData.ts`

**Structure:**

```typescript
interface PreviewData {
  resources: ResourceChange[];       // ✅ Required
  entities?: EntityOperation[];      // Optional
  outcomeBadges?: UnifiedOutcomeBadge[];  // Optional - auto-displayed in OutcomeDisplay
  warnings?: string[];               // Optional
}
```

**Example Usage:**

```typescript
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: -2 }],
    outcomeBadges: [{
      icon: 'fa-shield',
      prefix: 'Reduce',
      value: { type: 'static', amount: 2 },
      suffix: 'unrest',
      variant: 'positive'
    }],
    warnings: []
  })
}
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

**Note:** The PipelineCoordinator automatically converts JSON modifiers to badges, so custom preview calculation is only needed for special display logic.

**Static Preview Badges (New in 2025-01):**

Pipelines can also define static preview badges in the `outcomes` section that appear in the "Possible Outcomes" display before any roll:

```typescript
import { textBadge } from '../../types/OutcomeBadge';

export const myPipeline: CheckPipeline = {
  outcomes: {
    criticalFailure: {
      description: 'Major bandit raids devastate the area.',
      modifiers: [...],
      outcomeBadges: [
        textBadge('1 random worksite destroyed', 'fa-hammer-war', 'negative')
      ]
    }
  },
  preview: {
    calculate: (ctx) => {
      // Returns dynamic badges after rolling
      // Can be combined with static badges from outcomes
    }
  }
};
```

**Badge Flow:**
1. **Before Roll:** `buildPossibleOutcomes()` extracts `outcomeBadges` from `outcomes` → displayed in check card
2. **After Roll:** `preview.calculate()` returns dynamic badges → combined with static badges in outcome display

See `docs/systems/core/pipeline-patterns.md` for complete preview badges documentation.

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
- Get modifiers from `KingdomModifierService`
- Handle reroll modifier restoration via `RollStateService`
- Execute PF2e skill check via `PF2eSkillService.executeSkillRoll()`
- Callback stores modifiers and resumes pipeline
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
- **Apply button disabled** until all interactions resolved (dice rolled, components selected, choices made)

**Step 6: waitForApply()**
- Wait for user to click "Apply Result" button
- Button automatically disabled until all Step 5 interactions are resolved
- Pause/resume pattern (see below)
- Always runs

**Step 7: postApplyInteractions()**
- Execute interactions AFTER apply clicked
- Examples: select hexes on map, allocate resources
- Optional - skip if no post-apply interactions

**Step 8: executeAction()**

**Execute-First Pattern:** Modifiers are applied automatically BEFORE custom execute runs.

1. `applyDefaultModifiers()` runs FIRST:
   - Fame +1 for all critical successes
   - Pre-rolled dice modifiers from `resolutionData.numericModifiers`
   - Static JSON modifiers (if no pre-rolled values)
   - All use GameCommandsService (includes shortfall detection)

2. Custom `execute()` runs SECOND (if defined):
   - Only implements custom game logic
   - Can call `applyNumericModifiers()` for dynamic costs
   - Can call `applyOutcome()` for complex scenarios with rich tracking

3. Default path (if no custom execute):
   - Execute game commands (actions only)
   - Handle persistence (events/incidents only)

**Opt-Out:** Set `skipDefaultModifiers: true` on pipeline to skip step 1 (unused).

Always runs.

**Step 9: cleanup()**
- Delete OutcomePreview from kingdom.pendingOutcomes
- Track action in log
- Always runs

**Execution Flow:**

```typescript
async function handleAction(actionId) {
  const coordinator = new PipelineCoordinator();
  const context = await coordinator.executePipeline(actionId, {
    userId: currentUserId,
    actor: { selectedSkill: 'survival' }
  });
  
  // All 9 steps executed with persistent context
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

**Solution:** Use modular services with callback that resumes pipeline at Step 4

**Service Flow:**
```
1. KingdomModifierService.getModifiersForCheck() → Get kingdom modifiers
2. RollStateService.getRollModifiers() → Restore modifiers (if reroll)
3. KingdomModifierService.hasKeepHigherAid() → Check for keep-higher
4. PF2eSkillService.executeSkillRoll() → Execute PF2e roll
5. Callback → Store modifiers & resume pipeline
```

```typescript
private async step3_executeRoll(ctx: PipelineContext): Promise<void> {
  log(ctx, 3, 'executeRoll', 'Executing skill check');
  
  // 1. Get modifiers from KingdomModifierService
  const modifiers = kingdomModifierService.getModifiersForCheck({
    skillName,
    actionId: ctx.actionId,
    checkType: ctx.checkType,
    onlySettlementId: ctx.metadata?.onlySettlementId
  });
  
  // 2. Handle reroll - restore from RollStateService
  if (isReroll && ctx.instanceId) {
    const storedModifiers = await rollStateService.getRollModifiers(
      ctx.instanceId, 
      currentTurn
    );
    // Merge stored modifiers with fresh kingdom modifiers...
  }
  
  // 3. Check for keep-higher aid
  const useKeepHigher = kingdomModifierService.hasKeepHigherAid(
    ctx.actionId, 
    ctx.checkType
  );
  
  // 4. CREATE CALLBACK that stores modifiers and resumes pipeline
  const callback: CheckRollCallback = async (roll, outcome, message, event) => {
    // Extract modifiers from PF2e message
    const rollModifiers = message.flags.pf2e.modifiers
      .filter(mod => mod.type !== 'ability' && mod.type !== 'proficiency');
    
    // Store modifiers for reroll (initial roll only)
    if (!isReroll && ctx.instanceId) {
      await rollStateService.storeRollModifiers(
        ctx.instanceId,
        currentTurn,
        ctx.actionId,
        rollModifiers.map(mod => fromPF2eModifier(mod))
      );
    }
    
    // Update context with roll data
    ctx.rollData = { skill: skillName, dc, roll, outcome, rollBreakdown: {...} };
    
    // Resume pipeline at Step 4
    await this.resumeAfterRoll(ctx);
  };
  
  // 5. Execute roll via PF2eSkillService
  await pf2eSkillService.executeSkillRoll({
    actor: actingCharacter,
    skill,
    dc,
    label: `Kingdom Action: ${pipeline.name}`,
    modifiers,
    rollTwice: useKeepHigher ? 'keep-higher' : false,
    callback
  });
  
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
  instance: OutcomePreview | null;  // Outcome preview data
  outcome: string;                   // Roll outcome
  config?: Record<string, any>;     // Component-specific config
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

### 7. Reroll Modifier Persistence System

**Problem:** When players use fame to reroll, modifiers from the original roll need to be preserved and reapplied to the new roll.

**Challenge:** Modifiers must survive:
- Tab switches
- Page refreshes
- Multi-client environments (synced to all players)

**Solution:** Use `RollStateService` to store modifiers in `kingdom.turnState.actionsPhase.actionInstances` (persistent in KingdomActor).

#### Service Architecture

**Services involved:**
- `KingdomModifierService` - Collects kingdom modifiers (structures, aids, unrest)
- `RollStateService` - Stores/retrieves modifiers for rerolls
- `PF2eSkillService` - Executes the PF2e roll

#### Storage Structure

**Location:** `src/models/TurnState.ts`

```typescript
interface ActionInstance {
  instanceId: string;           // Check instance ID
  actionId: string;             // Action ID
  turnNumber: number;           // Turn when stored (for validation)
  rollModifiers: RollModifier[]; // Modifiers from the roll
  timestamp: number;            // When the roll was made
}

interface RollModifier {
  label: string;
  value: number;
  type: ModifierType;  // 'circumstance' | 'item' | 'status' | 'untyped'
  enabled: boolean;
  ignored: boolean;
  source?: string;     // 'structure', 'aid', 'unrest', 'custom'
}
```

**Storage Location:** `kingdom.turnState.actionsPhase.actionInstances[instanceId]`

#### Data Flow: Initial Roll → Storage

**Step 3 Callback (PipelineCoordinator):**

```typescript
private async step3_executeRoll(ctx: PipelineContext): Promise<void> {
  // 1. Get modifiers from KingdomModifierService
  const modifiers = kingdomModifierService.getModifiersForCheck({
    skillName,
    actionId: ctx.actionId,
    checkType: ctx.checkType
  });
  
  // 2. Create callback that stores modifiers
  const callback: CheckRollCallback = async (roll, outcome, message, event) => {
    // Extract modifiers from PF2e message flags
    const rollModifiers = message.flags.pf2e.modifiers
      .filter(mod => mod.type !== 'ability' && mod.type !== 'proficiency');
    
    // Store modifiers via RollStateService (initial roll only)
    if (!isReroll && ctx.instanceId && rollModifiers.length > 0) {
      await rollStateService.storeRollModifiers(
        ctx.instanceId,
        currentTurn,
        ctx.actionId,
        rollModifiers.map(mod => fromPF2eModifier(mod))
      );
      console.log('💾 Stored modifiers via RollStateService');
    }
    
    // Continue pipeline...
    await this.resumeAfterRoll(ctx);
  };
  
  // 3. Execute roll
  await pf2eSkillService.executeSkillRoll({
    actor, skill, dc, label, modifiers, callback
  });
}
```

#### Data Flow: Reroll Detection → Application

**Reroll Detection and Modifier Restoration (PipelineCoordinator Step 3):**

```typescript
private async step3_executeRoll(ctx: PipelineContext): Promise<void> {
  // 1. Get fresh kingdom modifiers
  const modifiers = kingdomModifierService.getModifiersForCheck({
    skillName,
    actionId: ctx.actionId,
    checkType: ctx.checkType
  });
  
  // 2. Reroll detection: ctx.isReroll is set by rerollFromStep3()
  const isReroll = ctx.isReroll || false;
  
  // 3. Restore modifiers from RollStateService (reroll only)
  if (isReroll && ctx.instanceId) {
    const storedModifiers = await rollStateService.getRollModifiers(
      ctx.instanceId, 
      currentTurn
    );
    
    if (storedModifiers && storedModifiers.length > 0) {
      const matchedLabels = new Set<string>();
      
      // Enable matching kingdom modifiers
      for (const mod of modifiers) {
        const storedMod = storedModifiers.find(m => m.label === mod.label);
        if (storedMod) {
          mod.enabled = true;
          mod.ignored = false;
          matchedLabels.add(storedMod.label);
        }
      }
      
      // Add unmatched stored modifiers (custom modifiers)
      for (const storedMod of storedModifiers) {
        if (!matchedLabels.has(storedMod.label)) {
          modifiers.push({
            label: storedMod.label,
            value: storedMod.value,
            type: storedMod.type || 'circumstance',
            enabled: true,
            ignored: false
          });
        }
      }
      
      console.log(`🔄 Restored ${storedModifiers.length} modifiers`);
    }
  }
  
  // 4. Execute roll with restored modifiers
  await pf2eSkillService.executeSkillRoll({
    actor, skill, dc, label, modifiers, callback
  });
}
```

#### Reroll Trigger Flow

**User clicks "Reroll with Fame" in OutcomeDisplay:**

```
1. User clicks "Reroll with Fame" in OutcomeDisplay
   ↓
2. OutcomeDisplay.handleReroll() deducts fame
   ↓
3. Call PipelineCoordinator.rerollFromStep3(instanceId)
   ↓
4. PipelineCoordinator marks ctx.isReroll = true
   ↓
5. Clear old instance (removes from pendingOutcomes)
   ↓
6. Re-execute Step 3 with existing context
   ↓
7. KingdomModifierService.getModifiersForCheck() gets fresh modifiers
   ↓
8. RollStateService.getRollModifiers() loads stored modifiers
   ↓
9. Merge stored modifiers with fresh kingdom modifiers
   ↓
10. PF2eSkillService.executeSkillRoll() executes with restored modifiers
```

#### Cleanup Strategy

**Automatic Cleanup at Turn Boundaries:**

```typescript
// TurnManager.nextTurn()
async nextTurn(): Promise<void> {
  // ... advance turn ...
  
  // Reset turnState (includes actionInstances)
  const { createDefaultTurnState } = await import('../models/TurnState');
  await updateKingdom(kingdom => {
    kingdom.turnState = createDefaultTurnState(kingdom.currentTurn);
    // actionInstances automatically cleared (no history bloat)
  });
}
```

**Default State Factory:**

```typescript
// src/models/TurnState.ts
export function createDefaultTurnState(turnNumber: number): TurnState {
  return {
    // ...
    actionsPhase: {
      completed: false,
      activeAids: [],
      deployedArmyIds: [],
      factionsAidedThisTurn: [],
      actionInstances: {}  // ← Empty object (no history)
    }
  };
}
```

#### Benefits

✅ **Persistent** - Survives tab switches and page refreshes  
✅ **Multi-client** - Syncs across all clients via KingdomActor  
✅ **Automatic cleanup** - Cleared at turn boundaries (no bloat)  
✅ **Centralized detection** - One check point in PipelineCoordinator  
✅ **Type-safe** - Full TypeScript support via TurnState interface  

#### Key Design Decisions

**Why metadata-based detection?**
- Metadata is ONLY present on rerolls (preserved from previous execution)
- Reliable heuristic (no false positives)
- Works for actions, events, AND incidents (universal)

**Why kingdom.turnState instead of module-level variable?**
- Module-level state lost on page refresh
- Doesn't sync to other clients
- No persistence across sessions

**Why clear after applying?**
- Prevents accidental reuse on next action
- Keeps state clean
- Forces explicit reroll intent

**Why filter ability/proficiency modifiers?**
- Character stats shouldn't persist across characters
- Kingdom modifiers are action-specific (settlements, aids, unrest)
- User can still add custom modifiers in dialog

### 8. State Persistence Strategy

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
- ✅ Missing required properties in PreviewData
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

- [x] Unified to `OutcomePreview` type
- [x] Renamed `pendingOutcomes` storage
- [x] Renamed `previewId` identifier
- [x] Update all documentation
- [x] Build verified successful

## Benefits

### For Developers

✅ **Single code path** - All actions use the same pipeline  
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

### Implementation Guides (refactoring/)
- **[pipeline-patterns.md](./pipeline-patterns.md)** ⭐ Pattern reference with code examples
- **[../../refactoring/DEBUGGING_GUIDE.md](../../refactoring/DEBUGGING_GUIDE.md)** ⭐ Common issues & solutions from real testing
- **[../../refactoring/TESTING_GUIDE.md](../../refactoring/TESTING_GUIDE.md)** - Systematic testing workflows
- **[../../refactoring/INCIDENT_PIPELINE_AUDIT.md](../../refactoring/INCIDENT_PIPELINE_AUDIT.md)** - Incident architecture analysis

### Core Architecture (systems/core/)
- **[check-type-differences.md](./check-type-differences.md)** - Events vs Incidents vs Actions
- **[outcome-display-system.md](./outcome-display-system.md)** - Universal outcome renderer
- **[apply-button-validation.md](./apply-button-validation.md)** - Apply button validation for post-roll interactions
- **[typed-modifiers-system.md](./typed-modifiers-system.md)** - Resource modification system
- **[game-commands-system.md](./game-commands-system.md)** - Non-resource effects

---

## Quick Navigation

**Need to implement an action?**
1. Start here → Understand the 9-step flow (this document)
2. Find your pattern → [pipeline-patterns.md](./pipeline-patterns.md)
3. Copy structure from example action in `src/pipelines/actions/`
4. Test → [../../refactoring/TESTING_GUIDE.md](../../refactoring/TESTING_GUIDE.md)

**Debugging an issue?**
1. Check [../../refactoring/DEBUGGING_GUIDE.md](../../refactoring/DEBUGGING_GUIDE.md) first
2. Full browser refresh (Ctrl+Shift+R)
3. Watch console logs for pipeline steps

---

**Status:** ✅ Production Ready  
**Last Updated:** 2025-11-30
