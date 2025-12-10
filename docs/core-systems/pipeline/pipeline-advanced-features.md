# Pipeline Advanced Features

**Purpose:** Deep dives into advanced pipeline capabilities for complex actions

**Last Updated:** 2025-12-10

---

## Table of Contents

1. [Custom Component Integration](#custom-component-integration)
2. [Reroll Modifier System](#reroll-modifier-system)
3. [State Persistence Strategy](#state-persistence-strategy)
4. [Error Handling](#error-handling)

---

## Custom Component Integration

**Purpose:** Allow actions to inject interactive UI components inline in OutcomeDisplay for user input after rolling.

**Use Cases:**
- **harvest-resources** - Select which resource to harvest (Food/Lumber/Stone/Ore)
- **sell-surplus** - Select which resource to sell
- **purchase-resources** - Select which resource to buy
- **outfit-army** - Select equipment options
- **Any action needing post-roll user choices**

### Custom Component Interface

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

### Component Registration Pattern

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

### Data Flow (Complete Path)

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

### Implementation Example: ResourceChoiceSelector

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
  {/each}</div>
```

### Pipeline Integration Pattern

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

### Key Benefits

✅ **Type Safety** - Standardized interface prevents runtime errors  
✅ **Reusability** - Components work with any action  
✅ **Testability** - Components are pure UI, easy to test  
✅ **HMR Compatible** - Proxy wrapper stripped automatically  
✅ **Maintainability** - Single pattern for all custom interactions  

### Common Mistakes to Avoid

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

---

## Reroll Modifier System

**See:** [ROLL_FLOW.md](./ROLL_FLOW.md) for complete reroll documentation

**Summary:** When players use fame to reroll, modifiers from the original roll are stored in `kingdom.turnState.actionsPhase.actionInstances` and restored for the new roll.

**Key Services:**
- `KingdomModifierService` - Collects kingdom modifiers
- `RollStateService` - Stores/retrieves modifiers for rerolls
- `PF2eSkillService` - Executes the PF2e roll

**Storage Location:** `kingdom.turnState.actionsPhase.actionInstances[instanceId]`

**Cleanup:** Automatic at turn boundaries (no bloat)

---

## State Persistence Strategy

**Challenge:** Paused contexts stored in memory are lost on page refresh/tab switch.

**Solution:** Store pipeline execution state in `kingdom.pendingOutcomes` (already persisted by Foundry).

**OutcomePreview Structure:**

```typescript
interface OutcomePreview {
  // Existing fields (already persisted)
  previewId: string;
  checkType: 'action' | 'event' | 'incident';
  checkId: string;
  status: 'pending' | 'resolved' | 'applied' | 'failed';
  
  // Pipeline execution state
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

**Benefits:**
- ✅ Survives page refresh
- ✅ Syncs across all clients (GM sees player actions)
- ✅ Can resume from any step
- ✅ Full audit trail

---

## Error Handling

### Roll Forward Philosophy

**No Rollback:** Failed pipelines stay visible for debugging, partial state changes are preserved (optimistic progression).

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

**Benefits:**
- Failed pipelines stay visible for debugging
- GM can manually fix issues if needed
- Errors are logged with full context for investigation

---

## Related Documentation

- [pipeline-coordinator.md](./pipeline-coordinator.md) - Core 9-step architecture
- [pipeline-patterns.md](./pipeline-patterns.md) - Implementation patterns
- [ROLL_FLOW.md](./ROLL_FLOW.md) - Roll execution details
- [../../guides/debugging-guide.md](../../guides/debugging-guide.md) - Debugging guide

**Status:** ✅ Production Ready  
**Last Updated:** 2025-12-10
