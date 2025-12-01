# Apply Button Validation System

**Last Updated:** 2025-01-30

## Overview

The Apply Result button in `OutcomeDisplay` is automatically disabled when post-roll interactions (dice rolls, custom components, choices) need to be resolved. This ensures users cannot apply outcomes until all required user input is provided.

## Architecture

### Direct Data Validation (Current Implementation)

The system uses **direct data computation** rather than component registration. This approach:

- ✅ **Self-contained** - All validation logic in OutcomeDisplay.svelte
- ✅ **No timing issues** - Computes synchronously from reactive props
- ✅ **More reliable** - Doesn't depend on child components registering
- ✅ **Simpler** - Single source of truth for validation state

### Three Types of Interactions

#### 1. Dice Roll Requirements

**Detection:**
```typescript
$: hasDiceInBadges = outcomeBadges?.some(b => b.value?.type === 'dice') || false;
$: hasDiceInModifiers = standaloneDiceModifiers.length > 0 || hasStateChangeDice;
$: requiresDiceRoll = hasDiceInBadges || hasDiceInModifiers;
```

**Resolution Check:**
```typescript
$: allDiceRolled = (() => {
  if (!requiresDiceRoll) return true;
  
  // Check all dice sources are rolled
  const standaloneDiceResolved = standaloneDiceModifiers.every((m: any) => 
    resolvedDice.has(m.originalIndex)
  );
  const stateChangeDiceResolved = stateChangeDice.every((dice: any) => 
    resolvedDice.has(dice.key)
  );
  const badgeDiceResolved = !hasDiceInBadges || outcomeBadges.every((badge, idx) => 
    badge.value?.type !== 'dice' || resolvedDice.has(idx)
  );
  
  return standaloneDiceResolved && stateChangeDiceResolved && badgeDiceResolved;
})();
```

**Examples:**
- Bandit Raids (failure): `Lose 1d4 Gold`
- Mass Exodus (critical failure): `Lose 2d4 Unrest`

#### 2. Custom Component Requirements

**Detection:**
```typescript
$: hasCustomComponent = customComponent !== null;
```

**Resolution Check:**
```typescript
$: customComponentResolved = !hasCustomComponent || (
  (componentResolutionData !== null && 
   componentResolutionData.stateChanges !== undefined && 
   Object.keys(componentResolutionData.stateChanges).length > 0) ||
  (customComponentData && Object.keys(customComponentData).length > 0) ||
  (customSelectionData && Object.keys(customSelectionData).length > 0)
);
```

**Examples:**
- Harvest Resources (success): ResourceChoiceSelector - select Food/Lumber/Stone/Ore
- Sell Surplus (success): SellResourceSelector - select resource to sell
- Purchase Resources (success): PurchaseResourceSelector - select resource to buy

#### 3. Choice Requirements

**Detection:**
```typescript
$: requiresChoice = effectiveChoices.length > 0;
```

**Resolution Check:**
```typescript
$: choiceResolved = !requiresChoice || selectedChoice !== null;
```

**Examples:**
- Any action with multiple outcome choices in the JSON definition

### Combined Validation

All three checks are combined into a single boolean:

```typescript
$: allInteractionsResolved = allDiceRolled && customComponentResolved && choiceResolved;
```

The Apply button is disabled when `!allInteractionsResolved`:

```typescript
const interactionsNotResolved = !allInteractionsResolved;
primaryButtonDisabled = applied || interactionsNotResolved || !hasContent;
```

## Debug Logging

When interactions are not resolved, the console shows:

```
🔒 [OutcomeDisplay] Interactions not resolved:
  requiresDiceRoll: true
  allDiceRolled: false
  standaloneDiceModifiers: 1
  stateChangeDice: 0
  resolvedDiceCount: 0
  hasCustomComponent: false
  customComponentResolved: true
  requiresChoice: false
  choiceResolved: true
  selectedChoice: null
```

When the Apply button is disabled:

```
🔒 [OutcomeDisplay] Apply button disabled:
  applied: false
  interactionsNotResolved: true
  hasContent: true
  breakdown:
    requiresDiceRoll: true
    allDiceRolled: false
    requiresCustomComponent: false
    customComponentResolved: true
    requiresChoice: false
    choiceResolved: true
```

## Implementation Details

### File Modified

- **[`src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte`](../../../view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte)** (lines 219-320)

### Key Changes

1. **Added direct detection** of all interaction requirements from outcome data
2. **Added resolution tracking** for each interaction type
3. **Combined validation** into single `allInteractionsResolved` boolean
4. **Updated button logic** to use direct validation instead of ValidationContext
5. **Enhanced debug logging** to show validation state

### ValidationContext (Deprecated)

The previous ValidationContext system (where components register themselves) is still present but deprecated. It's kept for backwards compatibility but not used for button validation.

To fully remove ValidationContext in the future:
1. Remove imports from OutcomeDisplay.svelte
2. Remove registration logic from child components (OutcomeBadges, ChoiceButtons, etc.)
3. Remove ValidationContext.ts file

## Usage in Pipelines

### Dice Modifiers

In pipeline JSON or TypeScript:

```typescript
outcomes: {
  failure: {
    description: 'The bandits raid your holdings.',
    modifiers: [
      { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
    ]
  }
}
```

The system automatically detects the dice modifier and disables Apply until rolled.

### Custom Components

In pipeline TypeScript:

```typescript
postRollInteractions: [
  {
    type: 'configuration',
    id: 'resourceSelection',
    component: 'ResourceChoiceSelector',
    condition: (ctx) => ctx.outcome === 'success'
  }
]
```

The system automatically detects the custom component and disables Apply until resolved.

### Choices

In pipeline JSON:

```typescript
outcomes: {
  success: {
    description: 'Choose your reward.',
    choices: [
      { label: 'Gain Gold', modifiers: [{ type: 'static', resource: 'gold', value: 2 }] },
      { label: 'Gain Fame', modifiers: [{ type: 'static', resource: 'fame', value: 1 }] }
    ]
  }
}
```

The system automatically detects the choices and disables Apply until one is selected.

## Testing

See [`TESTING_VALIDATION.md`](../../../TESTING_VALIDATION.md) for comprehensive testing instructions.

### Quick Test Checklist

- [ ] Bandit raids (failure) - Button disabled until dice rolled
- [ ] Harvest resources (success) - Button disabled until resource selected
- [ ] Any action with choices - Button disabled until choice made
- [ ] Multiple interactions - Button disabled until ALL resolved
- [ ] No interactions - Button enabled immediately

## Benefits

### For Users

- ✅ **Prevents accidental application** of incomplete outcomes
- ✅ **Clear visual feedback** - disabled button shows something is required
- ✅ **Works automatically** - no manual intervention needed

### For Developers

- ✅ **Pipeline-level solution** - works for all actions/events/incidents
- ✅ **No per-pipeline configuration** - automatically detects requirements
- ✅ **Easy to debug** - comprehensive console logging
- ✅ **Type-safe** - leverages TypeScript for validation
- ✅ **Maintainable** - single source of truth in OutcomeDisplay

## Related Documentation

- **[pipeline-coordinator.md](./pipeline-coordinator.md)** - Complete pipeline architecture
- **[pipeline-patterns.md](./pipeline-patterns.md)** - Pattern reference for implementing actions
- **[TESTING_VALIDATION.md](../../../TESTING_VALIDATION.md)** - Testing instructions

## Migration Notes

### From ValidationContext to Direct Validation

**Old Approach (ValidationContext):**
- Components registered themselves on mount
- Parent checked `unresolvedProviders.length > 0`
- Timing issues with component lifecycle
- Complex registration/unregistration logic

**New Approach (Direct Validation):**
- Parent computes from data synchronously
- No component registration needed
- No timing issues
- Simpler reactive statements

### Backwards Compatibility

The ValidationContext system is still present for backwards compatibility. Child components (OutcomeBadges, ChoiceButtons, etc.) still register themselves, but OutcomeDisplay no longer uses this data for button validation.

This allows for gradual migration and ensures no breaking changes.

---

**Status:** ✅ Production Ready  
**Last Updated:** 2025-01-30




