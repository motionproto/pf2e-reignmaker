# Architecture Audit Report - Check Instance System

**Date:** 2025-10-13  
**Status:** CRITICAL ISSUES FOUND

---

## Executive Summary

The Check Instance System has solid fundamentals but suffers from **three critical implementation bugs** and **state fragmentation** that cause instability:

1. ❌ **Incident Persistence Bug** - Incidents never clean up after first turn
2. ❌ **Event Architecture Bug** - No instance creation until resolution (causes synthetic instance workaround)
3. ❌ **State Fragmentation** - Mixed storage between instances and turnState
4. ⚠️ **Cleanup Guard Bug** - `initialized` flag never resets at turn boundaries

---

## Bug #1: Incident Persistence Bug 🔴

### Root Cause
**File:** `src/controllers/UnrestPhaseController.ts:58-70`

```typescript
const isFirstEntry = !kingdom.turnState?.unrestPhase?.initialized;

if (isFirstEntry) {
  await checkInstanceService.clearCompleted('incident', kingdom.currentTurn);
  
  // Mark as initialized to prevent repeated cleanup
  await actor.updateKingdom((k) => {
    if (k.turnState?.unrestPhase) {
      k.turnState.unrestPhase.initialized = true;
    }
  });
}
```

**Problem:** `turnState.unrestPhase.initialized` is set to `true` on first entry but **NEVER reset** when advancing to the next turn. This means:
- Turn 1: Incidents are cleared ✅
- Turn 2+: Guard prevents cleanup, incidents persist forever ❌

### Impact
- Incidents from previous turns never get cleaned up
- UI shows old incidents alongside new ones
- Memory leak over time

### Fix
**Option A (Recommended):** Use `createdTurn` instead of `initialized` flag
```typescript
// Clear incidents from previous turns
const pendingIncidents = kingdom.activeCheckInstances?.filter(i => 
  i.checkType === 'incident' && i.status !== 'pending'
) || [];

const outdatedIncidents = pendingIncidents.filter(i => 
  i.createdTurn < kingdom.currentTurn
);

if (outdatedIncidents.length > 0) {
  await checkInstanceService.clearCompleted('incident', kingdom.currentTurn);
  console.log(`✅ Cleared ${outdatedIncidents.length} incidents from previous turns`);
}
```

**Option B:** Reset `initialized` flag when turn advances
```typescript
// In TurnManager.nextTurn()
await updateKingdom(kingdom => {
  if (kingdom.turnState?.unrestPhase) {
    kingdom.turnState.unrestPhase.initialized = false;
  }
});
```

---

## Bug #2: Event Architecture Bug 🔴

### Root Cause
**File:** `src/controllers/EventPhaseController.ts:137-141`

```typescript
// ✅ ARCHITECTURE FIX: Do NOT create instance yet - wait for player action
// Current event is displayed via turnState.eventsPhase.eventId only
// Instance will be created when player resolves or ignores
```

**Problem:** Events don't create instances until player resolves them. This creates a chicken-and-egg problem:
1. Event triggers → No instance exists
2. UI tries to display event with OutcomeDisplay
3. OutcomeDisplay needs instance for dice/choice tracking
4. Workaround: Create synthetic instance in UI ❌

### Impact
- Synthetic instance workaround in `EventsPhase.svelte`
- Duplicate code paths (real instances vs synthetic)
- State tracking fails for current events
- Architecture doesn't match documentation

### Current Workaround (WRONG)
**File:** `src/view/kingdom/turnPhases/EventsPhase.svelte:851`
```typescript
checkInstance={{ 
  instanceId: currentEvent.id, 
  checkType: 'event', 
  checkId: currentEvent.id, 
  checkData: currentEvent, 
  status: 'pending', 
  createdTurn: $kingdomData.currentTurn 
}}
```

This is UI-only, doesn't persist, and bypasses CheckInstanceService.

### Fix
**Create real instance in `performEventCheck()`:**

```typescript
if (triggered && event) {
  state.currentEvent = event;
  
  // ✅ Create ActiveCheckInstance IMMEDIATELY via service
  const instanceId = await checkInstanceService.createInstance(
    'event',
    event.id,
    event,
    currentTurn
  );
  
  // Update turnState to mark this as "current event"
  await actor.updateKingdom((kingdom) => {
    kingdom.eventDC = newDC;
    if (kingdom.turnState) {
      kingdom.turnState.eventsPhase.eventRolled = true;
      kingdom.turnState.eventsPhase.eventRoll = roll;
      kingdom.turnState.eventsPhase.eventTriggered = true;
      kingdom.turnState.eventsPhase.eventId = event.id;  // Marks as "current"
    }
  });
  
  console.log(`✨ Event instance created: ${instanceId}`);
}
```

**UI Filter Logic:**
```typescript
// Current event: Has matching turnState.eventId
$: currentEventInstance = $kingdomData.activeCheckInstances?.find(i =>
  i.checkType === 'event' && 
  i.checkId === $kingdomData.turnState?.eventsPhase?.eventId
);

// Ongoing events: Pending but NOT current
$: ongoingEventInstances = $kingdomData.activeCheckInstances?.filter(i =>
  i.checkType === 'event' && 
  i.status === 'pending' &&
  i.checkId !== $kingdomData.turnState?.eventsPhase?.eventId
) || [];
```

---

## Bug #3: State Fragmentation 🟡

### Problem
State is scattered across multiple storage locations:

**Storage Locations:**
1. `KingdomActor.activeCheckInstances` - Persistent instance data
2. `TurnState.eventsPhase` - UI display state (roll numbers, current event ID)
3. `TurnState.unrestPhase` - UI display state (roll numbers, flags)
4. `ResolutionStateHelpers` - Resolution tracking (dice, choices) stored IN instances
5. Local component state - Temporary UI state (eventResolution in EventsPhase.svelte)

### What's Wrong
- **Duplication:** Same data stored in multiple places
- **Sync Issues:** Updates to one location don't propagate
- **Race Conditions:** Multiple writes to different locations can conflict
- **Confusion:** Developers don't know which is "source of truth"

### What's Right (Per Documentation)
**Single Source of Truth:** `KingdomActor.activeCheckInstances`

**Correct Pattern:**
```
Storage:      activeCheckInstances only (persistent, synced)
UI Display:   Read from activeCheckInstances (filtered/computed)
Temporary:    turnState for roll numbers/UI flags only (ephemeral)
```

### Current Reality vs Documentation

| Data | Documentation | Actual Implementation |
|------|---------------|----------------------|
| Check data | `instance.checkData` | ✅ Correct |
| Resolution outcome | `instance.appliedOutcome` | ✅ Correct |
| Dice rolls | `instance.resolutionState` (via helpers) | ⚠️ Correct but unused for current events |
| Current event ID | `turnState.eventsPhase.eventId` | ✅ Correct (UI filter only) |
| Roll numbers | `turnState.*.roll` | ✅ Correct (display only) |
| Event resolution | Should be in instance | ❌ WRONG: Duplicated in local state |

### Fix Required
1. Remove `eventResolution` local state from `EventsPhase.svelte`
2. Read resolution directly from instance: `instance.appliedOutcome`
3. Remove synthetic instance workaround
4. Trust `activeCheckInstances` as single source of truth

---

## Bug #4: Cleanup Guard Never Resets ⚠️

### Problem
`turnState.unrestPhase.initialized` flag is set but never cleared when advancing turns.

### Files Affected
- `src/controllers/UnrestPhaseController.ts:58` (sets flag)
- `src/models/TurnManager.ts` (should clear flag but doesn't)

### Fix
Add to `TurnManager.nextTurn()`:
```typescript
// Clear phase-specific state when advancing turn
kingdom.turnState = {
  ...createDefaultTurnState(),
  actionLog: []  // Preserve action log if needed
};
```

Or more surgically:
```typescript
if (kingdom.turnState?.unrestPhase) {
  kingdom.turnState.unrestPhase.initialized = false;
}
```

---

## Recommended Fix Order

1. **Fix Incident Cleanup (Highest Priority)**
   - Remove `initialized` guard
   - Use `createdTurn` comparison
   - Test: Incidents clear on next Unrest phase

2. **Fix Event Instance Creation (High Priority)**
   - Create instance in `performEventCheck()`
   - Remove synthetic instance from `EventsPhase.svelte`
   - Update UI filtering logic
   - Test: Dice rolls work, no double instances

3. **Clean Up State Fragmentation (Medium Priority)**
   - Remove `eventResolution` local state
   - Read from `instance.appliedOutcome` directly
   - Document clear storage boundaries
   - Test: State persists across view changes

4. **Add Turn Boundary Cleanup (Low Priority)**
   - Reset `turnState` on turn advance
   - Document turnState lifecycle
   - Test: Clean state on new turn

---

## Architecture Validation Checklist

After fixes, validate:

- [ ] Incidents clean up when advancing to next turn
- [ ] Events create instances immediately on trigger
- [ ] No synthetic instances in UI code
- [ ] Current vs ongoing events filter correctly
- [ ] Dice rolls persist in instances
- [ ] Resolution state survives view changes
- [ ] Applied state syncs across all clients
- [ ] No duplicate instance creation
- [ ] `turnState` only used for ephemeral display data
- [ ] `activeCheckInstances` is single source of truth

---

## Summary

The CheckInstanceService architecture is **fundamentally sound** but has **critical implementation bugs**:

✅ **Good:**
- CheckInstanceService design
- Status lifecycle (pending → resolved → applied)
- Multi-client sync mechanism
- Type-safe instance structure

❌ **Bad:**
- Incidents never clean up (broken guard)
- Events don't create instances (architectural mistake)
- State fragmented across multiple locations
- Synthetic instances (workaround for above bugs)

**Once these 4 bugs are fixed, the architecture will match the documentation and provide stable state management.**
