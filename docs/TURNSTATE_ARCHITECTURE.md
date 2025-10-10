# TurnState Architecture Reference

## Overview

`turnState` is the single source of truth for all per-turn UI state in the kingdom system. It consolidates scattered fields into a unified, type-safe, persistent structure.

## Core Principles

### 1. Single Source of Truth
- **KingdomActor** stores `turnState` in persistent flags (Foundry VTT)
- All per-turn state lives in `turnState` (events, incidents, player actions, etc.)
- Components read from `turnState`, controllers write to `turnState`
- No dual-write complexity, no scattered fields

### 2. Data Flow
```
Read:  KingdomActor → turnState → Stores → Components
Write: Components → Controllers → updateKingdom() → KingdomActor → Foundry Sync → All Clients
Reset: StatusPhaseController.ensureTurnState() → Creates fresh turnState when turn advances
```

### 3. Lifecycle
- **Created:** StatusPhaseController initializes `turnState` on first run or turn advance
- **Persists:** For entire turn (survives refresh, phase navigation, multi-client sync)
- **Resets:** Only when `kingdom.currentTurn !== turnState.turnNumber` (turn advances)

## Structure

```typescript
interface TurnState {
  turnNumber: number;  // Used to detect turn advancement
  statusPhase: StatusPhaseState;
  resourcesPhase: ResourcesPhaseState;
  unrestPhase: UnrestPhaseState;
  eventsPhase: EventsPhaseState;
  actionsPhase: ActionsPhaseState;
  upkeepPhase: UpkeepPhaseState;
}
```

Each phase has its own isolated state object with all data it needs.

## Key Components

### StatusPhaseController
- **Responsibility:** Initialize/reset `turnState` at turn start
- **Method:** `ensureTurnState()`
  - If `!turnState` → create new (first run or legacy save)
  - If `turnState.turnNumber !== currentTurn` → reset (turn advanced)
  - Otherwise → do nothing (phase navigation within same turn)

### Phase Controllers
- **Read from:** `kingdom.turnState.{phase}.*`
- **Write to:** `await updateKingdom(k => k.turnState.{phase}.field = value)`
- **Never:** Directly mutate or create local copies

### TurnManager
- **Stateless:** No in-memory maps or caches
- **Role:** Turn/phase progression only
- **Does NOT:** Store player actions or manage turnState

### Components (Svelte)
- **Reactive:** `$: data = $kingdomData.turnState?.{phase}?.field`
- **Display only:** No business logic
- **Delegate:** Call controllers for mutations

## Example: Events Phase

### Data Structure
```typescript
eventsPhase: {
  eventRolled: boolean;
  eventRoll: number | null;
  eventTriggered: boolean;
  eventId: string | null;
  eventDC: number;
  appliedOutcomes: AppliedOutcome[];
}
```

### Flow
1. **EventPhaseController.performEventCheck()**
   - Rolls d20 vs DC
   - Writes result to `turnState.eventsPhase.*`
   
2. **CheckResultHandler.handleEventOutcome()**
   - Stores outcome in `turnState.eventsPhase.appliedOutcomes`
   
3. **EventsPhase.svelte**
   - Loads event from `$kingdomData.turnState?.eventsPhase?.eventId`
   - Displays applied outcomes from `$kingdomData.turnState?.eventsPhase?.appliedOutcomes`
   
4. **StatusPhaseController (next turn)**
   - Detects turn advance → resets `turnState`

## Architecture Status

✅ **Clean Single Source of Truth** - No legacy fields, no dual writes, no sync issues

### Data Separation
**Persistent across turns** (in `KingdomData`):
- ✅ `ongoingEvents: string[]` - Event IDs that continue across turns
- ✅ `activeModifiers: ActiveModifier[]` - Ongoing modifiers from events/structures

**Turn-specific** (in `turnState`):
- ✅ `turnState.eventsPhase.*` - Current turn's event state
- ✅ `turnState.unrestPhase.*` - Current turn's incident state
- ✅ `turnState.actionsPhase.playerActions` - Current turn's action tracking
- ✅ All other phase-specific state

**Per-phase** (in `currentPhaseSteps`):
- ✅ `currentPhaseSteps: PhaseStep[]` - Managed by PhaseHandler


## Key Files

- **Type Definitions:** `src/models/TurnState.ts`
- **Initialization:** `src/controllers/StatusPhaseController.ts`
- **Event Usage:** `src/controllers/EventPhaseController.ts`, `src/view/kingdom/turnPhases/EventsPhase.svelte`
- **Incident Usage:** `src/controllers/UnrestPhaseController.ts`, `src/view/kingdom/turnPhases/UnrestPhase.svelte`
- **Persistence:** `src/actors/KingdomActor.ts` (via Foundry flags)
