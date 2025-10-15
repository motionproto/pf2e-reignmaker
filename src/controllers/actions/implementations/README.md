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

## Questions?

See the architecture documentation in `/.clinerules/ARCHITECTURE_SUMMARY.md` for overall patterns and principles.
