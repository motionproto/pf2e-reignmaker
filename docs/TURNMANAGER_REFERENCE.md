# TurnManager Reference & Game Orchestration

## Overview

This document provides comprehensive documentation for the **TurnManager** class and explains how the kingdom turn system is orchestrated from initialization through turn progression and phase management.

## Table of Contents

1. [TurnManager Architecture](#turnmanager-architecture)
2. [Game Orchestration Flow](#game-orchestration-flow)
3. [Turn Lifecycle](#turn-lifecycle)
4. [Phase Lifecycle](#phase-lifecycle)
5. [Complete API Reference](#complete-api-reference)
6. [Integration Points](#integration-points)
7. [Best Practices](#best-practices)

---

## TurnManager Architecture

### Purpose & Responsibilities

**TurnManager** is the central coordinator for all turn-scoped state in the kingdom system. It serves as the single source of truth for:

- **Turn Progression**: Managing turn numbers and turn end/start
- **Phase Progression**: Coordinating movement through the 6 kingdom phases
- **Step Management**: Tracking completion of steps within each phase (via PhaseHandler)
- **Player Actions**: Managing which players have spent their actions per turn
- **Once-Per-Turn Actions**: Tracking actions that can only be performed once per turn

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                  Svelte Components                       │
│              (UI Layer - Presentation)                   │
│   - KingdomSheet.svelte                                  │
│   - Phase Components (StatusPhase, EventPhase, etc.)     │
└────────────────────┬────────────────────────────────────┘
                     │ calls methods on
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Phase Controllers                           │
│           (Business Logic Layer)                         │
│   - StatusPhaseController                                │
│   - EventPhaseController                                 │
│   - UnrestPhaseController, etc.                          │
└────────────────────┬────────────────────────────────────┘
                     │ uses helpers from
                     ↓
┌─────────────────────────────────────────────────────────┐
│          PhaseControllerHelpers                          │
│     (Convenience Layer - Utility Functions)              │
│   - initializePhaseSteps()                               │
│   - completePhaseStepByIndex()                           │
│   - isStepCompletedByIndex()                             │
└────────────────────┬────────────────────────────────────┘
                     │ creates instances & delegates to
                     ↓
┌─────────────────────────────────────────────────────────┐
│               TurnManager                                │
│        (Coordination Layer - Business Logic)             │
│   - Phase progression (nextPhase, setCurrentPhase)       │
│   - Turn management (endTurn, incrementTurn)             │
│   - Delegates step logic to PhaseHandler                 │
└────────────────────┬────────────────────────────────────┘
                     │ delegates step operations to
                     ↓
┌─────────────────────────────────────────────────────────┐
│              PhaseHandler                                │
│       (Step Management - Static Utility Class)           │
│   - initializePhaseSteps()                               │
│   - completePhaseStepByIndex()                           │
│   - isStepCompletedByIndex()                             │
└────────────────────┬────────────────────────────────────┘
                     │ reads/writes via
                     ↓
┌─────────────────────────────────────────────────────────┐
│              KingdomStore                                │
│         (Store Access Layer - updateKingdom)             │
│   - updateKingdom() for writes                           │
│   - kingdomData store for reads                          │
└────────────────────┬────────────────────────────────────┘
                     │ persists to
                     ↓
┌─────────────────────────────────────────────────────────┐
│             KingdomActor                                 │
│      (Data Layer - Single Source of Truth)               │
│   - Foundry VTT actor with kingdom data flag             │
│   - Persisted to Foundry database                        │
└─────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Single Coordinator**: TurnManager is instantiated once and coordinates all turn/phase operations
2. **Modular Delegation**: Step logic is delegated to PhaseHandler (utility class)
3. **No Direct Data Access**: TurnManager uses `updateKingdom()` and stores, never accesses KingdomActor directly
4. **Controller Abstraction**: Controllers use PhaseControllerHelpers, not TurnManager directly
5. **Event-Driven UI**: TurnManager triggers callbacks (`onPhaseChanged`, `onTurnChanged`) for UI updates

---

## Game Orchestration Flow

### System Initialization

```
1. Foundry VTT loads module
   └→ src/index.ts registers module hooks

2. Kingdom sheet opened by user
   └→ KingdomSheet.svelte component initializes
      ├→ Subscribes to kingdomData store
      ├→ Subscribes to kingdomActor store
      └→ Creates TurnManager instance (singleton via KingdomStore)

3. TurnManager constructor runs
   └→ initializePlayers() - sets up player action tracking
      └→ Reads game.users and creates PlayerAction map

4. Current phase component mounts
   └→ Based on kingdom.currentPhase, appropriate phase component renders
      └→ Phase component onMount() triggers controller.startPhase()
```

### Turn Flow (High-Level)

```
Turn N Start (STATUS phase)
   ↓
1. STATUS phase executes
   - Apply ongoing modifiers
   - Process resource decay
   - Auto-complete phase
   ↓ nextPhase() called
   
2. RESOURCES phase executes
   - Player collects kingdom resources
   - Phase step completed manually
   ↓ nextPhase() called
   
3. EVENTS phase executes
   - Event check performed
   - If event triggered, add resolve step
   - Player resolves event (or fails)
   ↓ nextPhase() called
   
4. UNREST phase executes
   - Calculate unrest display
   - Check for incidents
   - If incident triggered, player resolves
   ↓ nextPhase() called
   
5. ACTION phase executes
   - Players perform kingdom actions
   - GM marks actions complete when done
   ↓ nextPhase() called
   
6. UPKEEP phase executes
   - Feed settlements (resource cost)
   - Support military (if armies exist)
   - Process build queue (if buildings in progress)
   ↓ nextPhase() called
   
7. nextPhase() detects end of PHASE_ORDER
   ↓ calls endTurn()
   
8. endTurn() logic
   - Increment currentTurn
   - Reset to STATUS phase
   - Reset player actions
   - Clear oncePerTurnActions
   - Decrement modifier durations
   - Trigger callbacks (onTurnChanged, onPhaseChanged)
   ↓
Turn N+1 Start (STATUS phase)
```

### Component-Controller-TurnManager Interaction

```
┌──────────────────────────────────────────────────────────┐
│  Phase Component (e.g., UnrestPhase.svelte)              │
│                                                           │
│  onMount(async () => {                                    │
│    // 1. Create controller                               │
│    const controller = await createUnrestPhaseController();│
│                                                           │
│    // 2. Start phase (initializes steps)                 │
│    const result = await controller.startPhase();         │
│    // controller.startPhase() calls:                     │
│    //   - initializePhaseSteps(UNREST_PHASE_STEPS)       │
│    //   - Auto-completes 'show-unrest' step              │
│    //   - Returns { success: true, phaseComplete: false }│
│                                                           │
│    // 3. User performs incident check                     │
│    // Component calls controller.performIncidentCheck()   │
│    const checkResult = await controller.performCheck();  │
│    // Returns { triggered: true/false, incident: ... }   │
│                                                           │
│    // 4. If incident, add resolve step dynamically       │
│    // 5. User resolves incident                          │
│    const resolveResult = await controller.resolveIncident();│
│    // This completes the last step                       │
│    // Returns { success: true, phaseComplete: true }     │
│                                                           │
│    // 6. Detect phase complete and advance               │
│    if (resolveResult.phaseComplete) {                    │
│      const turnManager = getTurnManager();               │
│      await turnManager.nextPhase();                      │
│      // TurnManager:                                     │
│      //   - Resets currentPhaseSteps = []                │
│      //   - Sets currentPhase = 'action'                 │
│      //   - Triggers onPhaseChanged callback             │
│    }                                                      │
│  });                                                      │
└──────────────────────────────────────────────────────────┘
```

---

## Turn Lifecycle

### Turn Start Sequence

When a new turn begins (either game start or after `endTurn()`):

```typescript
// In TurnManager.endTurn() or startNewGame()

1. Increment turn number
   kingdom.currentTurn++ 

2. Reset to STATUS phase
   kingdom.currentPhase = TurnPhase.STATUS

3. Clear phase state
   kingdom.currentPhaseSteps = []
   kingdom.currentPhaseStepIndex = 0
   kingdom.phaseComplete = false

4. Reset turn-scoped state
   kingdom.oncePerTurnActions = []
   
5. Reset player actions
   for (const [playerId, action] of playerActions) {
     action.actionSpent = false
     action.spentInPhase = undefined
   }

6. Process modifier durations
   kingdom.modifiers = kingdom.modifiers.filter(modifier => {
     if (typeof modifier.duration === 'number') {
       remainingTurns--
       return remainingTurns > 0
     }
     return true // Keep permanent modifiers
   })

7. Trigger callbacks
   onTurnChanged(newTurnNumber)
   onPhaseChanged(TurnPhase.STATUS)

8. UI updates automatically via store subscriptions
```

### Turn End Conditions

A turn ends when:

1. **All phases completed**: UPKEEP phase finishes and `nextPhase()` is called
2. **Manual skip**: GM/user calls `turnManager.endTurn()` directly (debugging/special cases)

**Important**: The system does NOT auto-end turns. Phase components must call `nextPhase()` when their phase completes.

---

## Phase Lifecycle

### Phase Start

```typescript
// When phase component mounts

1. Component detects current phase matches
   if ($kingdomData.currentPhase === 'unrest')

2. Create phase controller
   const controller = await createUnrestPhaseController()

3. Controller initializes phase
   await controller.startPhase()
   
   Inside startPhase():
   ├─ await initializePhaseSteps(PHASE_STEPS)
   │  └─ TurnManager.initializePhaseSteps()
   │     └─ PhaseHandler.initializePhaseSteps()
   │        └─ updateKingdom(kingdom => {
   │              kingdom.currentPhaseSteps = [
   │                { name: 'Calculate Unrest', completed: 0 },
   │                { name: 'Check for Incidents', completed: 0 }
   │              ]
   │              kingdom.currentPhaseStepIndex = 0
   │              kingdom.currentStepName = 'Calculate Unrest'
   │              kingdom.phaseComplete = false
   │           })
   │
   ├─ Execute phase-specific logic
   │  (e.g., auto-calculate unrest, auto-complete first step)
   │
   └─ Return { success: true, phaseComplete: false }
```

### Step Completion

```typescript
// When controller completes a step

1. Controller calls helper
   const result = await completePhaseStepByIndex(0)

2. Helper creates TurnManager
   const turnManager = new TurnManager()
   
3. TurnManager delegates to PhaseHandler
   return await PhaseHandler.completePhaseStepByIndex(0)

4. PhaseHandler updates kingdom data
   updateKingdom(kingdom => {
     // Mark step completed
     kingdom.currentPhaseSteps[0].completed = 1
     
     // Find next incomplete step
     const nextIndex = kingdom.currentPhaseSteps.findIndex(
       (s, i) => i > 0 && s.completed === 0
     )
     
     if (nextIndex >= 0) {
       // More steps remaining
       kingdom.currentPhaseStepIndex = nextIndex
       kingdom.currentStepName = kingdom.currentPhaseSteps[nextIndex].name
     } else {
       // All steps complete
       kingdom.currentPhaseStepIndex = kingdom.currentPhaseSteps.length
       kingdom.currentStepName = 'Phase Complete'
     }
   })

5. Check if all steps done
   const totalSteps = kingdom.currentPhaseSteps.length
   const completedCount = kingdom.currentPhaseSteps.filter(s => s.completed === 1).length
   const phaseComplete = (totalSteps > 0 && completedCount === totalSteps)

6. Update phaseComplete flag
   updateKingdom(kingdom => {
     kingdom.phaseComplete = phaseComplete
   })

7. Return completion status
   return { success: true, phaseComplete }
```

### Phase Advancement

```typescript
// When component detects phase complete

1. Component watches for completion
   if (result.phaseComplete) {
     const turnManager = getTurnManager()
     await turnManager.nextPhase()
   }

2. TurnManager.nextPhase() logic
   ├─ Get current phase
   │  const currentPhase = kingdom.currentPhase
   │
   ├─ Reset phase steps FIRST (critical!)
   │  await this.resetPhaseSteps()
   │  └─ updateKingdom(kingdom => {
   │       kingdom.currentPhaseSteps = []
   │       kingdom.currentPhaseStepIndex = 0
   │       kingdom.phaseComplete = false
   │     })
   │
   ├─ Calculate next phase
   │  const next = await this.getNextPhase(currentPhase)
   │  // Uses PHASE_ORDER array to find next
   │
   ├─ Check if end of turn
   │  if (next === null) {
   │    await this.endTurn()
   │    return
   │  }
   │
   ├─ Update to next phase
   │  updateKingdom(kingdom => {
   │    kingdom.currentPhase = next
   │  })
   │
   └─ Trigger callback
      this.onPhaseChanged?.(next)
      // UI reacts to phase change via store subscription
```

### Dynamic Step Addition

Some phases (Events, Unrest) add steps dynamically:

```typescript
// In EventPhaseController.performEventCheck()

1. Perform the check
   const eventTriggered = await this.checkForEvent()

2. If event triggered, add resolve step
   if (eventTriggered) {
     await updateKingdom(kingdom => {
       const hasResolveStep = kingdom.currentPhaseSteps.some(
         s => s.name === 'Resolve Event'
       )
       
       if (!hasResolveStep) {
         kingdom.currentPhaseSteps.push({
           name: 'Resolve Event',
           completed: 0
         })
       }
     })
   }

3. Complete the check step
   await completePhaseStepByIndex(0)
   // Phase is NOT complete yet (resolve step remains)

4. Later, when event resolved
   await completePhaseStepByIndex(1)
   // Now phaseComplete: true
```

---

## Complete API Reference

### TurnManager Constructor

```typescript
constructor()
```

**Purpose**: Creates TurnManager instance and initializes player tracking

**Side Effects**:
- Calls `initializePlayers()` to set up player action map
- Logs initialization to console

**Usage**:
```typescript
const turnManager = new TurnManager();
```

### Phase Progression Methods

#### `nextPhase()`

```typescript
async nextPhase(): Promise<void>
```

**Purpose**: Advance to the next phase in PHASE_ORDER, or end turn if at last phase

**Logic**:
1. Resets phase steps (clears `currentPhaseSteps`)
2. Calculates next phase from PHASE_ORDER
3. Updates `currentPhase` in KingdomActor
4. If end of turn, calls `endTurn()` instead
5. Triggers `onPhaseChanged` callback

**Usage**:
```typescript
const turnManager = getTurnManager();
await turnManager.nextPhase();
```

#### `setCurrentPhase(phase)`

```typescript
async setCurrentPhase(phase: TurnPhase): Promise<void>
```

**Purpose**: Set phase directly (for testing/special cases)

**Parameters**:
- `phase`: The phase to set (e.g., `TurnPhase.ACTION`)

**Side Effects**:
- Updates `kingdom.currentPhase`
- Triggers `onPhaseChanged` callback

**Usage**:
```typescript
await turnManager.setCurrentPhase(TurnPhase.EVENTS);
```

#### `skipToPhase(phase)`

```typescript
async skipToPhase(phase: TurnPhase): Promise<void>
```

**Purpose**: Skip directly to a specific phase (for testing/debugging)

**Parameters**:
- `phase`: The phase to skip to

**Usage**:
```typescript
await turnManager.skipToPhase(TurnPhase.UPKEEP);
```

#### `getCurrentPhase()`

```typescript
async getCurrentPhase(): Promise<string>
```

**Purpose**: Get the current phase

**Returns**: Current phase string (e.g., 'status', 'events')

**Usage**:
```typescript
const phase = await turnManager.getCurrentPhase();
```

#### `markPhaseComplete()`

```typescript
async markPhaseComplete(): Promise<void>
```

**Purpose**: Mark phase as complete (logging only, doesn't advance)

**Side Effects**:
- Logs completion message
- Triggers `onPhaseChanged` callback

**Note**: This does NOT call `nextPhase()`. Components must do that explicitly.

### Step Management Methods (Delegates to PhaseHandler)

#### `initializePhaseSteps(steps)`

```typescript
async initializePhaseSteps(steps: Array<{ name: string; completed?: 0 | 1 }>): Promise<void>
```

**Purpose**: Initialize phase with step definitions

**Parameters**:
- `steps`: Array of step objects with `name` and optional `completed` status

**Side Effects**:
- Sets `kingdom.currentPhaseSteps`
- Sets `kingdom.currentPhaseStepIndex`
- Sets `kingdom.currentStepName`
- Sets `kingdom.phaseComplete`

**Usage**:
```typescript
await turnManager.initializePhaseSteps([
  { name: 'Calculate Unrest' },
  { name: 'Check for Incidents' }
]);
```

#### `completePhaseStepByIndex(stepIndex)`

```typescript
async completePhaseStepByIndex(stepIndex: number): Promise<{ phaseComplete: boolean }>
```

**Purpose**: Complete a step by its index

**Parameters**:
- `stepIndex`: Zero-based index of step to complete

**Returns**: Object with `phaseComplete` boolean

**Logic**:
1. Marks `kingdom.currentPhaseSteps[stepIndex].completed = 1`
2. Finds next incomplete step
3. Updates `currentPhaseStepIndex` and `currentStepName`
4. Checks if all steps done
5. Sets `kingdom.phaseComplete`

**Usage**:
```typescript
const result = await turnManager.completePhaseStepByIndex(0);
if (result.phaseComplete) {
  await turnManager.nextPhase();
}
```

#### `isStepCompletedByIndex(stepIndex)`

```typescript
async isStepCompletedByIndex(stepIndex: number): Promise<boolean>
```

**Purpose**: Check if a step is completed

**Parameters**:
- `stepIndex`: Zero-based index of step

**Returns**: `true` if step completed, `false` otherwise

**Usage**:
```typescript
const isDone = await turnManager.isStepCompletedByIndex(0);
```

#### `isCurrentPhaseComplete()`

```typescript
async isCurrentPhaseComplete(): Promise<boolean>
```

**Purpose**: Check if all steps in current phase are complete

**Returns**: `true` if all steps done, `false` otherwise

**Usage**:
```typescript
const allDone = await turnManager.isCurrentPhaseComplete();
```

### Turn Management Methods

#### `endTurn()`

```typescript
async endTurn(): Promise<void>
```

**Purpose**: End current turn and start new one

**Logic**:
1. Logs turn end
2. Triggers `onTurnEnded` callback
3. Resets all player actions
4. Increments `kingdom.currentTurn`
5. Sets `kingdom.currentPhase = STATUS`
6. Clears phase steps
7. Clears `oncePerTurnActions`
8. Decrements modifier durations (filters expired)
9. Triggers `onTurnChanged` and `onPhaseChanged` callbacks

**Usage**:
```typescript
await turnManager.endTurn();
```

#### `incrementTurn()`

```typescript
async incrementTurn(): Promise<void>
```

**Purpose**: Manually increment turn number (without full reset)

**Side Effects**:
- Increments `kingdom.currentTurn`
- Triggers `onTurnChanged` callback

**Usage**:
```typescript
await turnManager.incrementTurn();
```

#### `startNewGame()`

```typescript
async startNewGame(): Promise<void>
```

**Purpose**: Reset kingdom to turn 1 (fresh start)

**Side Effects**:
- Sets `kingdom.currentTurn = 1`
- Sets `kingdom.currentPhase = STATUS`
- Clears phase steps
- Clears `oncePerTurnActions`
- Resets `kingdom.unrest = 0`
- Resets `kingdom.fame = 0`
- Triggers callbacks

**Usage**:
```typescript
await turnManager.startNewGame();
```

### Player Action Management

#### `spendPlayerAction(playerId, phase)`

```typescript
spendPlayerAction(playerId: string, phase: TurnPhase): boolean
```

**Purpose**: Mark a player as having spent their action in a phase

**Parameters**:
- `playerId`: User ID of the player
- `phase`: Phase in which action was spent

**Returns**: `true` if action spent successfully, `false` if already spent

**Usage**:
```typescript
const success = turnManager.spendPlayerAction(userId, TurnPhase.ACTION);
```

#### `resetPlayerAction(playerId)`

```typescript
resetPlayerAction(playerId: string): void
```

**Purpose**: Reset a specific player's action (allow them to act again)

**Parameters**:
- `playerId`: User ID of the player

**Usage**:
```typescript
turnManager.resetPlayerAction(userId);
```

#### `getPlayerAction(playerId)`

```typescript
getPlayerAction(playerId: string): PlayerAction | undefined
```

**Purpose**: Get a player's current action state

**Parameters**:
- `playerId`: User ID of the player

**Returns**: PlayerAction object or undefined

**PlayerAction Type**:
```typescript
interface PlayerAction {
  playerId: string;
  playerName: string;
  actionSpent: boolean;
  spentInPhase?: TurnPhase;
}
```

**Usage**:
```typescript
const action = turnManager.getPlayerAction(userId);
if (action?.actionSpent) {
  console.log(`Player already acted in ${action.spentInPhase}`);
}
```

### Once-Per-Turn Action Management

#### `canPerformAction(actionId)`

```typescript
async canPerformAction(actionId: string): Promise<boolean>
```

**Purpose**: Check if a once-per-turn action is available

**Parameters**:
- `actionId`: Unique identifier for the action

**Returns**: `true` if action not yet used this turn

**Usage**:
```typescript
const canUse = await turnManager.canPerformAction('collect-resources');
```

#### `markActionUsed(actionId)`

```typescript
async markActionUsed(actionId: string): Promise<void>
```

**Purpose**: Mark a once-per-turn action as used

**Parameters**:
- `actionId`: Unique identifier for the action

**Side Effects**:
- Adds actionId to `kingdom.oncePerTurnActions` array

**Usage**:
```typescript
await turnManager.markActionUsed('collect-resources');
```

### Utility Methods

#### `getUnrestPenalty()`

```typescript
async getUnrestPenalty(): Promise<number>
```

**Purpose**: Calculate penalty from current unrest level

**Returns**: Penalty value (0, -1, -2, or -3)

**Logic**:
- Unrest 0-2: 0 penalty
- Unrest 3-5: -1 penalty
- Unrest 6-8: -2 penalty
- Unrest 9+: -3 penalty

**Usage**:
```typescript
const penalty = await turnManager.getUnrestPenalty();
```

#### `spendFameForReroll()`

```typescript
async spendFameForReroll(): Promise<boolean>
```

**Purpose**: Spend 1 Fame point for a reroll

**Returns**: `true` if Fame spent successfully, `false` if insufficient Fame

**Side Effects**:
- Decrements `kingdom.fame` by 1

**Usage**:
```typescript
const success = await turnManager.spendFameForReroll();
if (success) {
  // Allow reroll
}
```

#### `getTurnSummary()`

```typescript
async getTurnSummary(): Promise<string>
```

**Purpose**: Get human-readable summary of current turn state

**Returns**: String like "Turn 5 - events"

**Usage**:
```typescript
const summary = await turnManager.getTurnSummary();
console.log(summary); // "Turn 5 - events"
```

#### `resetPhaseSteps()`

```typescript
async resetPhaseSteps(): Promise<void>
```

**Purpose**: Clear all phase step state

**Side Effects**:
- Sets `kingdom.currentPhaseSteps = []`
- Sets `kingdom.currentPhaseStepIndex = 0`
- Sets `kingdom.phaseComplete = false`

**Usage**:
```typescript
await turnManager.resetPhaseSteps();
```

#### `forceResetCurrentPhaseSteps()`

```typescript
async forceResetCurrentPhaseSteps(): Promise<void>
```

**Purpose**: Force reset phase steps (for testing/debugging)

**Side Effects**: Same as `resetPhaseSteps()`

**Usage**:
```typescript
await turnManager.forceResetCurrentPhaseSteps();
```

### Callbacks

TurnManager supports event callbacks for UI updates:

```typescript
interface TurnManager {
  onTurnChanged?: (turn: number) => void;
  onPhaseChanged?: (phase: TurnPhase) => void;
  onTurnEnded?: (turn: number) => void;
}
```

**Usage**:
```typescript
const turnManager = new TurnManager();

turnManager.onPhaseChanged = (phase) => {
  console.log(`Phase changed to: ${phase}`);
  // Update UI
};

turnManager.onTurnChanged = (turn) => {
  console.log(`Turn changed to: ${turn}`);
  // Update UI
};

turnManager.onTurnEnded = (turn) => {
  console.log(`Turn ${turn} ended`);
  // Show summary
};
```

---

## Integration Points

### KingdomStore

TurnManager is accessed through KingdomStore:

```typescript
import { getTurnManager } from '../stores/KingdomStore';

const turnManager = getTurnManager();
if (turnManager) {
  await turnManager.nextPhase();
}
```

**Singleton Pattern**: KingdomStore maintains a single TurnManager instance (`turnManagerInstance`)

### Phase Components

Phase components mount when their phase becomes active:

```typescript
// In UnrestPhase.svelte
onMount(async () => {
  if ($kingdomData.currentPhase === 'unrest') {
    const controller = await createUnrestPhaseController();
    await controller.startPhase();
  }
});
```

### Phase Controllers

Controllers use PhaseControllerHelpers, NOT TurnManager directly:

```typescript
import {
  initializePhaseSteps,
  completePhaseStepByIndex
} from './shared/PhaseControllerHelpers';

export async function createUnrestPhaseController() {
  return {
    async startPhase() {
      await initializePhaseSteps(UNREST_PHASE_STEPS);
      // ...
    }
  };
}
```

### KingdomActor

All persistent state lives in KingdomActor:

```typescript
interface KingdomData {
  currentTurn: number;
  currentPhase: TurnPhase;
  currentPhaseSteps: PhaseStep[];
  currentPhaseStepIndex: number;
  currentStepName: string;
  phaseComplete: boolean;
  oncePerTurnActions: string[];
  // ... other kingdom data
}
```

TurnManager NEVER accesses KingdomActor directly. It uses:
- `updateKingdom()` for writes
- `get(kingdomData)` for reads

---

## Best Practices

### DO

✅ **Access TurnManager via KingdomStore**
```typescript
const turnManager = getTurnManager();
```

✅ **Use PhaseControllerHelpers in controllers**
```typescript
await initializePhaseSteps(PHASE_STEPS);
await completePhaseStepByIndex(0);
```

✅ **Call nextPhase() when phase complete**
```typescript
if (result.phaseComplete) {
  await turnManager.nextPhase();
}
```

✅ **Let TurnManager handle step state**
```typescript
// TurnManager/PhaseHandler manages this automatically
await completePhaseStepByIndex(0);
```

✅ **Use callbacks for UI updates**
```typescript
turnManager.onPhaseChanged = (phase) => {
  // React to phase change
};
```

### DON'T

❌ **Don't create multiple TurnManager instances**
```typescript
// BAD - creates duplicate state
const tm1 = new TurnManager();
const tm2 = new TurnManager();
```

❌ **Don't bypass helpers in controllers**
```typescript
// BAD - controllers should use helpers
const turnManager = new TurnManager();
await turnManager.completePhaseStepByIndex(0);
```

❌ **Don't manually update kingdom phase**
```typescript
// BAD - bypasses TurnManager coordination
await updateKingdom(kingdom => {
  kingdom.currentPhase = 'action';
});
```

❌ **Don't assume auto-progression**
```typescript
// BAD - phase won't advance automatically
await completePhaseStepByIndex(1);
// Component must call nextPhase() explicitly
```

❌ **Don't access KingdomActor directly in TurnManager**
```typescript
// BAD - breaks abstraction
const actor = getKingdomActor();
actor.update({ ... });
```

---

## Summary

**TurnManager** orchestrates the entire kingdom turn system:

1. **Initialization**: Creates player tracking, sets up callbacks
2. **Phase Flow**: Manages progression through 6 phases
3. **Step Tracking**: Delegates to PhaseHandler for step management
4. **Turn Lifecycle**: Handles turn end, resets state, manages durations
5. **Player Actions**: Tracks action spending and once-per-turn actions
6. **UI Coordination**: Triggers callbacks for reactive UI updates

The system follows a clean separation:
- **TurnManager**: Coordination & progression
- **PhaseHandler**: Step management utility
- **PhaseControllerHelpers**: Convenience layer for controllers
- **KingdomActor**: Persistent data storage

This architecture ensures maintainability, testability, and clear separation of concerns throughout the kingdom turn system.
