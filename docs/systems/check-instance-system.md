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

### Overview

All checks (events, incidents, actions) now execute through **PipelineCoordinator**, which orchestrates the 9-step pipeline while using OutcomePreview for state storage.

**See:** `docs/systems/pipeline-coordinator.md` for complete pipeline architecture.

### 1. Creation (Pending)

```
PipelineCoordinator.executePipeline()
  → Step 1: Requirements Check
    → Step 2: Pre-Roll Interactions (optional)
      → Step 3: Execute Roll
        → Step 4: Display Outcome
          → OutcomePreviewService.createInstance()
            → Stores in pendingOutcomes[] with status: 'pending'
              → UI displays check card
```

**Example (Events Phase via Pipeline):**
```typescript
// EventPhaseController calls PipelineCoordinator
const pipelineCoordinator = new PipelineCoordinator();
const context = await pipelineCoordinator.executePipeline('drug-den', {
  checkType: 'event',
  userId: currentUserId
});
// Pipeline handles creation internally at Step 4
```

### 2. Resolution (Resolved)

```
Step 3: PF2e roll executes with callback
  → Callback fires when roll completes
    → Step 4: Display Outcome
      → OutcomePreviewService.storeOutcome()
        → Status changes to 'resolved'
          → Step 5: Outcome Interactions (dice, choices)
            → OutcomeDisplay shows interactive resolution
```

**Key Point:** PipelineCoordinator callback pattern resumes pipeline at Step 4 after roll completion. OutcomeDisplay handles all user interaction (dice rolling, choices, resource selection) before Step 6 waits for apply.

### 3. Application (Applied)

```
User resolves all interactions (dice, choices)
  → Step 5: Outcome Interactions complete
    → Step 6: Wait For Apply
      → User clicks "Apply Result"
        → Pipeline resumes
          → Step 7: Post-Apply Interactions (optional)
            → Step 8: Execute Action
              → GameEffectsService applies effects
                → OutcomePreviewService.markApplied()
                  → Status changes to 'applied'
                    → Step 9: Cleanup
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

### With PipelineCoordinator

PipelineCoordinator uses OutcomePreviewService for state storage:

```typescript
// PipelineCoordinator.executePipeline()
class PipelineCoordinator {
  private async step4_displayOutcome(ctx: PipelineContext): Promise<void> {
    // Create outcome preview
    const previewId = await outcomePreviewService.createInstance(
      ctx.checkType,
      ctx.actionId,
      ctx.checkData,
      ctx.currentTurn
    );
    ctx.previewId = previewId;
  }
  
  private async step8_executeAction(ctx: PipelineContext): Promise<void> {
    // Apply effects
    await gameEffectsService.applyResolution(ctx.resolutionData);
    
    // Mark applied
    await outcomePreviewService.markApplied(ctx.previewId);
  }
}
```

**See:** `docs/systems/pipeline-coordinator.md` for complete step-by-step flow.

### With Phase Controllers

Phase controllers trigger PipelineCoordinator:

```typescript
// Pattern: All check-based controllers
async performCheck(checkId: string) {
  const coordinator = new PipelineCoordinator();
  const context = await coordinator.executePipeline(checkId, {
    checkType: this.checkType,
    userId: game.userId
  });
  
  // Pipeline handles everything - no manual preview management
  return { success: context.executionResult?.success };
}
```

**See:** `docs/systems/phase-controllers.md` for controller integration patterns.

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
- ✅ Clear lifecycle boundaries (managed by PipelineCoordinator)
- ✅ Multi-client synchronization
- ✅ Type-safe architecture
- ✅ Consistent patterns across all check types
- ✅ Extensible for future check types

**Integration with PipelineCoordinator:**
- OutcomePreview stores persistent state (survives page refresh)
- PipelineCoordinator orchestrates the 9-step execution flow
- Both work together to provide complete check management

This architecture eliminates state fragmentation and provides a scalable foundation for all check-based gameplay in the Reignmaker system.

---

**Related Documents:**
- `docs/systems/pipeline-coordinator.md` - Complete pipeline architecture
- `docs/systems/check-type-differences.md` - Events vs Incidents vs Actions
- `docs/systems/phase-controllers.md` - Controller integration patterns
