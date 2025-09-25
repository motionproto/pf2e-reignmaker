# Unified Roll System - Complete Implementation

## Summary

Successfully refactored the skill roll system from multiple callbacks to a single event-based system that's cleaner, simpler, and more maintainable.

## Architecture Changes

### Before: Multiple Callbacks
- Each component registered its own callback
- Complex callback array management
- Potential for memory leaks and duplicate handlers

### After: Event-Based System
- Single global handler dispatches custom events
- Components listen for `kingdomRollComplete` events
- Filter by `checkType` to handle only relevant rolls
- Proper cleanup with `onDestroy`

## Implementation Details

### 1. Global Handler (`foundry-actors.ts`)
```javascript
// Single initialization, dispatches events
window.dispatchEvent(new CustomEvent('kingdomRollComplete', {
  detail: { checkId, outcome, checkType, ... }
}));
```

### 2. Component Listeners
- **ActionsPhase**: Listens for `checkType === 'action'`
- **UnrestPhase**: Listens for `checkType === 'incident'`
- Both properly clean up on unmount

### 3. Unified SkillTag Component
- Handles ALL skill rolls directly
- Dispatches 'execute' event for backward compatibility
- Then performs skill check via `performKingdomSkillCheck`
- Smart loading state management

## Testing Checklist

✅ Action rolls trigger and resolve correctly
✅ Incident rolls trigger and resolve correctly  
✅ Roll results are properly captured
✅ Components only react to their own check types
✅ No memory leaks (proper cleanup on unmount)
✅ Backward compatibility maintained

## Benefits

1. **Simpler**: No callback management complexity
2. **Type-Safe**: Components filter by checkType
3. **Debuggable**: Can monitor events in browser console
4. **Scalable**: Easy to add new check types (events, etc.)
5. **Memory Safe**: Proper cleanup prevents leaks

## Debug Helper

Add to browser console to monitor all kingdom rolls:
```javascript
window.addEventListener('kingdomRollComplete', (e) => {
  console.log('Roll:', e.detail);
});
```

## Files Modified

1. `src/api/foundry-actors.ts` - Event-based handler
2. `src/view/kingdom/turnPhases/ActionsPhase.svelte` - Event listener
3. `src/view/kingdom/turnPhases/UnrestPhase.svelte` - Event listener
4. `src/view/kingdom/components/SkillTag.svelte` - Unified roll handling
5. `src/view/kingdom/components/ActionCard.svelte` - Pass check props

The system is now unified, clean, and maintainable!
