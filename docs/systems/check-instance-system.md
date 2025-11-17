# Outcome Preview System

**Purpose:** Unified architecture for all check-based gameplay (events, incidents, player actions)

---

## Overview

The Outcome Preview System provides a single, consistent flow for all kingdom checks:
1. Create outcome preview
2. Player performs skill check
3. User interacts with outcome (dice, choices)
4. Controller applies results
5. Phase advances

**Key Principle:** All check types (events, incidents, actions) use the same architecture and data structures.

---

## Architecture Components

### OutcomePreview (Data Structure)

**Storage:** `KingdomActor.pendingOutcomes: OutcomePreview[]`

```typescript
interface OutcomePreview {
  // Identity
  previewId: string;
  checkType: 'event' | 'incident' | 'action';
  checkId: string;
  checkData: KingdomEvent | KingdomIncident | PlayerAction;
  
  // Lifecycle
  createdTurn: number;
  status: 'pending' | 'resolved' | 'applied';
  
  // Resolution tracking (multi-player coordination)
  resolutionProgress?: {
    playerId: string;
    playerName: string;
    timestamp: number;
    outcome: string;
    selectedChoices: number[];
    rolledDice: Record<string, number>;
  };
  
  // Applied outcome (syncs across clients)
  appliedOutcome?: {
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    actorName: string;
    skillName: string;
    effect: string;
    modifiers: EventModifier[];
    manualEffects: string[];
    shortfallResources: string[];
    effectsApplied: boolean;
  };
}
```

### OutcomePreviewService

**Role:** Central service for outcome preview lifecycle management

**Key Methods:**
- `createInstance()` - Create new outcome preview
- `storeOutcome()` - Record resolution after skill check
- `markApplied()` - Mark effects as applied
- `clearCompleted()` - Cleanup at phase boundaries

**Pattern:** Controllers always use OutcomePreviewService, never manipulate `pendingOutcomes` directly.

### BaseCheckCard (UI Component)

**Role:** Unified display component for all check types

**Features:**
- Skill selection
- Roll execution via Foundry VTT
- Outcome display with OutcomeDisplay component
- Application triggers

**Pattern:** Same component for events, incidents, and actions - behavior driven by `checkType` prop.

---

## Data Flow

### 1. Creation (Pending)

```
Controller.performCheck()
  → OutcomePreviewService.createInstance()
    → Stores in pendingOutcomes[] with status: 'pending'
      → UI displays check card
```

**Example (Events Phase):**
```typescript
// User clicks "Roll for Event"
const previewId = await outcomePreviewService.createInstance(
  'event',
  eventId,
  eventData,
  currentTurn
);
// Preview appears in UI immediately
```

### 2. Resolution (Resolved)

```
User selects skill
  → CheckHandler executes PF2e roll
    → Controller.resolveCheck()
      → OutcomePreviewService.storeOutcome()
        → Status changes to 'resolved'
          → OutcomeDisplay shows interactive resolution
```

**Key Point:** OutcomeDisplay handles all user interaction (dice rolling, choices, resource selection) before controller applies effects.

### 3. Application (Applied)

```
User resolves all interactions (dice, choices)
  → User clicks "Apply Result"
    → Controller applies effects via GameEffectsService
      → OutcomePreviewService.markApplied()
        → Status changes to 'applied'
          → UI shows completion badge
```

### 4. Cleanup

```
Phase entry (next turn or next phase)
  → Controller.startPhase()
    → OutcomePreviewService.clearCompleted()
      → Removes 'resolved' and 'applied' previews
        → Only 'pending' previews remain (ongoing events)
```

---

## Check Type Variations

### Events (Events Phase)

**Characteristics:**
- Can be immediate (ends after resolution) or ongoing (persists across turns)
- Ongoing events remain `status: 'pending'` until resolved
- `endsEvent` flag in outcome determines persistence

**Display Sections:**
- Current event (from turnState)
- Ongoing events (filtered: `status === 'pending'`)
- Resolved this turn (filtered: `status === 'resolved'`)

### Incidents (Unrest Phase)

**Characteristics:**
- Always immediate (resolved in same turn)
- No ongoing concept
- Clears on next Unrest phase entry

**Display:**
- Single incident card (first in array)
- No multiple display sections

### Player Actions (Actions Phase)

**Characteristics:**
- Similar to incidents (immediate resolution)
- Multiple actions possible per turn
- Tracked separately from events/incidents

**Display:**
- Action selection UI
- Check cards for each action performed

---

## Multi-Client Synchronization

### Resolution Progress

When a player starts resolving a check:
- `resolutionProgress` field populated with player info
- Other clients see "Being resolved by [playerName]"
- Resolution controls disabled for other players

### Applied State

When effects are applied:
- `appliedOutcome.effectsApplied = true`
- All clients see "✓ Applied" badge
- Effects sync to all clients via Foundry VTT

---

## Integration with Other Systems

### With Typed Modifiers

Outcome previews store outcomes with typed modifiers:
- `StaticModifier` - Direct numeric values
- `DiceModifier` - User rolls dice
- `ChoiceModifier` - User selects from options

OutcomeDisplay handles all modifier types automatically.

### With Turn/Phase System

Outcome previews are turn-scoped:
- Created during phase execution
- Persist across phase navigation (within same turn)
- Cleaned up at phase boundaries

### With Phase Controllers

Controllers coordinate outcome preview lifecycle:
```typescript
// Pattern: All check-based controllers
async performCheck() {
  const previewId = await outcomePreviewService.createInstance(...);
  // Preview is now pending
}

async resolveCheck(previewId, outcome, resolutionData) {
  await gameEffectsService.applyResolution(resolutionData);
  await outcomePreviewService.markApplied(previewId);
  await completePhaseStepByIndex(stepIndex);
}
```

---

## Best Practices

### Controllers
- ✅ Use OutcomePreviewService for all check operations
- ✅ Never manipulate `pendingOutcomes` directly
- ✅ Return `{ success: boolean, error?: string }` from operations

### UI Components
- ✅ Read from `pendingOutcomes` filtered by `checkType`
- ✅ Access check data via `preview.checkData`
- ✅ Pass `preview.previewId` as card ID
- ✅ Delegate all operations to controllers via events

### Status Management
- `pending` - Check needs resolution
- `resolved` - Outcome determined, effects not yet applied
- `applied` - Effects applied, ready for cleanup

---

## Summary

The unified OutcomePreview system provides:

- ✅ Single source of truth for all check state
- ✅ Clear lifecycle boundaries
- ✅ Multi-client synchronization
- ✅ Type-safe architecture
- ✅ Consistent patterns across all check types
- ✅ Extensible for future check types

This architecture eliminates state fragmentation and provides a scalable foundation for all check-based gameplay in the Reignmaker system.
