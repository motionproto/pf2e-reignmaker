# Action Implementations

This folder contains custom implementations for kingdom actions that require complex logic, custom UI resolution, or special validation.

## Purpose

Rather than embedding complex action logic directly in controllers or resolvers, we extract it into dedicated implementation files. This provides:

- ✅ **Single Responsibility** - Each action's logic in one file
- ✅ **Easy to Find** - No hunting through switch statements
- ✅ **Testable** - Can test each action independently  
- ✅ **Scalable** - Add new actions without modifying existing code
- ✅ **Maintainable** - Clear separation of concerns

## When to Create an Action Implementation

Create a custom action implementation when:

1. **Custom Requirements** - Action needs validation beyond resource costs
2. **Custom Resolution** - Action requires a custom UI component for player choices
3. **Complex Game Effects** - Action has complex side effects or state changes
4. **Reusable Logic** - Action logic should be isolated and reusable

## Structure

```
implementations/
├── ActionHelpers.ts           # Shared utilities (validation, logging, etc.)
├── ArrestDissidentsAction.ts  # Example implementation
├── index.ts                   # Registry of all implementations
└── README.md                  # This file
```

## Creating a New Action Implementation

### Step 1: Create the Implementation File

Create a new file: `{ActionName}Action.ts`

```typescript
/**
 * {ActionName}Action - Custom implementation for {Action Name}
 * 
 * Brief description of what this action does and why it needs custom logic.
 */

import type { KingdomData } from '../../../actors/KingdomActor';
import type { ActionRequirement } from '../action-resolver';
import type { ResolutionData } from '../../../types/modifiers';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from './ActionHelpers';

export const YourActionNameAction = {
  id: 'your-action-id', // Must match action ID in player-actions JSON
  
  /**
   * Check if action can be performed (optional)
   * Only implement if action has special requirements beyond resource costs
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Your validation logic here
    // Return { met: true } or { met: false, reason: '...' }
  },
  
  /**
   * Custom resolution (optional)
   * Only implement if action needs custom UI component for player choices
   */
  customResolution: {
    component: YourCustomComponent, // Svelte component
    
    validateData(resolutionData: ResolutionData): boolean {
      // Validate resolution data from UI
      return true; // or false if invalid
    },
    
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      logActionStart('your-action-id', 'Processing custom resolution');
      
      try {
        // Your custom resolution logic here
        // Typically calls services to update kingdom state
        
        logActionSuccess('your-action-id', 'Completed');
        return createSuccessResult('Success message');
        
      } catch (error) {
        logActionError('your-action-id', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  /**
   * Determine which outcomes need custom resolution (optional)
   * Only implement if customResolution is present
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    // Return true for outcomes that need custom UI
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

export default YourActionNameAction;
```

### Step 2: Register in index.ts

Add your implementation to the registry:

```typescript
// Import
import YourActionNameAction from './YourActionNameAction';

// Register
actionImplementations.set(YourActionNameAction.id, YourActionNameAction);

// Export
export { YourActionNameAction };
```

### Step 3: That's It!

The system will automatically:
- Use your custom requirements check (if provided)
- Display your custom component (if provided)
- Execute your custom resolution logic (if provided)

## Using ActionHelpers

The `ActionHelpers.ts` file provides shared utilities. Use them to avoid duplication:

### Resource Validation

```typescript
import { hasRequiredResources, formatMissingResources } from './ActionHelpers';

const check = hasRequiredResources(kingdomData, requiredResourcesMap);
if (!check.valid) {
  return {
    met: false,
    reason: `Missing: ${formatMissingResources(check.missing!)}`
  };
}
```

### Settlement Validation

```typescript
import { 
  findSettlementWithCapacity,
  findSettlementById,
  hasSettlementCapacity 
} from './ActionHelpers';

const settlement = findSettlementById(kingdomData, settlementId);
if (!settlement) {
  return createErrorResult('Settlement not found');
}

const capacity = hasSettlementCapacity(settlement);
if (!capacity.hasCapacity) {
  return createErrorResult('Settlement at capacity');
}
```

### Army Validation

```typescript
import { hasAvailableArmies, findArmyById } from './ActionHelpers';

if (!hasAvailableArmies(kingdomData)) {
  return { met: false, reason: 'No armies available' };
}

const army = findArmyById(kingdomData, armyId);
if (!army) {
  return createErrorResult('Army not found');
}
```

### Unrest Management

```typescript
import { 
  hasUnrestToArrest,
  calculateImprisonmentCapacity,
  findSettlementsWithImprisonmentCapacity 
} from './ActionHelpers';

if (!hasUnrestToArrest(kingdomData)) {
  return { met: false, reason: 'No unrest to arrest' };
}

const capacity = calculateImprisonmentCapacity(kingdomData);
if (capacity.available <= 0) {
  return { met: false, reason: 'No imprisonment capacity' };
}

const settlements = findSettlementsWithImprisonmentCapacity(kingdomData);
```

### Logging

```typescript
import { 
  logActionStart, 
  logActionSuccess, 
  logActionError,
  logActionWarning 
} from './ActionHelpers';

logActionStart('action-id', 'Optional details');
logActionSuccess('action-id', 'Optional details');
logActionError('action-id', error);
logActionWarning('action-id', 'Warning message');
```

### Result Builders

```typescript
import { createSuccessResult, createErrorResult } from './ActionHelpers';

// Success with message and data
return createSuccessResult('Action completed', { count: 5 });

// Simple error
return createErrorResult('Action failed');
```

## Integration Points

### ActionResolver

Automatically checks for custom requirements:

```typescript
// In checkActionRequirements()
const customCheck = checkCustomRequirements(action.id, kingdomData);
if (customCheck !== null) {
  return customCheck; // Use custom implementation
}
// Falls back to default checking
```

### ActionPhaseController

Automatically uses custom components and resolution:

```typescript
// In getCustomComponent()
return getCustomResolutionComponent(actionId, outcome);

// In resolveAction()
if (impl?.customResolution && impl.needsCustomResolution?.(outcome)) {
  return await executeCustomResolution(actionId, resolutionData);
}
// Falls back to standard resolution
```

## Example: Arrest Dissidents

See `ArrestDissidentsAction.ts` for a complete example that includes:
- Custom requirements checking (unrest + imprisonment capacity)
- Custom UI component (settlement allocation interface)
- Custom resolution logic (allocating imprisoned unrest to settlements)

## Best Practices

1. **Use ActionHelpers** - Don't duplicate validation logic
2. **Clear Logging** - Use helper functions with consistent emoji indicators
3. **Error Handling** - Always wrap in try/catch, return clear error messages
4. **Type Safety** - Import types from proper locations
5. **Documentation** - Add JSDoc comments explaining complex logic
6. **Single Responsibility** - Each action file handles ONE action only

## Migration Guide

If you find action logic in other files that should be here:

1. Create new implementation file
2. Move logic to appropriate methods
3. Register in index.ts
4. Remove old switch case or inline logic
5. Test thoroughly

## Testing

Test action implementations by:

1. Loading kingdom in Foundry
2. Attempting action with various kingdom states
3. Verifying requirements work correctly
4. Testing all outcome paths (crit success, success, failure, crit fail)
5. Checking custom UI displays correctly
6. Verifying resolution applies changes correctly

## Future Actions to Implement

Consider creating implementations for:
- `execute-or-pardon-prisoners` - Choice between outcomes
- `build-structure` - Could integrate BuildStructureController
- `recruit-army` - Complex level determination
- `establish-settlement` - Hex selection and validation
- `claim-hexes` - Proficiency scaling and hex selection
- Any action with `gameEffects` in player-actions JSON

## Custom Outcome UI - Replacing Default Display

### How Custom Components Replace Standard Outcomes

By default, when a skill check completes, the system shows a standard outcome display:
- Outcome message from action JSON
- List of modifiers to apply
- "Apply Result" button

**Custom components REPLACE this default display for specific outcomes.**

### The Flow

```
1. Skill check completes with outcome (e.g., "success")
   ↓
2. OutcomeDisplay checks: Does this action/outcome need custom UI?
   ↓
3. Calls getCustomResolutionComponent(actionId, outcome)
   ↓
4. Implementation returns component if needsCustomResolution(outcome) === true
   ↓
5. Custom component REPLACES standard display
   ↓
6. User interacts with custom UI (makes choices)
   ↓
7. Custom UI stores choices in instance.resolutionState.customComponentData
   ↓
8. User clicks "Apply Result" (from OutcomeDisplay)
   ↓
9. validateData() checks customComponentData
   ↓
10. execute() runs with the choices
```

### Implementation Pattern

**1. Declare which outcomes need custom UI:**

```typescript
needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
  // Return true for outcomes that should show custom UI
  return outcome === 'success';  // Only success shows custom component
}
```

**2. Provide the custom component:**

```typescript
customResolution: {
  component: YourCustomComponent,  // Svelte component to show
  // ...
}
```

**3. What the user sees:**

❌ **Without custom component (standard display):**
```
Success!
You repaired the structure.

Modifiers:
• No modifiers

[Apply Result]
```

✅ **With custom component (repair cost choice):**
```
Success!
Choose repair cost:

[1d4 Gold - Click to roll] [Half build cost: 2 lumber, 1 stone]

(User makes choice, then clicks Apply Result)
```

### Key Concepts

#### 1. Custom UI is Optional Per Outcome

You can have custom UI for some outcomes but not others:

```typescript
needsCustomResolution(outcome): boolean {
  // Success needs custom UI (cost choice)
  if (outcome === 'success') return true;
  
  // Critical success is automatic (free repair, no UI needed)
  if (outcome === 'criticalSuccess') return false;
  
  // Failures use standard display (just show modifiers)
  return false;
}
```

#### 2. Custom Component Props

Your custom component receives these props:

```svelte
<script lang="ts">
  export let instance: ActiveCheckInstance | null = null;  // Full instance data
  export let outcome: string;                               // The outcome degree
  
  // Access pre-roll data from metadata
  $: structureId = instance?.metadata?.structureId || '';
  
  // Access previous choices (if any)
  $: previousChoice = instance?.resolutionState?.customComponentData?.choice;
</script>
```

#### 3. The Data Contract

**Critical:** What your component stores MUST match what your validation expects!

```typescript
// Component stores this:
await updateInstanceResolutionState(instance.instanceId, {
  customComponentData: {
    structureId: 'prison',
    settlementId: 'settlement-123',
    cost: { gold: 3 }
  }
});

// Validation MUST check for exactly this structure:
validateData(resolutionData: ResolutionData): boolean {
  const data = resolutionData.customComponentData;
  if (!data?.structureId || !data?.settlementId || !data?.cost) {
    return false;  // Missing required data
  }
  return true;
}

// Execute reads the same structure:
async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
  const { structureId, settlementId, cost } = resolutionData.customComponentData;
  // Use the data...
}
```

#### 4. Multiple Outcomes, Different UI

You can show different components for different outcomes:

```typescript
customResolution: {
  component: YourComponent,  // This will be shown for ALL outcomes where needsCustomResolution returns true
  // ...
}

needsCustomResolution(outcome): boolean {
  // Could show different components based on outcome
  return outcome === 'success' || outcome === 'failure';
}
```

**Note:** Currently the system uses ONE component for all custom outcomes. If you need different UI per outcome, you can:
- Have the component check `outcome` prop and render differently
- Use multiple action implementations (less recommended)

### Common Patterns

#### Pattern 1: Choice-Based Resolution

**Use case:** User must choose between options before applying

```typescript
// Example: Choose between two costs
customResolution: {
  component: CostChoiceComponent,
  
  validateData(resolutionData: ResolutionData): boolean {
    // Require user to have made a choice
    return !!resolutionData.customComponentData?.selectedOption;
  },
  
  async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
    const { selectedOption, cost } = resolutionData.customComponentData;
    // Apply based on choice
  }
}
```

#### Pattern 2: Allocation UI

**Use case:** User must allocate/distribute something

```typescript
// Example: Allocate imprisoned unrest to settlements
customResolution: {
  component: AllocationComponent,
  
  validateData(resolutionData: ResolutionData): boolean {
    const allocations = resolutionData.customComponentData?.allocations;
    // Check all unrest is allocated
    return allocations && totalAllocated === unrestAmount;
  },
  
  async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
    const { allocations } = resolutionData.customComponentData;
    // Apply allocations to settlements
  }
}
```

#### Pattern 3: Conditional UI

**Use case:** Only some outcomes need custom UI

```typescript
needsCustomResolution(outcome): boolean {
  // Only success and critical success need UI
  return outcome === 'success' || outcome === 'criticalSuccess';
}

// Component can check outcome and render differently:
<script>
  export let outcome: string;
  
  $: if (outcome === 'criticalSuccess') {
    // Show success message, auto-apply
  } else if (outcome === 'success') {
    // Show choice UI
  }
</script>
```

### Debugging Custom UI

**Problem:** Custom UI not showing

**Check:**
1. Is `needsCustomResolution(outcome)` returning `true`?
2. Is `customResolution.component` defined?
3. Check console for component errors
4. Verify outcome matches what you expect

**Problem:** Validation failing

**Check:**
1. Log `resolutionData.customComponentData` in `validateData()`
2. Verify component is actually storing data
3. Check data structure matches exactly
4. Look for TypeScript type mismatches

**Problem:** Execute not receiving data

**Check:**
1. Validation passed (if validation fails, execute won't run)
2. Log `resolutionData` in `execute()`
3. Check if data is in `customComponentData` or `metadata`

## Lessons Learned from Implementations

### Repair Structure Action - Key Patterns

The repair structure implementation revealed several important patterns for complex actions:

#### 1. Instance Metadata for Pre-Roll Data

**Problem:** Need to pass data from pre-roll dialog (structure selection) to custom resolution component (cost choice).

**Solution:** Store selection in instance metadata during action initiation:

```typescript
// In ActionsPhase.svelte - when creating instance
const metadata = actionId === 'repair-structure' && pendingRepairAction 
  ? { 
      structureId: pendingRepairAction.structureId,
      settlementId: pendingRepairAction.settlementId
    }
  : undefined;

const instanceId = await checkInstanceService.createInstance(
  'action',
  actionId,
  action,
  $currentTurn,
  metadata  // ← Passed here
);
```

**Access in Custom Component:**
```svelte
<!-- RepairCostChoice.svelte -->
<script>
  export let instance: ActiveCheckInstance | null = null;
  
  // Read from metadata
  $: structureId = instance?.metadata?.structureId || '';
  $: settlementId = instance?.metadata?.settlementId || '';
</script>
```

#### 2. Validation Must Match What UI Provides

**Problem:** Validation failed because it required data that wasn't stored yet.

**Solution:** Understand the data flow and validate what's actually available:

```typescript
validateData(resolutionData: ResolutionData): boolean {
  const data = resolutionData.customComponentData;
  
  // ✅ Require what the UI stores
  if (data?.structureId && data?.settlementId && data?.cost) {
    // Validate affordability
    // ...
    return true;
  }
  
  // ❌ Don't require data that doesn't exist yet
  return false;
}
```

**Data Flow:**
1. User selects structure → Stored in `instance.metadata`
2. User makes skill check → Instance created with metadata
3. User selects cost → Stored in `instance.resolutionState.customComponentData`
4. User clicks "Apply Result" → Validation checks customComponentData

#### 3. Import Statements (Browser vs Node)

**Problem:** Using `require()` causes "require is not defined" error.

**Solution:** Always use ES6 imports:

```typescript
// ❌ DON'T - CommonJS (Node.js only)
const { structuresService } = require('../../../services/structures');

// ✅ DO - Top-level import (preferred)
import { structuresService } from '../../../services/structures';

// ✅ DO - Dynamic import (if needed conditionally)
const { structuresService } = await import('../../../services/structures');
```

**Note:** `checkRequirements` must be synchronous, so use top-level imports only.

#### 4. Cost Choice Pattern with Multiple Options

**Pattern:** Let user choose between multiple cost options (dice roll vs fixed cost).

**Implementation:**

```typescript
// Custom component stores selection
async function selectOption() {
  await updateInstanceResolutionState(instance.instanceId, {
    customComponentData: {
      costType: 'dice', // or 'half'
      cost: costObj,     // actual cost object
      structureId,       // from metadata
      settlementId       // from metadata
    }
  });
}

// Execute reads from customComponentData
async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
  const { cost, structureId, settlementId } = resolutionData.customComponentData;
  
  if (cost && Object.keys(cost).length > 0) {
    // Deduct resources
  } else {
    // Free (critical success)
  }
}
```

#### 5. Diagnostic Logging Strategy

**Problem:** Complex flows are hard to debug without visibility.

**Solution:** Add comprehensive logging at each step:

```typescript
// In validation
console.log('🔍 [ActionName] Validating:', {
  hasData: !!data,
  structureId: data?.structureId,
  fullData: resolutionData
});

// In storage
console.log('💰 [Component] Storing data:', dataToStore);
await updateInstanceResolutionState(...);
console.log('✅ [Component] Stored successfully');

// In execution
logActionStart('action-id', 'Processing');
// ... work
logActionSuccess('action-id', 'Completed');
```

**Use emoji prefixes for quick scanning:**
- 🔍 Validation
- 💰 Cost/Resource operations
- ✅ Success
- ❌ Error
- 🔧 Processing

#### 6. Handle Different Outcomes Differently

**Pattern:** Same action can behave differently based on outcome.

```typescript
needsCustomResolution(outcome): boolean {
  // Only success needs cost choice
  // Critical success is free (no UI needed)
  return outcome === 'success';
}

async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
  // Try customComponentData first (success with cost choice)
  if (resolutionData.customComponentData?.structureId) {
    structureId = resolutionData.customComponentData.structureId;
    cost = resolutionData.customComponentData.cost;
  } 
  // Fall back to instance metadata (critical success, no cost)
  else if (instance?.metadata?.structureId) {
    structureId = instance.metadata.structureId;
    // No cost for critical success
  }
}
```

#### 7. Resource Type Safety

**Problem:** TypeScript errors when using wrong types for cost objects.

**Solution:** Import proper types:

```typescript
import type { ResourceCost } from '../../../models/Structure';

// Use the correct type
let halfCost: ResourceCost = {};  // Not Record<string, number>
```

#### 8. Component-Action Data Contract

**Critical:** Custom component and action implementation must agree on data structure.

**Checklist:**
- [ ] Component reads from `instance.metadata` (pre-roll data)
- [ ] Component writes to `instance.resolutionState.customComponentData` (choices)
- [ ] Action validates `customComponentData` structure
- [ ] Action execution handles both `customComponentData` and `metadata` sources
- [ ] Validation logging shows exactly what's being checked

### Quick Reference: Repair Structure Flow

```
1. User clicks "Repair Structure"
   └─> RepairStructureDialog opens
   
2. User selects structure
   └─> Stores: { structureId, settlementId }
   └─> Triggers skill check
   
3. Skill check creates instance
   └─> Stores selection in instance.metadata
   
4. On success → RepairCostChoice shown
   └─> Reads structureId/settlementId from metadata
   └─> Calculates half cost from StructuresService
   
5. User selects cost option
   └─> Stores in instance.resolutionState.customComponentData:
       { costType, cost, structureId, settlementId }
   
6. User clicks "Apply Result"
   └─> Validation checks customComponentData
   └─> Execute deducts resources, repairs structure
   └─> Settlement properties recalculated
```

## Questions?

See the architecture documentation in `/.clinerules/ARCHITECTURE_SUMMARY.md` for overall patterns and principles.
