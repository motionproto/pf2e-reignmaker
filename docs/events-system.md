# Events System - Technical Documentation

## Event System Architecture

### Event Check (Stability Roll)

Each turn during Phase 4 (Events), the system rolls a d20 against the current Event DC:

- **Initial DC**: 15
- **Event triggers**: Roll ≥ DC
- **No event**: DC decreases by 5 (minimum 6)
- **After event**: DC resets to 15

### Strategic Choice System (Moral Compass)

When an event triggers, players must choose an **approach** before rolling the skill check:

- **Virtuous** (left) - Compassionate, principled, selfless
- **Practical** (center) - Methodical, efficient, pragmatic  
- **Ruthless** (right) - Brutal, profit-driven, expedient

Each approach:
- Defines available skills for the check
- Determines personality alignment tracking
- Provides unique outcome descriptions and effects
- Shapes your kingdom's moral character over time

**Example: Bandit Activity**
- Virtuous: "Negotiate" - Offer employment, peaceful resolution
- Practical: "Drive Them Off" - Use militia to defend and recover goods
- Ruthless: "Hunt Mercilessly" - Eliminate bandits, take plunder

### Resolution Flow

```
1. Event Check (d20 vs DC)
   ↓
2. Strategic Choice Selection (players vote on approach)
   ↓
3. Skill Check (using approach's available skills)
   ↓
4. Outcome Display (preview effects)
   ↓
5. User Confirmation ("Apply Result" button)
   ↓
6. Execute Effects (resources, modifiers, game commands)
```

### Pipeline Architecture

Events use the standard 9-step pipeline system (via PipelineCoordinator):

1. **Requirements Check** - (Optional) Validates prerequisites
2. **Pre-Roll Interactions** - Strategic choice voting
3. **Execute Roll** - PF2e skill check with modifiers
4. **Display Outcome** - Creates outcome preview card
5. **Calculate Preview** - Converts modifiers to badges, runs custom preview logic
6. **Wait For Apply** - User reviews and clicks "Apply Result"
7. **Post-Apply Interactions** - Map selections, custom UI (if needed)
8. **Execute Action** - Applies resources, runs game commands
9. **Cleanup** - Tracks action, completes phase steps

### Outcome Badges

Events use a rich badge system to preview effects:

- **Static badges** - Fixed effects (e.g., "+1 Fame")
- **Dice badges** - Random amounts (e.g., "Gain {{value}} Gold" with formula "1d3")
- **Text badges** - Descriptive effects (e.g., "Adjust 1 faction +1")
- **Custom badges** - Dynamic based on game state (e.g., "Hex 42 claimed")

### Ongoing Events

Events with `endsEvent: false` persist across turns:

- Create an **ongoing instance** in `kingdom.pendingOutcomes`
- Display in "Ongoing Events" section with resolution status
- Reroll against the same event until successful
- Track which approach was chosen for consistency
- Can be ended by successful outcome or special conditions

**Example: Demand Expansion**
- Triggers when citizens demand territorial growth
- `endsEvent: false` on failure/critical failure (citizens remain unhappy)
- Automatically resolves when player claims a new hex
- OR player can make skill check to convince citizens to wait

---

## Implementation Details

### Event Pipeline Structure

Each event is defined in `src/pipelines/events/*.ts` as a TypeScript module:

```typescript
export const eventNamePipeline: CheckPipeline = {
  id: 'event-name',
  name: 'Event Name',
  description: 'Event description',
  checkType: 'event',
  tier: 1,

  // Strategic choice configuration
  strategicChoice: {
    label: 'How will you respond?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Virtuous Approach',
        description: '...',
        icon: 'fas fa-...',
        skills: ['diplomacy', 'society'],
        personality: { virtuous: 3 },
        outcomeDescriptions: { /* ... */ },
        outcomeBadges: { /* ... */ }
      },
      // ... practical, ruthless options
    ]
  },

  // Available skills (union of all approaches)
  skills: [
    { skill: 'diplomacy', description: 'negotiate' },
    { skill: 'intimidation', description: 'show of force' },
    // ...
  ],

  // Outcome definitions
  outcomes: {
    criticalSuccess: {
      description: '...',
      endsEvent: true,  // or false for ongoing
      modifiers: [],
      outcomeBadges: []
    },
    // ... success, failure, criticalFailure
  },

  // Optional: Custom preview calculation
  preview: {
    calculate: async (ctx) => {
      // Calculate dynamic badges based on game state
      // Prepare game commands (damage structure, etc.)
      return { resources: [], outcomeBadges: [...] };
    }
  },

  // Optional: Custom execution logic
  execute: async (ctx) => {
    // Execute game commands (structure damage, worksite creation, etc.)
    // NOTE: Standard modifiers are applied automatically
    return { success: true };
  },

  traits: ["beneficial"] // or ["dangerous"]
};
```

### Event Phase Controller

`EventPhaseController.ts` manages the Events phase:

- **`startPhase()`** - Initializes phase, applies custom modifiers, clears completed events
- **`performEventCheck(dc)`** - Rolls event check, triggers random event, manages DC
- **`triggerSpecificEvent(eventId)`** - Debug/testing tool to force specific events
- **`resolveEvent(...)`** - Applies outcome, executes pipeline, tracks player action
- **`ignoreEvent(eventId)`** - Applies Failure outcome immediately

### Outcome Preview Service

`OutcomePreviewService.ts` manages event instances:

- **`createInstance()`** - Creates pending outcome in `kingdom.pendingOutcomes`
- **`storeOutcome()`** - Saves resolved outcome data (for display)
- **`getInstance()`** - Retrieves instance by ID
- **`clearCompleted()`** - Cleans up resolved instances at phase start
- **`markApplied()`** - Marks instance as applied (hides buttons)

### Game Commands

Events use modular game commands for complex operations:

- **`DamageStructureHandler`** - Damages random structures
- **`DestroyStructureHandler`** - Destroys structures
- **`DestroyWorksiteHandler`** - Removes worksites from hexes
- **`IncreaseSettlementLevelHandler`** - Grows settlements
- **`ReduceSettlementLevelHandler`** - Shrinks settlements
- **`AdjustFactionHandler`** - Changes faction attitudes
- **`ConvertUnrestToImprisonedHandler`** - Imprisons dissidents

Game commands:
- Define their own outcome badges
- Handle user interaction (selection dialogs)
- Validate and execute atomic operations
- Provide rollback on failure

---

## Testing and Debug

### Trigger Specific Event

Developers can force specific events for testing:

```javascript
const controller = await createEventPhaseController();
await controller.triggerSpecificEvent('event-id');
```

### Force Outcome

Use `metadata.forcedOutcome` in pipeline execution:

```javascript
await coordinator.executePipeline('event-id', {
  checkType: 'event',
  metadata: { forcedOutcome: 'criticalSuccess' }
});
```

### Event Registry

All events are registered in `PipelineRegistry.ts`:

```javascript
import { pipelineRegistry } from './pipelines/PipelineRegistry';

// Get all events
const allEvents = pipelineRegistry.getPipelinesByType('event');

// Get specific event
const event = pipelineRegistry.getPipeline('plague');
```

---

## Migration Notes

The events system has evolved significantly:

**Old System (pre-2025):**
- Simple JSON data files
- Limited customization
- No choice system
- Basic modifiers only

**Current System (2025+):**
- TypeScript pipelines with full type safety
- Strategic choice system (Virtuous/Practical/Ruthless)
- Rich outcome badges (static, dice, text, custom)
- Game command integration
- Ongoing event instances
- Custom preview/execute logic
- Map selection integration
- PipelineCoordinator orchestration

All events have been migrated to the new system. See `src/pipelines/events/*.ts` for implementation examples.
