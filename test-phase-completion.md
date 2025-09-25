# Phase Completion Tracking Test Guide

## Problem Fixed
The phase completion tracking issue has been resolved by making the completion status properly reactive in PhaseBar.svelte.

## What Was Wrong
The original code used a non-reactive function `isPhaseCompleted()` to determine if a phase was completed. Svelte couldn't track when this function needed to be re-evaluated when the game phase changed.

## The Fix
Changed from a non-reactive function to a reactive array that automatically updates when the current phase changes:

### Before (Non-reactive):
```javascript
function isPhaseCompleted(phaseIndex: number): boolean {
  return phaseIndex < currentPhaseIndex;
}
// Used as: class:completed={isPhaseCompleted(index)}
```

### After (Reactive):
```javascript
$: phaseCompletions = phases.map((_, index) => index < currentPhaseIndex);
// Used as: class:completed={phaseCompletions[index]}
```

## How to Test

1. **Build the module:**
   ```bash
   npm run build
   ```

2. **In Foundry VTT:**
   - Open your world with the module enabled
   - Open the Kingdom management interface
   - Navigate to the Turn tab

3. **Test the fix:**
   - Start on Phase I (Status)
   - Click "Next Phase" button → Should advance to Phase II (Resources)
   - Phase I should now show as completed (darker background)
   - Click "Next Phase" again → Should advance to Phase III (Unrest)
   - Both Phase I and Phase II should show as completed
   - Click on Phase II in the phase bar to view it (doesn't change game state)
   - Click "Next Phase" → Advances to Phase IV
   - Phase III should now also show as completed

4. **Check console logs:**
   Open browser console to see debug messages:
   - `[PhaseBar] Current phase:` shows current phase index
   - `[PhaseBar] Phase completions:` shows array of completion status
   - `[gameState] Phase advancing from X to Y` shows phase transitions

## Expected Visual Changes

### Completed Phases:
- Background: `var(--color-gray-900)` (darker)
- Border: `var(--color-gray-700)`
- Text color: `var(--text-disabled)` (dimmed)
- Connector lines between phases become highlighted when completed

### Active Phase:
- Gradient background (primary colors)
- White text
- Pulse animation when not currently viewing

### Selected/Viewing Phase:
- White underline below the phase button
- Normal text color for readability

## Debugging Info Added

The fix includes console logging to help track the reactivity:
- PhaseBar logs current phase, completions array, and viewing phase
- gameState logs phase advancement transitions

These logs can be removed once you've confirmed the fix is working.
