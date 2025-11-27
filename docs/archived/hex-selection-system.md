# Hex Selection System Documentation

## Overview

The hex selection system provides a robust, user-friendly interface for selecting hexes on the Kingmaker map. It's used by multiple actions (Claim Hexes, Build Roads, Fortify Hex, Create Worksite, Send Scouts) to enable players to interact with the map during action execution.

## Architecture

### Components

1. **HexSelectorService** - Main orchestrator, provides Promise-based API
2. **CanvasInteractionHandler** - Handles canvas events (click, mousemove)
3. **HexRenderer** - Renders hex selections and hover previews
4. **SelectionPanelManager** - Manages floating selection panel UI
5. **ReignMakerMapLayer** - PIXI canvas layer manager
6. **UnifiedCheckHandler** - Maps action pipeline properties to HexSelectorService

### Data Flow

```
User hovers over hex
  ↓
CanvasInteractionHandler.handleCanvasMove()
  ↓
Validate hex with config.validateHex()
  ↓
Get hover style from HexRenderer.getHoverStyle()
  ↓
Call ReignMakerMapLayer.showInteractiveHover()
  ↓
Draw PIXI.Graphics to 'interactive-hover' layer (z-index 1000)
  ↓
Show layer via LayerManager
```

## Using Hex Selection in Actions

### Basic Example

```typescript
import { createActionPipeline } from '../shared/createActionPipeline';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';

export const myActionPipeline = createActionPipeline('my-action', {
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      count: 1,  // Number of hexes to select
      colorType: 'claim',  // Visual style
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      
      // Validation function - MUST be named 'validateHex'
      validateHex: (hexId: string, pendingSelections: string[] = []): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          
          // Use shared validators
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
          // Custom validation
          if (/* some condition */) {
            return { valid: false, message: 'Custom error message' };
          }
          
          return { valid: true };
        }, hexId, 'myAction validation');
      },
      
      // Optional: Adjust count/title based on outcome
      outcomeAdjustment: {
        criticalSuccess: { count: 2, title: 'Select 2 hexes (Critical Success)' },
        success: { count: 1, title: 'Select 1 hex' },
        failure: { count: 0 },
        criticalFailure: { count: 0 }
      }
    }
  ],
  
  execute: async (ctx) => {
    // Read selected hexes from resolution data
    const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
    
    if (!hexIds || hexIds.length === 0) {
      return { success: true }; // Graceful cancellation
    }
    
    // Execute action with selected hexes
    await myActionExecution(hexIds);
    return { success: true };
  }
});
```

### Validation Function Requirements

**Property Name:** MUST be `validateHex` (not `validation` or `validationFn`)

**Function Signature:**
```typescript
validateHex: (hexId: string, pendingSelections?: string[]) => ValidationResult | boolean
```

**Return Type:**
```typescript
interface ValidationResult {
  valid: boolean;
  message?: string;  // User-friendly error message
}
```

**Parameters:**
- `hexId` - The hex being validated (format: "x.y")
- `pendingSelections` - Array of already-selected hex IDs (useful for adjacency checks)

## Shared Validators

Use these pre-built validators from `src/pipelines/shared/hexValidators.ts`:

### Basic Validators

```typescript
// Check if hex is claimed by player
validateClaimed(hexId: string, kingdom?: KingdomData): ValidationResult

// Check if hex is NOT claimed (for claiming new hexes)
validateUnclaimed(hexId: string, kingdom?: KingdomData): ValidationResult

// Check if hex is not already selected
validateNotPending(hexId: string, pendingSelections: string[]): ValidationResult

// Check if hex has no settlement
validateNoSettlement(hexId: string, kingdom?: KingdomData): ValidationResult
```

### World Explorer Validators

```typescript
// Check if hex is explored (World Explorer integration)
validateExplored(hexId: string): ValidationResult

// Check if hex is NOT explored (for scouting)
validateUnexplored(hexId: string): ValidationResult
```

### Adjacency Validators

```typescript
// Check if hex is adjacent to claimed territory
validateAdjacentToClaimed(
  hexId: string,
  pendingClaims: string[],
  kingdom?: KingdomData
): ValidationResult

// Check if hex is adjacent to explored territory
validateAdjacentToExplored(
  hexId: string,
  pendingScouts: string[]
): ValidationResult
```

### Helper Functions

```typescript
// Get fresh kingdom data (prevents stale data issues)
getFreshKingdomData(): KingdomData

// Safe wrapper with error handling
safeValidation(
  validationFn: () => ValidationResult,
  hexId: string,
  context: string
): ValidationResult

// Check if hex is adjacent to any in target list
isAdjacentToAny(hexId: string, targetHexIds: string[]): boolean
```

## Advanced Features

### Custom Selector Components

Add custom UI components for additional selection after hex selection:

```typescript
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';

postApplyInteractions: [
  {
    type: 'map-selection',
    id: 'selectedHex',
    validateHex: (hexId) => { /* ... */ },
    
    // Show custom component after hex selection
    customSelector: {
      component: WorksiteTypeSelector
    }
  }
]
```

The custom component can return metadata along with hex IDs:

```typescript
// In execution
const result = ctx.resolutionData?.compoundData?.selectedHex;
if (result?.hexIds && result?.metadata) {
  const hexId = result.hexIds[0];
  const worksiteType = result.metadata.worksiteType;
}
```

### Hex Info Callback

Display hex-specific information during hover:

```typescript
postApplyInteractions: [
  {
    type: 'map-selection',
    validateHex: (hexId) => { /* ... */ },
    
    getHexInfo: (hoveredHexId: string) => {
      const kingdom = getFreshKingdomData();
      const hex = kingdom.hexes?.find(h => h.id === hoveredHexId);
      
      // Return HTML string to display in panel
      return `<div>Cost: ${calculateCost(hex)}</div>`;
    }
  }
]
```

### Dynamic Count Based on Outcome

Use function-based counts for dynamic selection:

```typescript
outcomeAdjustment: {
  criticalSuccess: {
    count: (ctx) => {
      // Dynamic count based on proficiency rank
      const proficiencyRank = ctx.metadata?.proficiencyRank || 0;
      return Math.max(2, proficiencyRank);
    },
    title: 'Select hexes to claim (Critical Success)'
  },
  success: { count: 1, title: 'Select 1 hex' }
}
```

## Color Types

Available `colorType` values for visual styling:

- `'claim'` - Light green (for claiming hexes)
- `'road'` - Purple (for building roads)
- `'fortify'` - Light green (for fortifications)
- `'worksite'` - Light green (for worksites)
- `'scout'` - Pale green (for scouting)
- `'settlement'` - Orange (for settlements)
- `'unclaim'` - Orange (for unclaiming)

## Error Handling

### Validation Errors

All validation functions should return clear, user-friendly error messages:

```typescript
if (!isValid) {
  return {
    valid: false,
    message: 'This hex cannot be selected because...'
  };
}
```

### Safe Validation Wrapper

Always wrap validation logic in `safeValidation()` to catch and handle errors gracefully:

```typescript
validateHex: (hexId: string): ValidationResult => {
  return safeValidation(() => {
    // Your validation logic here
    return { valid: true };
  }, hexId, 'actionName validation');
}
```

This ensures that:
- Errors are logged with context
- Users see friendly error messages
- The system doesn't crash on validation failures

## Testing Checklist

When implementing a new hex-selection action:

1. ✅ Property named `validateHex` (not `validation` or `validationFn`)
2. ✅ Returns `ValidationResult` with user-friendly messages
3. ✅ Uses `safeValidation()` wrapper for error handling
4. ✅ Gets fresh kingdom data with `getFreshKingdomData()`
5. ✅ Uses shared validators where applicable
6. ✅ Handles `pendingSelections` parameter for chaining validation
7. ✅ Tests hover effects (green = valid, red = invalid)
8. ✅ Tests selection and deselection
9. ✅ Tests graceful cancellation (returns empty array)
10. ✅ Verifies outcome-based count adjustments work

## Common Patterns

### Pattern: Claimed Territory Validation

```typescript
validateHex: (hexId: string): ValidationResult => {
  return safeValidation(() => {
    const kingdom = getFreshKingdomData();
    const claimedResult = validateClaimed(hexId, kingdom);
    if (!claimedResult.valid) return claimedResult;
    return { valid: true };
  }, hexId, 'action validation');
}
```

### Pattern: Adjacency + Claimed Territory

```typescript
validateHex: (hexId: string, pending: string[]): ValidationResult => {
  return safeValidation(() => {
    const kingdom = getFreshKingdomData();
    
    // Must be unclaimed
    const unclaimedResult = validateUnclaimed(hexId, kingdom);
    if (!unclaimedResult.valid) return unclaimedResult;
    
    // Must be adjacent to claimed
    const adjacencyResult = validateAdjacentToClaimed(hexId, pending, kingdom);
    if (!adjacencyResult.valid) return adjacencyResult;
    
    return { valid: true };
  }, hexId, 'action validation');
}
```

### Pattern: World Explorer Integration

```typescript
validateHex: (hexId: string, pending: string[]): ValidationResult => {
  return safeValidation(() => {
    // Must be unexplored
    const unexploredResult = validateUnexplored(hexId);
    if (!unexploredResult.valid) return unexploredResult;
    
    // Must be adjacent to explored territory
    const adjacencyResult = validateAdjacentToExplored(hexId, pending);
    if (!adjacencyResult.valid) return adjacencyResult;
    
    return { valid: true };
  }, hexId, 'scout validation');
}
```

## Troubleshooting

### Hover Effects Not Showing

1. Check that `validateHex` property name is correct
2. Verify validation function returns `ValidationResult` or `boolean`
3. Check browser console for validation errors
4. Ensure `colorType` is a valid value
5. Verify PIXI layer visibility in LayerManager

### Validation Not Working

1. Ensure `getFreshKingdomData()` is used (not stale data)
2. Check that `pendingSelections` parameter is handled
3. Verify validation logic doesn't throw unhandled errors
4. Use `safeValidation()` wrapper for better error messages

### Selection Not Updating

1. Check that `count` matches expected number of hexes
2. Verify `condition` function returns correct outcome check
3. Ensure `outcomeAdjustment` is configured properly
4. Check that execution reads from `ctx.resolutionData.compoundData`

## Migration Guide

### Old Property Name → New Property Name

```typescript
// ❌ OLD (deprecated)
validation: (hexId, pending) => { /* ... */ }

// ✅ NEW (current)
validateHex: (hexId, pending) => { /* ... */ }
```

The system automatically handles both during transition, but all new code should use `validateHex`.
