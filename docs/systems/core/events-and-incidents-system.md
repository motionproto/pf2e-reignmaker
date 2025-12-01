# Events and Incidents System

**Purpose:** Random kingdom events and unrest-triggered incidents with skill-based resolution

**Data Architecture:** Self-contained TypeScript pipelines in `src/pipelines/events/` and `src/pipelines/incidents/`

---

## Overview

The Events and Incidents System provides dynamic challenges for kingdom management through:
- **Events** - Random occurrences during Events phase (every turn)
- **Incidents** - Unrest-triggered problems during Unrest phase (percentage-based)

**Key Principle:** Both use the same `CheckPipeline` structure but different triggering conditions.

**Implementation:** All events and incidents are defined as self-contained TypeScript pipeline files, registered in `PipelineRegistry`, and accessed at runtime by phase controllers.

---

## Event Structure

### Core Event Pipeline

```typescript
export const drugDenPipeline: CheckPipeline = {
  id: 'drug-den',
  name: 'Drug Den',
  description: 'An illicit drug trade threatens your settlement.',
  tier: 1,                         // Kingdom level requirement (1-20)
  category: 'event',
  checkType: 'event',
  traits: ['dangerous', 'ongoing'],
  skills: [
    { skill: 'stealth', description: 'undercover investigation' },
    { skill: 'medicine', description: 'treat addicts, trace source' },
    { skill: 'intimidation', description: 'crack down hard' }
  ],
  outcomes: {
    criticalSuccess: {
      description: 'Drug ring destroyed',
      modifiers: [{ resource: 'unrest', value: -2 }],
      endsEvent: true
    },
    success: {
      description: 'Major arrests',
      modifiers: [{ resource: 'unrest', value: -1 }],
      endsEvent: true
    },
    failure: {
      description: 'Drug trade spreads',
      modifiers: [{ resource: 'crime', value: 1 }],
      endsEvent: false
    },
    criticalFailure: {
      description: 'Major drug crisis',
      modifiers: [{ resource: 'unrest', value: 2 }, { resource: 'crime', value: 2 }],
      endsEvent: false
    }
  },
  requirements: () => ({ met: true }),
  getDC: () => 15
};
```

---

## Event Traits

### Ongoing

**Meaning:** Event repeats each turn until resolved

**Data:**
```json
{
  "traits": ["ongoing"]
}
```

**Behavior:**
- Event appears again next turn if `endsEvent: false`
- Must roll skill check each turn
- Modifiers apply **once per roll**, not automatically

**Critical Distinction:**
```
Event trait "ongoing" → Event repeats
Modifier duration "immediate" → Apply once when clicked
```

**Wrong Pattern:**
```typescript
{
  traits: ["ongoing"],
  outcomes: {
    failure: {
      description: 'Problem persists',
      modifiers: [
        { resource: 'unrest', value: 1, duration: 'ongoing' }  // ❌ WRONG
      ]
    }
  }
}
```

This causes modifiers to be skipped (code expects `"ongoing"` duration for structures only).

**Correct Pattern:**
```typescript
{
  traits: ["ongoing"],
  outcomes: {
    failure: {
      description: 'Problem persists',
      modifiers: [
        { resource: 'unrest', value: 1 }  // ✅ CORRECT - applied each turn
      ],
      endsEvent: false  // Event continues to next turn
    }
  }
}
```
      { "resource": "unrest", "value": 1, "duration": "immediate" }  // ✅ CORRECT
    ],
    "endsEvent": false  // Event will repeat next turn
  }
}
```

### Dangerous

**Meaning:** Uses higher-tier DC calculation

**Data:**
```json
{
  "traits": ["dangerous"]
}
```

**Behavior:** DC calculation includes danger modifier (exact formula in PF2e rules).

### Continuous

**Meaning:** Requires ongoing attention/monitoring

**Data:**
```json
{
  "traits": ["continuous"]
}
```

**Behavior:** Primarily narrative flavor, may affect GM interpretation.

---

## Event Outcomes

### Outcome Structure

All outcomes use the same format:

```typescript
interface EventOutcome {
  msg?: string;                   // Description with {resourceName} placeholders
  modifiers?: EventModifier[];    // Resource changes (always "immediate" duration)
  manualEffects?: string[];       // GM instructions (not auto-applied)
  endsEvent?: boolean;            // Does this outcome end the event?
}
```

**Key Fields:**

- **msg** - Displayed to player with placeholder resolution
- **modifiers** - Typed resource changes (see typed-modifiers-system.md)
- **manualEffects** - Things that can't be automated
- **endsEvent** - Controls event persistence

### endsEvent Semantics

**`endsEvent: true`** - Event is resolved:
- Event will NOT appear next turn
- Outcome fully resolves the situation

**`endsEvent: false`** - Event continues:
- Event WILL appear next turn
- Must roll again to resolve
- Each roll applies its modifiers independently

**Example Flow:**
```
Turn 1: Drug-den failure → +1 unrest, endsEvent: false
Turn 2: Drug-den appears again → Critical failure → +2 unrest + damage structure, endsEvent: false
Turn 3: Drug-den appears again → Success → Convert unrest to imprisoned, endsEvent: true
Turn 4: No drug-den event (resolved)
```

---

## Event Modifiers

### Always Use "immediate" Duration

**Rule:** All event modifiers must have `"duration": "immediate"` (or omit, defaults to immediate).

**Rationale:**
- Events apply modifiers when you click "Apply Result"
- Modifiers don't persist automatically between rolls
- `"ongoing"` duration is reserved for structures and custom modifiers

**Correct Examples:**
```json
{
  "success": {
    "modifiers": [
      { "type": "static", "resource": "gold", "value": 10, "duration": "immediate" },
      { "type": "dice", "resource": "fame", "formula": "1d4", "duration": "immediate" }
    ]
  }
}
```

**See Also:** `docs/systems/core/typed-modifiers-system.md` for full modifier documentation.

---

## Special Resources

### damage_structure

**Purpose:** Randomly damage a settlement structure

**Data:**
```json
{
  "type": "static",
  "resource": "damage_structure",
  "value": 1,
  "duration": "immediate"
}
```

**Behavior:**
- GameCommandsService selects structure based on event targeting config
- Structure marked as damaged (provides no bonuses)
- Structure name displayed in outcome

**Targeting:** See `src/data-compiled/event-structure-targeting.ts`

### destroy_structure

**Purpose:** Destroy/downgrade a settlement structure

**Data:**
```json
{
  "type": "static",
  "resource": "destroy_structure",
  "value": 1,
  "duration": "immediate"
}
```

**Behavior:**
- Tier 1 structures: Removed entirely
- Tier 2+ structures: Downgraded to previous tier and marked damaged

**Targeting:** Same as `damage_structure`

### imprisoned_unrest

**Purpose:** Unrest converted to imprisoned dissidents

**Data:**
```json
{
  "type": "static",
  "resource": "imprisoned_unrest",
  "value": 1,
  "duration": "immediate"
}
```

**Behavior:**
- Increases imprisoned unrest counter
- Does NOT decrease regular unrest (manual effect)
- Players must manually reduce regular unrest by same amount

---

## Event Lifecycle

### Overview

Events now execute through **PipelineCoordinator**, which provides a standardized 9-step execution flow. EventPhaseController triggers the pipeline and handles event-specific persistence logic.

**See:** `docs/systems/core/pipeline-coordinator.md` for complete pipeline architecture.

### 1. Event Selection (Events Phase Start)

```typescript
// EventPhaseController.selectEvent()
const eligibleEvents = events.filter(e => e.tier <= kingdomLevel);
const selectedEvent = randomChoice(eligibleEvents);
```

**Persistence Check:**
```typescript
// Check for ongoing events from previous turns
if (kingdom.turnState?.eventsPhase?.eventTriggered) {
  const ongoingEventId = kingdom.turnState.eventsPhase.eventId;
  // Continue with ongoing event
}
```

### 2. Event Execution (via PipelineCoordinator)

```typescript
// EventPhaseController triggers pipeline
const coordinator = new PipelineCoordinator();
const context = await coordinator.executePipeline(eventId, {
  checkType: 'event',
  userId: game.userId
});
```

**Pipeline Flow:**
```
Step 1: Requirements Check (tier ≤ kingdom level)
Step 2: Pre-Roll Interactions (rare for events)
Step 3: Execute Roll (skill check)
Step 4: Display Outcome (create OutcomePreview)
Step 5: Outcome Interactions (dice/choice modifiers)
Step 6: Wait For Apply (user clicks button)
Step 7: Post-Apply Interactions (rare for events)
Step 8: Execute Action (apply effects + check endsEvent)
Step 9: Cleanup (update turnState)
```

**See:** `docs/systems/core/check-type-differences.md` for event-specific pipeline behavior.

### 3. Outcome Application

**Player Interaction (Steps 4-6):**
1. Roll displayed with degree of success
2. Outcome modifiers shown (dice, choices resolved in Step 5)
3. Player clicks "Apply Result" (Step 6 completes)

**Pipeline Processing (Steps 7-9):**
```typescript
// Step 8: Execute Action
await gameCommandsService.applyNumericModifiers(resolutionData.numericModifiers);
await gameCommandsResolver.executeGameCommands(resolutionData.gameCommands);

// Check endsEvent flag
if (!outcome.endsEvent) {
  await updateKingdom(k => {
    k.turnState.eventsPhase.eventTriggered = true;
    k.turnState.eventsPhase.eventId = eventId;
  });
}

// Step 9: Cleanup
await outcomePreviewService.markApplied(previewId);
```

### 4. Event Persistence

**If `endsEvent: false`:**
```typescript
await updateKingdom(k => {
  k.turnState.eventsPhase.eventTriggered = true;
  k.turnState.eventsPhase.eventId = eventId;
});
```

**Next turn:** Same event appears, must roll again.

**If `endsEvent: true`:**
```typescript
await updateKingdom(k => {
  k.turnState.eventsPhase.eventTriggered = false;
  k.turnState.eventsPhase.eventId = null;
});
```

**Next turn:** New random event selected.

**Note:** Pipeline Step 8 automatically handles this persistence logic based on the `endsEvent` flag in the outcome data.

---

## Incidents System

### Incident Structure

**Same as Events:**
```typescript
interface Incident {
  id: string;
  name: string;
  severity: 'minor' | 'moderate' | 'major';  // Instead of tier
  description: string;
  traits: EventTrait[];  // Same trait system
  skills: EventSkill[];  // Same skill system
  effects: EventOutcomes;  // Same outcome system
}
```

**Key Difference:** Severity instead of tier, triggered by unrest instead of random.

### Incident Triggering

**Unrest Phase:**
```typescript
// UnrestPhaseController.checkForIncidents()
const unrestLevel = kingdom.unrest;
const roll = d100();

if (roll <= unrestLevel) {
  // Incident triggered!
  const severity = determineSeverity(unrestLevel);
  const incident = selectIncident(severity);
  
  // Trigger pipeline
  const coordinator = new PipelineCoordinator();
  await coordinator.executePipeline(incident.id, {
    checkType: 'incident',
    userId: game.userId
  });
}
```

**Severity Determination:**
- Minor: Unrest 1-4
- Moderate: Unrest 5-10
- Major: Unrest 11+

**Data Location:**
- `data/incidents/minor/*.json`
- `data/incidents/moderate/*.json`
- `data/incidents/major/*.json`

### Incident Resolution

**Via PipelineCoordinator:**

Incidents use the same 9-step pipeline as events, with minor differences:

1. **Step 1 (Requirements)** - Uses severity instead of tier for validation
2. **Steps 2-7** - Identical to events (rarely use pre/post interactions)
3. **Step 8 (Execute)** - Updates `turnState.unrestPhase` instead of `eventsPhase`
4. **Step 9 (Cleanup)** - Same cleanup logic

**Persistence:** Uses `kingdom.turnState.unrestPhase` instead of `eventsPhase`.

**See:** `docs/systems/core/check-type-differences.md` for complete incident vs event comparison.

---

## Integration Points

### With PipelineCoordinator

**File:** `src/services/PipelineCoordinator.ts`

**Responsibilities:**
- Orchestrate 9-step execution flow
- Manage pipeline context
- Handle roll callbacks
- Coordinate pause/resume at apply button

**Pattern (Events):**
```typescript
const coordinator = new PipelineCoordinator();
const context = await coordinator.executePipeline(eventId, {
  checkType: 'event',
  userId: game.userId
});
// Pipeline handles everything from roll to cleanup
```

**Pattern (Incidents):**
```typescript
const coordinator = new PipelineCoordinator();
const context = await coordinator.executePipeline(incidentId, {
  checkType: 'incident',
  userId: game.userId
});
// Same flow, different checkType
```

**See:** `docs/systems/core/pipeline-coordinator.md` for complete architecture.

### With EventPhaseController

**File:** `src/controllers/EventPhaseController.ts`

**Responsibilities:**
- Select events (random or ongoing)
- Trigger PipelineCoordinator
- Handle event ignore flow (separate from pipeline)
- Manage event persistence

**Pattern:**
```typescript
const controller = await createEventPhaseController();

// Standard flow
await controller.performEventCheck(eventId);
// → Calls PipelineCoordinator internally

// Ignore flow (bypasses pipeline)
await controller.ignoreEvent(eventId);
// → Separate code path
```

### With UnrestPhaseController

**File:** `src/controllers/UnrestPhaseController.ts`

**Responsibilities:**
- Calculate unrest
- Trigger incident checks (d100 roll)
- Call PipelineCoordinator if incident triggered
- Manage incident persistence

**Pattern:**
```typescript
const controller = await createUnrestPhaseController();

// Unrest calculation
await controller.calculateUnrest();

// Incident check + resolution
const result = await controller.checkForIncidents();
// → Calls PipelineCoordinator internally if triggered
```

### With OutcomePreviewService

**PipelineCoordinator uses OutcomePreviewService internally:**

```typescript
// Pipeline Step 4: Display Outcome
const previewId = await outcomePreviewService.createInstance(
  'event',  // or 'incident'
  eventId,
  eventData,
  currentTurn
);

// Pipeline Step 4: Store outcome after roll
await outcomePreviewService.storeOutcome(
  previewId,
  outcome,
  resolutionData,
  actorName,
  skillName,
  effect
);

// Pipeline Step 8: Mark applied
await outcomePreviewService.markApplied(previewId);
```

**Note:** Check instance system has been integrated into the pipeline coordinator.

### With GameCommandsService & GameCommandsResolver

**Pipeline Step 8 applies all effects:**

```typescript
// Apply numeric modifiers
await gameCommandsService.applyNumericModifiers(resolutionData.numericModifiers);

// Execute game commands
await gameCommandsResolver.executeGameCommands(resolutionData.gameCommands);

// Special resources (structure damage, etc.)
await gameCommandsService.damageStructure(params);
await gameCommandsService.destroyStructure(params);
```

**See:** `docs/systems/core/game-commands-system.md`

---

## Data Files

### Events

**Location:** `data/events/*.json`

**Count:** 37 events

**Naming Convention:** `kebab-case.json` matching event ID

**Build Output:** `src/data-compiled/events.json` (compiled array)

### Incidents

**Location:** `data/incidents/{severity}/*.json`

**Count:**
- Minor: 8
- Moderate: 10
- Major: 12

**Build Output:** `src/data-compiled/incidents.json` (compiled object by severity)

### Structure Targeting

**Location:** `src/data-compiled/event-structure-targeting.ts`

**Purpose:** Maps event IDs to structure targeting strategies

**Example:**
```typescript
export const eventStructureTargetingConfigs = {
  'raiders': {
    type: 'category-filtered',
    preferredCategories: ['commerce', 'logistics'],
    fallbackToRandom: true
  },
  'undead-uprising': {
    type: 'random',
    fallbackToRandom: true
  }
};
```

---

## Best Practices

### Data Authoring

- ✅ Use `"duration": "immediate"` for ALL event/incident modifiers
- ✅ Use trait `"ongoing"` for repeating events
- ✅ Set `endsEvent` explicitly for each outcome
- ✅ Provide multiple skill options (3-4 typical)
- ✅ Include manual effects for non-automatable outcomes
- ✅ Use resource placeholders in messages: `"{gold} gold"`

### Code Implementation

- ✅ Always check `endsEvent` after applying outcome
- ✅ Use OutcomePreviewService for all check data
- ✅ Apply modifiers through GameCommandsService
- ✅ Update turnState to persist ongoing events/incidents
- ✅ Clear turnState when events end

### Common Mistakes

- ❌ Using `"duration": "ongoing"` for event modifiers
- ❌ Forgetting to set `endsEvent` (defaults to undefined/true)
- ❌ Applying modifiers automatically instead of on "Apply Result" click
- ❌ Confusing event trait "ongoing" with modifier duration "ongoing"
- ❌ Not updating turnState for ongoing events

---

## Examples

### Simple Event (Ends Immediately)

```json
{
  "id": "good-weather",
  "name": "Good Weather",
  "tier": 1,
  "description": "Favorable conditions boost productivity.",
  "traits": [],
  "skills": [
    { "skill": "agriculture", "description": "maximize farming benefits" }
  ],
  "effects": {
    "criticalSuccess": {
      "msg": "Exceptional harvest! Gain {food} food.",
      "modifiers": [
        { "type": "static", "resource": "food", "value": 4, "duration": "immediate" }
      ],
      "endsEvent": true
    },
    "success": {
      "msg": "Good harvest. Gain {food} food.",
      "modifiers": [
        { "type": "static", "resource": "food", "value": 2, "duration": "immediate" }
      ],
      "endsEvent": true
    },
    "failure": {
      "msg": "Weather turns. No bonus.",
      "modifiers": [],
      "endsEvent": true
    }
  }
}
```

### Ongoing Event (Repeats Until Resolved)

```json
{
  "id": "plague",
  "name": "Plague",
  "tier": 1,
  "description": "Disease spreads through your settlements.",
  "traits": ["dangerous", "ongoing"],
  "skills": [
    { "skill": "medicine", "description": "treat the sick" },
    { "skill": "religion", "description": "pray for divine aid" }
  ],
  "effects": {
    "criticalSuccess": {
      "msg": "Plague eradicated!",
      "modifiers": [
        { "type": "static", "resource": "unrest", "value": -2, "duration": "immediate" }
      ],
      "endsEvent": true
    },
    "success": {
      "msg": "Disease contained.",
      "modifiers": [],
      "endsEvent": true
    },
    "failure": {
      "msg": "Plague persists. {unrest} unrest.",
      "modifiers": [
        { "type": "static", "resource": "unrest", "value": 1, "duration": "immediate" }
      ],
      "endsEvent": false
    },
    "criticalFailure": {
      "msg": "Plague becomes endemic!",
      "modifiers": [
        { "type": "static", "resource": "unrest", "value": 3, "duration": "immediate" },
        { "type": "dice", "resource": "food", "formula": "1d4", "negative": true, "duration": "immediate" }
      ],
      "manualEffects": [
        "Mark your largest settlement as 'Quarantined'"
      ],
      "endsEvent": false
    }
  }
}
```

### Event with Structure Damage

```json
{
  "id": "monster-attack",
  "name": "Monster Attack",
  "tier": 1,
  "description": "A dangerous creature threatens your settlements.",
  "traits": ["dangerous"],
  "skills": [
    { "skill": "warfare", "description": "military response" },
    { "skill": "diplomacy", "description": "negotiate peaceful solution" }
  ],
  "effects": {
    "success": {
      "msg": "Monster driven off.",
      "modifiers": [],
      "endsEvent": true
    },
    "failure": {
      "msg": "Monster damages settlement.",
      "modifiers": [
        { "type": "static", "resource": "damage_structure", "value": 1, "duration": "immediate" }
      ],
      "endsEvent": true
    },
    "criticalFailure": {
      "msg": "Monster destroys building and flees.",
      "modifiers": [
        { "type": "static", "resource": "destroy_structure", "value": 1, "duration": "immediate" }
      ],
      "endsEvent": true
    }
  }
}
```

---

## Summary

The Events and Incidents System provides:

- ✅ Random challenges for kingdom management
- ✅ Skill-based resolution with multiple approaches
- ✅ Typed modifiers with immediate duration
- ✅ Ongoing event support through traits + endsEvent
- ✅ Special resources (structure damage, imprisoned unrest)
- ✅ Manual effects for non-automatable outcomes
- ✅ **Unified execution via PipelineCoordinator**
- ✅ Integration with OutcomePreview and GameCommands systems

**Key Distinction:** Event trait `"ongoing"` ≠ Modifier duration `"ongoing"`

**Architecture:** PipelineCoordinator provides the 9-step execution flow, while phase controllers handle event/incident-specific triggering and persistence logic.

This architecture provides dynamic, replayable kingdom challenges while maintaining clear separation between event persistence and modifier application.

---

**Related Documents:**
- `docs/systems/core/pipeline-coordinator.md` - Complete pipeline architecture
- `docs/systems/core/check-type-differences.md` - Events vs Incidents vs Actions
- `docs/systems/core/game-commands-system.md` - Game commands integration
