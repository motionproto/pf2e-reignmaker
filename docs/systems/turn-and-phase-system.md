# Turn and Phase System

**Purpose:** Coordinate kingdom turn progression through six phases with structured step tracking

---

## Overview

The Turn and Phase System manages the kingdom's gameplay cycle:
- **6 Phases per turn:** STATUS → RESOURCES → EVENTS → UNREST → ACTIONS → UPKEEP
- **Turn-scoped state:** `turnState` persists all per-turn data
- **Phase steps:** Each phase defines completion steps
- **Self-executing phases:** Phase components auto-start controllers

---

## Core Components

### TurnManager

**Role:** Central coordinator for turn/phase progression

**Responsibilities:**
- Advance phases in sequence
- End turns and start new ones
- Delegate step management to PhaseHandler
- Provide utility methods (unrest penalty, fame spending, etc.)

**Key Pattern:** TurnManager is stateless - all data lives in KingdomActor.

### TurnState

**Role:** Single source of truth for per-turn UI state

**Storage:** `KingdomActor.turnState: TurnState`

**Structure:**
```typescript
interface TurnState {
  turnNumber: number;  // Detects turn advancement
  statusPhase: { ... };
  resourcesPhase: { ... };
  eventsPhase: { ... };
  unrestPhase: { ... };
  actionsPhase: { ... };
  upkeepPhase: { ... };
}
```

**Lifecycle:**
- **Created:** StatusPhaseController at turn start
- **Persists:** Entire turn (survives refresh, navigation, multi-client)
- **Resets:** Only when `currentTurn !== turnState.turnNumber`

### PhaseHandler

**Role:** Utility class for step management logic

**Pattern:** Static methods imported by TurnManager, not used directly by controllers.

---

## Data Flow

### Turn Lifecycle

```
Turn N Start (STATUS phase)
  ↓
StatusPhaseController.ensureTurnState()
  - If !turnState → create new
  - If turnState.turnNumber !== currentTurn → reset
  - Otherwise → preserve (phase navigation)
  ↓
Phases execute in sequence (STATUS → RESOURCES → ... → UPKEEP)
  ↓
After UPKEEP completes
  ↓
TurnManager.nextPhase() detects end of PHASE_ORDER
  ↓
TurnManager.endTurn()
  - Increment currentTurn
  - Reset to STATUS phase
  - Clear oncePerTurnActions
  - Decrement modifier durations
  ↓
Turn N+1 Start (STATUS phase)
```

### Phase Lifecycle

#### 1. Phase Start

```
Component mounts
  ↓
Detects currentPhase matches
  ↓
Creates phase controller
  ↓
controller.startPhase()
  - Initializes phase steps
  - Executes phase-specific logic
  - Auto-completes steps if applicable
  ↓
Returns { success: boolean, phaseComplete: boolean }
```

#### 2. Step Completion

```
Controller completes work
  ↓
Calls completePhaseStepByIndex(stepIndex)
  ↓
PhaseHandler updates kingdom data
  - Marks step completed
  - Finds next incomplete step
  - Updates currentPhaseStepIndex
  - Checks if all steps done
  ↓
Returns { success: boolean, phaseComplete: boolean }
```

#### 3. Phase Advancement

```
Component detects phaseComplete: true
  ↓
Calls turnManager.nextPhase()
  ↓
TurnManager resets phase steps
  ↓
Calculates next phase
  ↓
Updates currentPhase in KingdomActor
  ↓
Triggers onPhaseChanged callback
  ↓
Next phase component mounts
```

---

## Phase Progression Pattern

### Self-Executing Architecture

**Old (Wrong):**
```
TurnManager triggers controller → Controller executes
```

**New (Correct):**
```
Component mounts → Component calls controller.startPhase() → Controller executes
```

**Why:** Clean separation - TurnManager only handles progression, not orchestration.

### Phase Guard System

Every phase controller MUST include a guard at the start of `startPhase()`:

```typescript
async startPhase() {
  // Phase guard prevents inappropriate initialization
  const guardResult = checkPhaseGuard(TurnPhase.MY_PHASE, 'PhaseController');
  if (guardResult) return guardResult;
  
  // Safe to initialize
  await initializePhaseSteps(steps);
  // ... phase logic
}
```

**Purpose:** Prevents:
- Cross-phase contamination (wrong controller running)
- Component state loss (mid-phase re-initialization)
- Stale step persistence (incorrect steps from other phases)

---

## TurnState Architecture

### Purpose

Consolidates scattered per-turn state into a unified structure:
- Events phase: Roll results, triggered events, outcomes
- Unrest phase: Incident rolls, unrest calculations
- Actions phase: Player action tracking
- All other phase-specific state

### Data Separation

**Persistent across turns** (in KingdomData):
- `ongoingEvents: string[]` - Events continuing across turns
- `activeModifiers: ActiveModifier[]` - Ongoing modifiers

**Turn-specific** (in turnState):
- All phase state (eventsPhase, unrestPhase, etc.)
- Resets at turn boundaries

**Per-phase** (in currentPhaseSteps):
- Managed by PhaseHandler
- Resets at phase boundaries

### Read/Write Pattern

**Read (Components):**
```typescript
$: eventData = $kingdomData.turnState?.eventsPhase?.eventId;
```

**Write (Controllers):**
```typescript
await updateKingdom(k => {
  k.turnState.eventsPhase.eventRolled = true;
  k.turnState.eventsPhase.eventRoll = rollValue;
});
```

---

## Phase Order

1. **STATUS** - Apply ongoing modifiers, check kingdom status
2. **RESOURCES** - Collect resources from worksites
3. **EVENTS** - Perform event check, resolve if triggered
4. **UNREST** - Calculate unrest, check for incidents
5. **ACTIONS** - Players execute kingdom actions
6. **UPKEEP** - Feed settlements, support military, process builds

Each phase has predefined steps tracked by PhaseHandler.

---

## Key Methods Reference

### TurnManager (Progression)

```typescript
// Phase advancement
async nextPhase(): Promise<void>
async setCurrentPhase(phase: TurnPhase): Promise<void>

// Turn management
async endTurn(): Promise<void>
async startNewGame(): Promise<void>

// Utility methods
async getUnrestPenalty(): Promise<number>
async spendFameForReroll(): Promise<boolean>
```

### Step Management (via Helpers)

```typescript
// Controllers use these (not TurnManager directly)
await initializePhaseSteps(steps);
await completePhaseStepByIndex(stepIndex);
const isComplete = await isStepCompletedByIndex(stepIndex);
```

---

## Integration Points

### With Check Instance System

TurnState stores check-related state:
- Event rolls and triggered events
- Incident rolls and triggered incidents
- Player action selections

ActiveCheckInstances store actual check data and outcomes.

### With Phase Controllers

Controllers read/write turnState for phase-specific operations:
```typescript
// Read current state
const eventRolled = kingdom.turnState?.eventsPhase?.eventRolled;

// Update state
await updateKingdom(k => {
  k.turnState.eventsPhase.eventTriggered = true;
  k.turnState.eventsPhase.eventId = eventId;
});
```

### With Typed Modifiers

Turn lifecycle manages modifier durations:
```typescript
// In endTurn()
kingdom.activeModifiers = kingdom.activeModifiers.filter(modifier => {
  if (typeof modifier.duration === 'number') {
    modifier.duration--;
    return modifier.duration > 0;
  }
  return true; // Keep permanent modifiers
});
```

---

## Best Practices

### Controllers

- ✅ Use PhaseControllerHelpers for step management
- ✅ Always include phase guard at start of `startPhase()`
- ✅ Read from turnState, write via `updateKingdom()`
- ✅ Return `{ success: boolean, phaseComplete: boolean }`

### Components

- ✅ Mount triggers controller.startPhase()
- ✅ Detect phaseComplete and call turnManager.nextPhase()
- ✅ Use reactive subscriptions to turnState for display
- ✅ Never perform business logic

### TurnState

- ✅ Reset at turn boundaries via StatusPhaseController
- ✅ Persist across phase navigation within same turn
- ✅ All per-turn UI state goes here
- ✅ Never bypass with local component state

---

## Summary

The Turn and Phase System provides:

- ✅ Structured turn progression through 6 phases
- ✅ Clear phase lifecycle with step tracking
- ✅ Unified per-turn state management (turnState)
- ✅ Self-executing phase architecture
- ✅ Phase guard protection against state corruption
- ✅ Clean separation between progression and execution

This architecture ensures predictable turn flow, maintainable phase logic, and robust multi-client synchronization.
