# Custom UI for Action Resolution: Complete Guide

**Purpose:** Learn when and how to create custom resolution UI components for player actions.

**Last Updated:** 2025-11-08  
**Difficulty:** Intermediate

---

## Table of Contents

1. [When to Use Custom UI](#when-to-use-custom-ui)
2. [The Simple Pattern (Recommended)](#the-simple-pattern-recommended)
3. [The Complex Pattern (Rarely Needed)](#the-complex-pattern-rarely-needed)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Common Pitfalls](#common-pitfalls)
6. [Working Examples](#working-examples)
7. [Troubleshooting](#troubleshooting)

---

## When to Use Custom UI

### Decision Tree

```
Does action need player selection after roll outcome?
├─ No → Use standard modifiers (StaticModifier, DiceModifier)
└─ Yes
   ├─ Simple resource choice? (e.g., "gain 2 food OR lumber")
   │  └─ Use choice-buttons modifier (JSON only, no code)
   │
   ├─ Complex selection? (e.g., allocate unrest across settlements)
   │  └─ Use custom component (this guide)
   │
   └─ Single resource from dropdown?
      └─ Use choice-dropdown modifier (JSON only, no code)
```

### When Custom UI is Needed

✅ **Use custom component when:**
- Multiple inputs needed (e.g., settle allocations across multiple settlements)
- Complex validation (e.g., can't exceed capacity)
- Dynamic options based on kingdom state (e.g., only settlements with prisons)
- Rich visual feedback needed (e.g., capacity bars, previews)

❌ **Don't use custom component when:**
- Simple A/B/C choice → Use `choice-buttons` modifier
- Single resource selection → Use `choice-dropdown` modifier
- No user input needed → Use static/dice modifiers

### Comparison Table

| Pattern | JSON Only? | Example Use Case | Complexity |
|---------|-----------|------------------|------------|
| `choice-buttons` | ✅ Yes | Harvest Resources: "Gain 2 food OR lumber OR stone OR ore" | Low |
| `choice-dropdown` | ✅ Yes | Event: "Gain 1 food OR lumber (minor effect)" | Low |
| Custom Component | ❌ No (code) | Arrest Dissidents: Allocate unrest across settlements with prisons | High |

---

## The Simple Pattern (Recommended)

**Philosophy:** The component knows its own business logic.

### Key Principles

1. **Hardcode data in component** - Don't pass as props unless truly needed
2. **Calculate from outcome** - Use `outcome` prop to determine amounts/options
3. **Self-contained** - Component reads from stores, doesn't depend on external config
4. **Minimal coupling** - Action file only provides component reference

### Architecture

```
Action File (.ts)
├─ Provides: Component reference
└─ Does NOT provide: Props, data, configuration

Component (.svelte)
├─ Hardcodes: Available options (e.g., resources)
├─ Calculates: Amounts from outcome (crit success vs success)
├─ Reads: Kingdom state from stores (if needed)
└─ Emits: Selection event with modifiers
```

### Example: Harvest Resources

**What it does:** Let player choose which resource to harvest (food, lumber, stone, ore)

**Data flow:**
1. Component hardcodes: `['food', 'lumber', 'stone', 'ore']`
2. Component calculates: `amount = outcome === 'criticalSuccess' ? 2 : 1`
3. Player selects resource
4. Component emits modifier: `{ type: 'static', resource: 'food', value: 2 }`

**Action file** (`src/actions/harvest-resources/HarvestResourcesAction.ts`):
```typescript
export const HarvestResourcesAction = {
  id: 'harvest-resources',
  
  customResolution: {
    component: ResourceChoiceSelector,  // Just the component reference
    
    validateData(resolutionData: ResolutionData): boolean {
      return !!(resolutionData.customComponentData?.selectedResource);
    },
    
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      const { selectedResource, amount } = resolutionData.customComponentData || {};
      return createSuccessResult(`Harvested ${amount} ${selectedResource}!`);
    }
  },
  
  needsCustomResolution(outcome): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};
```

**Component** (`ResourceChoiceSelector.svelte`):
```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';
  import { updateInstanceResolutionState } from '../../../../../controllers/shared/ResolutionStateHelpers';
  
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;
  
  const dispatch = createEventDispatcher();
  
  // ✅ HARDCODE data (always the same for this action)
  const resources = ['food', 'lumber', 'stone', 'ore'];
  
  // ✅ CALCULATE from outcome
  $: amount = outcome === 'criticalSuccess' ? 2 : 1;
  
  async function handleSelect(resource: string) {
    if (!instance) return;
    
    // Store in instance state
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { selectedResource: resource, amount }
    });
    
    // Emit selection with modifier format
    dispatch('selection', {
      selectedResource: resource,
      amount: amount,
      modifiers: [{
        type: 'static',
        resource: resource,
        value: amount,
        duration: 'immediate'
      }]
    });
  }
</script>

<div class="resource-selector">
  {#each resources as resource}
    <button on:click={() => handleSelect(resource)}>
      +{amount} {resource}
    </button>
  {/each}
</div>
```

**Key takeaways:**
- ✅ No props needed beyond `instance` and `outcome` (automatically passed)
- ✅ Component owns the resource list
- ✅ Component calculates amount from outcome
- ✅ Simple, self-contained, easy to maintain

---

## The Complex Pattern (Rarely Needed)

**When to use:** Data varies by kingdom state and can't be hardcoded

### Example: Arrest Dissidents

**What it does:** Allocate imprisoned unrest across settlements with prisons

**Why it needs complexity:**
- Available settlements vary (only those with justice structures)
- Capacity varies (depends on structure tier)
- Amount varies (based on outcome and current unrest)

**Component reads from stores:**
```svelte
<script lang="ts">
  import { kingdomData } from '../../../../../stores/KingdomStore';
  
  // Calculate valid settlements from kingdom state
  $: settlementsWithPrisons = $kingdomData.settlements.filter(s => {
    return s.structures.some(st => st.category === 'justice');
  });
  
  $: maxCapacity = calculateTotalCapacity(settlementsWithPrisons);
</script>
```

**Still no props needed!** Component queries stores directly.

---

## Step-by-Step Implementation

### Step 1: Create Component File

**Location:** `src/view/kingdom/components/OutcomeDisplay/components/YourCustomComponent.svelte`

**Template:**
```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';
  import { 
    updateInstanceResolutionState,
    getInstanceResolutionState 
  } from '../../../../../controllers/shared/ResolutionStateHelpers';
  
  // Props (automatically passed by OutcomeDisplay)
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;
  
  const dispatch = createEventDispatcher();
  
  // Hardcode your data
  const options = ['option1', 'option2', 'option3'];
  
  // Calculate from outcome if needed
  $: amount = outcome === 'criticalSuccess' ? 2 : 1;
  
  // Get current selection state
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedOption = resolutionState.customComponentData?.selectedOption || '';
  
  async function handleSelect(option: string) {
    if (!instance) return;
    
    // Store in instance
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { 
        selectedOption: option,
        amount: amount
      }
    });
    
    // Emit selection
    dispatch('selection', {
      selectedOption: option,
      amount: amount,
      modifiers: [{
        type: 'static',
        resource: option,
        value: amount,
        duration: 'immediate'
      }]
    });
  }
</script>

<div class="your-selector">
  <h4>Choose Option</h4>
  
  {#each options as option}
    <button 
      class:selected={selectedOption === option}
      on:click={() => handleSelect(option)}
    >
      +{amount} {option}
    </button>
  {/each}
</div>

<style lang="scss">
  .your-selector {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    padding: 16px;
    margin: 12px 0;
  }
  
  button {
    padding: 12px 16px;
    cursor: pointer;
    
    &.selected {
      background: rgba(34, 197, 94, 0.2);
      border-color: var(--color-green);
    }
  }
</style>
```

### Step 2: Create Action File

**Location:** `src/actions/{action-id}/YourAction.ts`

```typescript
import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import YourCustomComponent from '../../view/kingdom/components/OutcomeDisplay/components/YourCustomComponent.svelte';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';

export const YourAction = {
  id: 'your-action-id',
  
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Add any prerequisites here
    return { met: true };
  },
  
  customResolution: {
    component: YourCustomComponent,
    
    validateData(resolutionData: ResolutionData): boolean {
      // Validate that selection was made
      return !!(resolutionData.customComponentData?.selectedOption);
    },
    
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      logActionStart('your-action-id', 'Applying selection');
      
      try {
        const { selectedOption, amount } = resolutionData.customComponentData || {};
        
        if (!selectedOption) {
          return createErrorResult('No selection was made');
        }
        
        // Resource changes handled automatically by OutcomeDisplay
        // This is just for validation and success message
        
        logActionSuccess('your-action-id', `Applied ${selectedOption}!`);
        return createSuccessResult(`Applied ${amount} ${selectedOption}!`);
        
      } catch (error) {
        logActionError('your-action-id', error as Error);
        return createErrorResult('Failed to apply selection');
      }
    }
  },
  
  needsCustomResolution(outcome): boolean {
    // Specify which outcomes need custom UI
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

export default YourAction;
```

### Step 3: Register Action

**File:** `src/controllers/actions/implementations/index.ts`

```typescript
import YourAction from '../../actions/your-action-id/YourAction';

export const actionImplementations: Record<string, any> = {
  'your-action-id': YourAction,
  // ... other actions
};
```

### Step 4: Test Checklist

- [ ] Component mounts after outcome displayed
- [ ] Options display correctly
- [ ] Selection highlights properly
- [ ] Can change selection freely
- [ ] "Apply" button disabled until selection made
- [ ] Selection data accessible in execute()
- [ ] Resource changes applied correctly
- [ ] Success message displays
- [ ] Component unmounts after application

---

## Common Pitfalls

### ❌ DON'T: Over-engineer with Props

**Wrong approach (what we tried first):**
```typescript
// Action file
customResolution: {
  component: ResourceChoiceSelector,
  
  // ❌ DON'T DO THIS - unnecessary complexity
  getComponentProps(outcome: string): Record<string, any> {
    return {
      resources: ['food', 'lumber', 'stone', 'ore'],
      amount: outcome === 'criticalSuccess' ? 2 : 1
    };
  }
}
```

**Why it's wrong:**
- Adds complexity (OutcomeDisplay must forward props)
- Requires prop declarations in component
- Creates coupling between action and component
- Harder to debug when props don't flow correctly

**Right approach:**
```typescript
// Action file
customResolution: {
  component: ResourceChoiceSelector  // That's it!
}

// Component hardcodes data
const resources = ['food', 'lumber', 'stone', 'ore'];
$: amount = outcome === 'criticalSuccess' ? 2 : 1;
```

### ❌ DON'T: Use when choice-buttons would work

**Wrong:**
```typescript
// Creating custom component for simple A/B choice
customResolution: {
  component: SimpleChoiceComponent
}
```

**Right:**
```json
// Just use choice-buttons modifier in JSON
{
  "modifiers": [{
    "type": "choice-buttons",
    "resources": ["food", "lumber"],
    "value": 2
  }]
}
```

### ❌ DON'T: Forget to emit selection event

**Wrong:**
```typescript
async function handleSelect(option: string) {
  await updateInstanceResolutionState(instance.instanceId, {
    customComponentData: { selectedOption: option }
  });
  // ❌ Forgot to dispatch!
}
```

**Right:**
```typescript
async function handleSelect(option: string) {
  await updateInstanceResolutionState(instance.instanceId, {
    customComponentData: { selectedOption: option }
  });
  
  // ✅ Emit selection event
  dispatch('selection', {
    selectedOption: option,
    modifiers: [{ type: 'static', resource: option, value: 1 }]
  });
}
```

### ✅ DO: Follow ArrestDissidents Pattern

**Study this example:**
```svelte
<script lang="ts">
  import { kingdomData } from '../../../../../stores/KingdomStore';
  
  // ✅ Read from stores, not props
  $: settlementsWithPrisons = $kingdomData.settlements.filter(...);
  
  // ✅ Calculate capacity from kingdom state
  $: maxCapacity = calculateCapacity(settlementsWithPrisons);
  
  // ✅ Self-contained validation
  $: isValid = totalAllocated <= maxCapacity;
</script>
```

### ✅ DO: Keep UI Minimal

**Lessons from Harvest Resources:**
- Remove redundant messages ("Selected: Food")
- Remove unnecessary guidance text
- Rely on visual feedback (highlighting)
- Allow free re-selection until Apply

---

## Working Examples

### Example 1: Harvest Resources (Simple)

**Complexity:** Low  
**Files:** 2 (action + component)  
**LOC:** ~150 total

**Use case:** Choose which resource to harvest

**Key features:**
- Hardcoded resource list
- Amount from outcome
- Clean button layout
- Free re-selection

**Files:**
- `src/actions/harvest-resources/HarvestResourcesAction.ts`
- `src/view/kingdom/components/OutcomeDisplay/components/ResourceChoiceSelector.svelte`

### Example 2: Arrest Dissidents (Complex)

**Complexity:** High  
**Files:** 2 (action + component)  
**LOC:** ~300 total

**Use case:** Allocate imprisoned unrest across settlements with prisons

**Key features:**
- Reads settlements from stores
- Calculates capacity dynamically
- Multiple inputs (sliders per settlement)
- Validation (can't exceed capacity)
- Rich feedback (capacity bars)

**Files:**
- `src/actions/arrest-dissidents/ArrestDissidentsAction.ts`
- `src/view/kingdom/components/OutcomeDisplay/components/ArrestDissidentsResolution.svelte`

---

## Troubleshooting

### Component Not Rendering

**Check:**
1. ✅ Component exported from action's `customResolution.component`?
2. ✅ Action registered in `implementations/index.ts`?
3. ✅ `needsCustomResolution()` returns true for outcome?
4. ✅ No JavaScript errors in console?

**Debug:**
```typescript
// Add logging to action file
needsCustomResolution(outcome): boolean {
  const needs = outcome === 'success' || outcome === 'criticalSuccess';
  console.log(`[YourAction] needsCustomResolution(${outcome}): ${needs}`);
  return needs;
}
```

### Buttons Not Appearing

**Symptom:** Headers render but no interactive controls

**Common causes:**
1. ❌ Resource array is empty (hardcode check)
2. ❌ `{#each}` loop has no items to iterate
3. ❌ CSS hiding buttons (check display/visibility)

**Fix:**
```svelte
<!-- Add debug output -->
<p>Resources: {JSON.stringify(resources)}</p>
<p>Resource count: {resources.length}</p>

{#each resources as resource}
  <button>{resource}</button>
{/each}
```

### Selection Not Applying

**Symptom:** Click button, nothing happens

**Check:**
1. ✅ `instance` prop is not null?
2. ✅ `updateInstanceResolutionState()` called?
3. ✅ `dispatch('selection', ...)` emitted?
4. ✅ Modifiers array in event payload?

**Debug:**
```typescript
async function handleSelect(option: string) {
  console.log('[Component] Selecting:', option);
  console.log('[Component] Instance:', instance);
  
  await updateInstanceResolutionState(...);
  console.log('[Component] Updated instance state');
  
  dispatch('selection', payload);
  console.log('[Component] Dispatched:', payload);
}
```

### "Apply" Button Stays Disabled

**Symptom:** Make selection but can't click Apply

**Check:**
1. ✅ `customComponentData` has required fields?
2. ✅ `validateData()` returns true?
3. ✅ Selection event emitted with modifiers?

**Debug in action file:**
```typescript
validateData(resolutionData: ResolutionData): boolean {
  console.log('[Action] Validating:', resolutionData.customComponentData);
  const valid = !!(resolutionData.customComponentData?.selectedOption);
  console.log('[Action] Valid:', valid);
  return valid;
}
```

---

## Key Takeaways

1. **Start simple** - Hardcode data, calculate from outcome
2. **Avoid props** - Only use if data varies by kingdom state
3. **Follow patterns** - Study Harvest Resources (simple) and Arrest Dissidents (complex)
4. **Use choice-buttons first** - Only create component if truly needed
5. **Keep UI minimal** - Rely on visual feedback, avoid redundant text
6. **Test thoroughly** - Use checklist from Step 4

---

**Related Documentation:**
- [AI Action Guide](../AI_ACTION_GUIDE.md) - Quick reference
- [Action Resolution Flow](../systems/action-resolution-complete-flow.md) - Complete architecture
- [Game Commands System](../systems/game-commands-system.md) - Command integration
- [Typed Modifiers System](../systems/typed-modifiers-system.md) - Modifier patterns

**Need Help?** Check the [Troubleshooting](#troubleshooting) section or review working examples.
