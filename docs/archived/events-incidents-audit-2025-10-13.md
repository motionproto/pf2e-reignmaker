# Events & Incidents Architecture Audit

**Date:** 2025-10-13  
**Status:** Critical Issues Identified  
**Purpose:** Document findings from architecture review and create fix plan

---

## Executive Summary

### Critical Issues Found

1. **Duplicate Instance Creation Paths** - Multiple code paths can create instances for the same event
2. **Immediate vs Ongoing Event Confusion** - Events with `endsEvent: true` appearing in wrong sections
3. **Status Lifecycle Inconsistencies** - Instance status not properly managed across all flows
4. **Mixed Responsibilities** - UI components performing controller operations

### Architecture Principles (Expected)

From `docs/ARCHITECTURE.md`:
- ✅ **Single Source of Truth:** KingdomActor is persistent storage
- ✅ **Clean Separation:** Components = UI only, Controllers = Business logic, Services = Utilities
- ✅ **Write Pattern:** Component → Controller → KingdomActor → Foundry → All Clients
- ✅ **Unified Check System:** activeCheckInstances for all check-based gameplay

**Current Violations:**
- ❌ UI components creating instances directly (EventsPhase.svelte.handleIgnore)
- ❌ Premature instance creation in controller (before player action)
- ❌ Multiple creation paths instead of single responsibility

---

## Issue #1: Duplicate Instance Creation Paths

### Problem
Multiple code locations can create ActiveCheckInstance for the same event, leading to confusion and potential duplicates.

### Current Code Paths

#### Path A: `EventPhaseController.performEventCheck()` (Lines 149-216)
```typescript
// When event is triggered by d20 roll
if (triggered) {
    event = eventService.getRandomEvent();
    
    const instanceId = await checkInstanceService.createInstance(
        'event', event.id, event, kingdom.currentTurn
    );
    
    console.log(`✅ [EventPhaseController] Created event instance: ${instanceId}`);
}
```
**Purpose:** Create instance for newly triggered event  
**Status:** `pending`  
**Logged as:** `✅ [CheckInstanceService] Created event instance: ...`

#### Path B: `EventPhaseController.resolveEvent()` (Lines 289-320)
```typescript
const shouldCreateInstance = (
    (isIgnored && event.traits?.includes('dangerous') && ...) ||
    (outcomeData && !outcomeData.endsEvent && ...)
);

if (shouldCreateInstance && !existingInstance) {
    newInstanceId = await checkInstanceService.createInstance(
        'event', event.id, event, currentTurn
    );
}
```
**Purpose:** Create instance for ongoing events (ignored or rolled with ongoing modifiers)  
**Status:** `pending`  
**Problem:** Can create second instance if performEventCheck() already created one!

#### Path C: `EventsPhase.svelte.handleIgnore()` (Lines 520-532)
```typescript
// Current event - use CheckInstanceService to create instance properly
const { checkInstanceService } = await import('...');

const instanceId = await checkInstanceService.createInstance(
    'event', targetEvent.id, targetEvent, currentTurn
);
```
**Purpose:** Create instance when player ignores event  
**Status:** `pending`  
**Problem:** UI should delegate to controller, not create instances directly!

### Root Cause Analysis

The console logs showing "duplicate" creation are actually:
1. CheckInstanceService logs: `✅ [CheckInstanceService] Created event instance: ...`
2. EventPhaseController logs: `✅ [EventPhaseController] Created event instance: ...`

These are **TWO LOGS for ONE creation**, not duplicate instances.

However, the architecture allows for **actual duplicates** because:
- `performEventCheck()` creates instance when event triggers
- `resolveEvent()` can ALSO create instance if conditions match
- UI can ALSO create instance when ignoring

**The real bug:** `performEventCheck()` should NOT create an instance! The instance should only be created when the player takes action (rolls or ignores).

### Expected Flow (Per Architecture Document)

Per `docs/ARCHITECTURE.md`, the correct data flow is:
```
Component Action → Controller → KingdomActor → Foundry → All Clients Update
```

For events, this means:
```
Event Triggered → Store eventId in turnState (display) → Player Action → Controller Creates Instance

1. performEventCheck() → Updates turnState.eventsPhase.eventId (display only, NO instance)
2. Player clicks skill → UI calls controller → Controller creates instance (if ongoing)
3. Player clicks ignore → UI calls controller → Controller creates instance (if needed)
```

**Key Architecture Principle:** Components delegate to controllers, never perform business logic directly.

### Actual Flow (Current Implementation)

```
Event Triggered → Create Instance → Player Action → Maybe Create Another?

1. performEventCheck() → Creates instance immediately ❌
2. resolveEvent() → Can create instance again if conditions match ❌
3. handleIgnore() UI → Can create instance from UI ❌
```

---

## Issue #2: Immediate Events in Ongoing Section

### Problem
Events with `endsEvent: true` are appearing in the "Ongoing Events" section instead of staying in the current event slot or moving to "Resolved Events".

### Current Status Logic

**EventPhaseController.resolveEvent()** (Lines 393-404):
```typescript
// After resolution, mark instance as resolved if it ends the event
if (!isIgnored && outcomeData?.endsEvent) {
    await updateKingdom(kingdom => {
        const instance = kingdom.activeCheckInstances?.find(...);
        if (instance) {
            instance.status = 'resolved';
            console.log(`✅ Marked event as resolved (endsEvent: true)`);
        }
    });
}
```

**EventsPhase.svelte** (Lines 74-76):
```typescript
$: pendingEventInstances = activeEventInstances.filter(
    instance => instance.status === 'pending'
);
$: resolvedEventInstances = activeEventInstances.filter(
    instance => instance.status === 'resolved'
);
```

### Root Cause

The issue is in the **creation timing**:

1. `performEventCheck()` creates instance with `status: 'pending'`
2. Instance immediately appears in "Ongoing Events" (filtered by status === 'pending')
3. When player resolves with `endsEvent: true`, status changes to 'resolved'
4. Instance moves to "Resolved Events" section

But players report seeing **immediate events in "Ongoing Events" before resolution**!

This happens because:
- Instance is created IMMEDIATELY when event triggers
- Before player even makes a choice, it's already in activeCheckInstances
- Current event should NOT be in activeCheckInstances at all!

### Expected Behavior

**Current Event** (just triggered):
- Display via: `turnState.eventsPhase.eventId` (NOT in activeCheckInstances)
- UI shows in main event card area
- Player makes choice

**After Resolution:**
- If `endsEvent: true` → No instance needed, just clear eventId
- If `endsEvent: false` → Create instance with status 'pending', shows in "Ongoing Events"

---

## Issue #3: Applied State Loss on View Change

### Problem
When switching away from Unrest phase and back, applied incidents disappear.

### Current Incident Flow

**UnrestPhase.svelte** (Lines 41-44):
```typescript
$: activeIncidents = $kingdomData.activeCheckInstances?.filter(
    i => i.checkType === 'incident'
) || [];
$: currentIncidentInstance = activeIncidents[0] || null;
$: incidentResolution = currentIncidentInstance?.appliedOutcome || null;
```

**UnrestPhaseController.startPhase()** (Lines 20-25):
```typescript
// Clear any completed/applied incidents from previous turns
await checkInstanceService.clearCompleted('incident', kingdom.currentTurn);
```

### Root Cause

The `clearCompleted()` call is TOO AGGRESSIVE:
- Runs EVERY time phase is entered (even when viewing history)
- Clears ALL non-pending incidents, including 'applied' ones
- No check for whether incident was actually resolved this turn

**CheckInstanceService.clearCompleted()** (Lines 155-162):
```typescript
if (checkType === 'event') {
    // Events: Keep pending (ongoing), clear resolved/applied
} else {
    // Incidents: Clear all non-pending
    kingdom.activeCheckInstances = kingdom.activeCheckInstances?.filter(i => 
      i.checkType !== checkType || i.status === 'pending'
    ) || [];
}
```

### Expected Behavior

Incidents should persist until:
1. Player applies the result (status → 'applied')
2. Player navigates to NEXT phase (not just switches tabs)
3. OR player advances to next turn

**Fix:** Only clear completed instances when `currentPhaseSteps` is being initialized for the FIRST time, not on every view change.

---

## Issue #4: Architecture Inconsistencies (Events vs Incidents)

### Comparison Matrix

| Aspect | Events | Incidents | Consistent? |
|--------|--------|-----------|-------------|
| Instance Creation | performEventCheck() creates immediately | checkForIncidents() creates immediately | ✅ Similar |
| Resolution Storage | appliedOutcome in instance | appliedOutcome in instance | ✅ Consistent |
| Status Lifecycle | pending → resolved → cleared | pending → resolved → applied → cleared | ❌ Different |
| UI Triggering | Can create instances | Uses controller only | ❌ Events violate architecture |
| Ongoing Display | Filtered by status === 'pending' | No ongoing concept | ❌ Different purpose |
| Cleanup Timing | Start of next Events phase | Start of Unrest phase | ❌ Different timing |

### Problems

1. **Events have 3 instance creation paths, incidents have 1**
   - Events: performEventCheck(), resolveEvent(), handleIgnore() UI
   - Incidents: checkForIncidents() only

2. **Different status meanings**
   - Events: 'pending' = ongoing, 'resolved' = completed this turn
   - Incidents: 'pending' = not rolled, 'resolved' = rolled but not applied, 'applied' = completed

3. **Events can be created from UI, incidents cannot**
   - EventsPhase.svelte has handleIgnore() that creates instances
   - UnrestPhase.svelte delegates to controller only

---

## Correct vs Actual Flow Documentation

### Events: CORRECT Flow (Should Be)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Event Check (d20 Roll)                             │
├─────────────────────────────────────────────────────────────┤
│ User clicks "Roll for Event"                                │
│   ↓                                                          │
│ EventPhaseController.performEventCheck()                    │
│   ↓                                                          │
│ IF triggered:                                               │
│   - Store eventId in turnState.eventsPhase.eventId          │
│   - DO NOT create instance yet                              │
│   - Display event in main card area                         │
│ ELSE:                                                        │
│   - No event, complete phase steps                          │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Player Choice                                       │
├─────────────────────────────────────────────────────────────┤
│ Option A: Player Rolls Skill                                │
│   ↓                                                          │
│ EventPhaseController.resolveEvent()                         │
│   ↓                                                          │
│ IF endsEvent: true                                          │
│   - Apply effects immediately                               │
│   - Clear turnState.eventsPhase.eventId                     │
│   - Do NOT create instance                                  │
│ ELSE (ongoing event):                                       │
│   - Create instance with appliedOutcome                     │
│   - Clear turnState.eventsPhase.eventId                     │
│   - Instance appears in "Ongoing Events"                    │
│                                                              │
│ Option B: Player Ignores                                    │
│   ↓                                                          │
│ EventPhaseController.ignoreEvent()  ← NEW METHOD NEEDED     │
│   ↓                                                          │
│ IF dangerous trait:                                         │
│   - Create instance with failure outcome                    │
│   - Clear turnState.eventsPhase.eventId                     │
│   - Instance appears in "Ongoing Events"                    │
│ ELSE:                                                        │
│   - Clear turnState.eventsPhase.eventId                     │
│   - No instance needed                                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Ongoing Events (Next Turn)                          │
├─────────────────────────────────────────────────────────────┤
│ On phase entry (startPhase):                                │
│   - Clear resolved/applied instances from previous turn     │
│   - Keep pending instances (ongoing events)                 │
│   - Clear appliedOutcome from pending (reset for new roll)  │
│                                                              │
│ Display:                                                     │
│   - Current event: turnState.eventsPhase.eventId            │
│   - Ongoing events: activeCheckInstances (status=pending)   │
│   - Resolved this turn: activeCheckInstances (status=resolved)│
└─────────────────────────────────────────────────────────────┘
```

### Events: ACTUAL Flow (Current Bug)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Event Check (d20 Roll)                             │
├─────────────────────────────────────────────────────────────┤
│ User clicks "Roll for Event"                                │
│   ↓                                                          │
│ EventPhaseController.performEventCheck()                    │
│   ↓                                                          │
│ IF triggered:                                               │
│   - Store eventId in turnState.eventsPhase.eventId          │
│   - CREATE INSTANCE IMMEDIATELY ❌                          │
│   - Instance appears in "Ongoing Events" ❌                 │
│   - Also displays in main card area ❌ DUPLICATE            │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Player Choice                                       │
├─────────────────────────────────────────────────────────────┤
│ Option A: Player Rolls Skill                                │
│   ↓                                                          │
│ EventPhaseController.resolveEvent()                         │
│   ↓                                                          │
│ IF endsEvent: true                                          │
│   - Apply effects                                           │
│   - Mark instance as 'resolved'                             │
│   - Clear turnState.eventsPhase.eventId                     │
│   - Instance moves to "Resolved Events" ✅                  │
│ ELSE IF ongoing modifiers AND no existing instance:         │
│   - CREATE ANOTHER INSTANCE ❌ POTENTIAL DUPLICATE          │
│   - Clear turnState.eventsPhase.eventId                     │
│ ELSE:                                                        │
│   - Update existing instance ✅                             │
│                                                              │
│ Option B: Player Ignores                                    │
│   ↓                                                          │
│ EventsPhase.svelte.handleIgnore() ❌ UI CREATING INSTANCE   │
│   ↓                                                          │
│ Creates instance from UI code ❌                            │
│ OR updates existing instance                                │
└─────────────────────────────────────────────────────────────┘
```

### Incidents: CORRECT Flow (Already Implemented)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Incident Check (Percentage Roll)                   │
├─────────────────────────────────────────────────────────────┤
│ User clicks "Roll for Incident"                             │
│   ↓                                                          │
│ UnrestPhaseController.checkForIncidents()                   │
│   ↓                                                          │
│ IF triggered:                                               │
│   - Create instance via checkInstanceService                │
│   - Update turnState (roll display only)                    │
│   - Display incident in BaseCheckCard                       │
│ ELSE:                                                        │
│   - No incident, complete phase steps                       │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Resolve Incident                                    │
├─────────────────────────────────────────────────────────────┤
│ Player rolls skill                                           │
│   ↓                                                          │
│ UnrestPhaseController.resolveIncident()                     │
│   ↓                                                          │
│ - Apply effects via resolvePhaseOutcome()                   │
│ - Mark instance as 'applied' automatically                  │
│ - Complete phase steps                                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Cleanup (Next Phase Entry)                         │
├─────────────────────────────────────────────────────────────┤
│ On phase entry (startPhase):                                │
│   - Clear ALL non-pending incidents                         │
│   - Incidents don't have "ongoing" concept                  │
│   ⚠️  BUG: Clears on every view change, not just progression│
└─────────────────────────────────────────────────────────────┘
```

---

## Fix Plan

### Priority 1: Remove Premature Instance Creation

**File:** `src/controllers/EventPhaseController.ts`

**Change:** Remove instance creation from `performEventCheck()`

```typescript
// REMOVE THIS BLOCK (Lines 176-214)
// NEW ARCHITECTURE: Create ActiveCheckInstance for the triggered event
const instanceId = await checkInstanceService.createInstance(
    'event',
    event.id,
    event,
    kingdom.currentTurn
);

console.log(`✅ [EventPhaseController] Created event instance: ${instanceId}`);
```

**Rationale:**  
- Current event should be displayed via `turnState.eventsPhase.eventId` only
- Instance should only be created when event becomes ongoing (after player action)
- This eliminates the "immediate event in ongoing section" bug

### Priority 2: Consolidate Instance Creation Logic

**File:** `src/controllers/EventPhaseController.ts`

**Add new method:**
```typescript
/**
 * Convert current event to ongoing event
 * Called when: player ignores, or resolution creates ongoing modifiers
 */
async createOngoingEventInstance(
    event: EventData,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    resolutionData: ResolutionData,
    actorName: string,
    skillName: string,
    isIgnored: boolean = false
): Promise<string> {
    // Single instance creation path for ongoing events
    // Returns instanceId
}
```

**Update:** `resolveEvent()` to use new method

**Update:** Remove instance creation from `EventsPhase.svelte.handleIgnore()`

**Rationale:**  
- Single responsibility: Controller handles all instance creation
- UI delegates to controller (proper architecture)
- Eliminates duplicate creation paths

### Priority 3: Fix Applied State Loss

**File:** `src/controllers/UnrestPhaseController.ts`

**Change:** Guard cleanup with phase progression check

```typescript
async startPhase() {
    // Only clear if this is the FIRST time entering phase this turn
    const kingdom = get(kingdomData);
    const isFirstEntry = !kingdom.turnState?.unrestPhase?.initialized;
    
    if (isFirstEntry) {
        await checkInstanceService.clearCompleted('incident', kingdom.currentTurn);
        
        // Mark as initialized
        await updateKingdom(k => {
            if (k.turnState?.unrestPhase) {
                k.turnState.unrestPhase.initialized = true;
            }
        });
    }
    
    // ... rest of initialization
}
```

**Rationale:**  
- Cleanup only on phase progression, not view changes
- Applied state persists for current turn
- Matches expected lifecycle

### Priority 4: Harmonize Event/Incident Patterns

**Goal:** Make events and incidents follow the same architectural patterns

**Changes:**
1. Both use controller-only instance creation (no UI creation)
2. Both use consistent status meanings
3. Both clean up at appropriate times
4. Both store resolution in `appliedOutcome`

**Files to update:**
- `src/controllers/EventPhaseController.ts`
- `src/controllers/UnrestPhaseController.ts`
- `src/view/kingdom/turnPhases/EventsPhase.svelte`
- `src/view/kingdom/turnPhases/UnrestPhase.svelte`

---

## Testing Checklist

After implementing fixes, verify:

- [ ] **No duplicate instance creation**
  - Check console logs for duplicate "Created event instance" messages
  - Verify `activeCheckInstances` array length is correct

- [ ] **Immediate events don't appear in ongoing section**
  - Trigger event with `endsEvent: true`
  - Verify it shows in current event card only
  - After applying, verify it moves to "Resolved Events" or disappears

- [ ] **Ongoing events appear correctly**
  - Trigger event with ongoing modifiers
  - Verify it appears in "Ongoing Events" after resolution
  - Verify it persists across view changes

- [ ] **Applied state survives view changes**
  - Roll for incident
  - Apply result
  - Switch to different phase and back
  - Verify applied incident still shows

- [ ] **Consistent patterns**
  - Compare event and incident flows
  - Verify both follow same architectural principles

---

## Implementation Order

1. **Phase 1:** Remove `performEventCheck()` instance creation
2. **Phase 2:** Add `createOngoingEventInstance()` method
3. **Phase 3:** Update `resolveEvent()` to use new method
4. **Phase 4:** Remove UI instance creation from `handleIgnore()`
5. **Phase 5:** Fix cleanup guard in `UnrestPhaseController`
6. **Phase 6:** Test all scenarios
7. **Phase 7:** Document final architecture

---

## Conclusion

The root causes of all reported bugs trace back to **premature instance creation** and **mixed responsibilities**:

1. Instances created before player action (too early)
2. UI components creating instances (architectural violation)
3. Multiple code paths creating instances (lack of single responsibility)
4. Aggressive cleanup on view changes (wrong lifecycle timing)

The fix requires:
- Moving instance creation to after player action
- Centralizing instance creation in controllers
- Adding proper cleanup guards
- Harmonizing event/incident patterns

This will restore the intended architecture: UI displays, controllers orchestrate, services manage state.
