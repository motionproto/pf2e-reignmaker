# Testing Post-Roll Interaction Validation

This document describes how to test the new validation system that disables the Apply Result button until all post-roll interactions are resolved.

## What Was Changed

Updated `OutcomeDisplay.svelte` to use direct data computation instead of ValidationContext for determining when the Apply Result button should be enabled.

## Test Cases

### 1. Bandit Raids Incident (Dice Modifiers)

**Test:** Bandit raids incident with failure or critical failure outcome

**Expected Behavior:**
1. Roll the incident check and fail
2. The outcome card should show dice modifiers (e.g., "Lose 1d4 Gold" or "Lose 2d4 Gold")
3. ✅ **Apply Result button should be DISABLED** with a grayed-out appearance
4. Click the dice modifier to roll it
5. ✅ **Apply Result button should become ENABLED** after the dice is rolled
6. Clicking Apply Result should apply the outcome

**Console Log Check:**
```
🔒 [OutcomeDisplay] Interactions not resolved:
  requiresDiceRoll: true
  allDiceRolled: false
  standaloneDiceModifiers: 1
  ...
```

After rolling:
```
No "Interactions not resolved" message (button is enabled)
```

### 2. Harvest Resources Action (Custom Component)

**Test:** Harvest resources action with success or critical success outcome

**Expected Behavior:**
1. Roll the action and succeed
2. The outcome card should show ResourceChoiceSelector component with resource options (Food, Lumber, Stone, Ore)
3. ✅ **Apply Result button should be DISABLED**
4. Click one of the resource buttons to select it
5. ✅ **Apply Result button should become ENABLED** after selection
6. Clicking Apply Result should grant the selected resource

**Console Log Check:**
```
🔒 [OutcomeDisplay] Interactions not resolved:
  requiresCustomComponent: true
  customComponentResolved: false
  ...
```

After selecting:
```
🔍 [OutcomeDisplay] Custom component validation:
  customComponentResolved: true
  ...
```

### 3. Actions with Choices

**Test:** Any action with multiple outcome choices

**Expected Behavior:**
1. Roll the action
2. The outcome card should show choice buttons
3. ✅ **Apply Result button should be DISABLED**
4. Select one of the choices
5. ✅ **Apply Result button should become ENABLED**
6. Clicking Apply Result should apply the selected choice

### 4. Multiple Interactions (Edge Case)

**Test:** An outcome that has both dice AND a custom component

**Expected Behavior:**
1. ✅ **Apply Result button should be DISABLED**
2. After rolling dice: Still DISABLED (waiting for component)
3. After selecting in component: Still DISABLED if dice not rolled
4. ✅ **Only ENABLED when BOTH are resolved**

## How to Test in Foundry VTT

### Quick Test Commands

Open the browser console (F12) and run:

```javascript
// Test bandit raids with failure (has dice)
// Note: You'll need to set up an incident first in the Unrest phase

// Test harvest resources with success (has custom component)
// Note: You'll need to be in the Actions phase and have the action available
```

### Manual Testing Steps

1. **Start Foundry VTT** with the pf2e-reignmaker module enabled
2. **Create or load a kingdom**
3. **Navigate to the appropriate phase:**
   - Unrest phase for incidents
   - Actions phase for player actions
4. **Trigger the test scenario:**
   - For bandit raids: Set up the incident and roll
   - For harvest resources: Click the action and roll
5. **Observe the Apply Result button state**
6. **Check the browser console for validation logs**
7. **Resolve the interactions** (roll dice, select resources, etc.)
8. **Verify the button becomes enabled**
9. **Click Apply Result to confirm it works**

## Success Criteria

✅ Apply button disabled when dice need to be rolled
✅ Apply button disabled when custom component needs selection
✅ Apply button disabled when choice needs to be made
✅ Apply button enabled immediately when no interactions needed
✅ Apply button enabled after all interactions are resolved
✅ Clear console logs showing validation state
✅ Works consistently across all actions, events, and incidents

## Debugging

If the button is not behaving correctly:

1. **Check console for validation logs:**
   - Look for "🔒 [OutcomeDisplay] Interactions not resolved"
   - Look for "🔒 [OutcomeDisplay] Apply button disabled"

2. **Verify the outcome data:**
   - Check if dice modifiers are being detected
   - Check if custom component is being loaded
   - Check if choices are present

3. **Common issues:**
   - Dice not detected: Check modifier format (type: 'dice' or value: '1d4')
   - Component not detected: Check if customComponent variable is populated
   - Button still disabled: Check if all resolution flags are true

## Rollback Plan

If this change causes issues, the ValidationContext system is still in place (deprecated but not removed). To revert:

1. Change line in OutcomeDisplay.svelte:
   ```typescript
   // FROM:
   const interactionsNotResolved = !allInteractionsResolved;
   
   // TO:
   const contextValidationFails = unresolvedProviders.length > 0;
   ```

2. And update:
   ```typescript
   // FROM:
   primaryButtonDisabled = applied || interactionsNotResolved || !hasContent;
   
   // TO:
   primaryButtonDisabled = applied || contextValidationFails || !hasContent;
   ```




