# Events and Incidents System

**Purpose:** Random kingdom events and unrest-triggered incidents with skill-based resolution

---

## Overview

The Events and Incidents System provides dynamic challenges for kingdom management through:
- **Events** - Random occurrences during Events phase (every turn)
- **Incidents** - Unrest-triggered problems during Unrest phase (percentage-based)

**Key Principle:** Both use the same data structure (modifiers, outcomes, traits) but different triggering conditions.

---

## Event Structure

### Core Event Data

```typescript
interface Event {
  id: string;
  name: string;
  tier: number;                    // Kingdom level requirement (1-20)
  description: string;
  traits: EventTrait[];            // Modifiers to event behavior
  skills: EventSkill[];            // Available resolution methods
  effects: EventOutcomes;          // Outcome modifiers by degree of success
}
```

**Example:**
```json
{
  "id": "drug-den",
  "name": "Drug Den",
  "tier": 1,
  "description": "An illicit drug trade threatens your settlement.",
  "traits": ["dangerous", "ongoing"],
  "skills": [
    { "skill": "stealth", "description": "undercover investigation" },
    { "skill": "medicine", "description": "treat addicts, trace source" },
    { "skill": "intimidation", "description": "crack down hard" }
  ],
  "effects": {
    "criticalSuccess": { "msg": "Drug ring destroyed", "modifiers": [...], "endsEvent": true },
    "success": { "msg": "Major arrests", "modifiers": [...], "endsEvent": true },
    "failure": { "msg": "Drug trade spreads", "modifiers": [...], "endsEvent": false },
    "criticalFailure": { "msg": "Major drug crisis", "modifiers": [...], "endsEvent": false }
  }
}
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
```json
{
  "traits": ["ongoing"],
  "failure": {
    "modifiers": [
      { "resource": "unrest", "value": 1, "duration": "ongoing" }  // ❌ WRONG
    ]
  }
}
```

This causes modifiers to be skipped (code expects `"ongoing"` duration for structures only).

**Correct Pattern:**
```json
{
  "traits": ["ongoing"],
  "failure": {
    "modifiers": [
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

**See Also:** `docs/systems/typed-modifiers-system.md` for full modifier documentation.

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

### 2. Event Roll

```typescript
// Component triggers controller
const controller = await createEventPhaseController();
const result = await controller.performEventCheck(eventId, actorId, skillName);
```

**Creates CheckInstance:**
- Stores roll data
- Tracks which event
- Records actor and skill used

### 3. Outcome Application

**Player Interaction:**
1. Roll displayed with degree of success
2. Outcome modifiers shown (dice, choices resolved)
3. Player clicks "Apply Result"

**Controller Processing:**
```typescript
const result = await controller.resolveEvent(previewId, resolutionData);
// - Applies numeric modifiers
// - Handles special resources (damage_structure, etc.)
// - Checks endsEvent flag
// - Updates turnState
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

**Same as Events:**
1. Roll skill check
2. Apply outcome modifiers
3. Check endsEvent (incidents can be ongoing too)
4. Update turnState

**Persistence:** Uses `kingdom.turnState.unrestPhase` instead of `eventsPhase`.

---

## Integration Points

### With EventPhaseController

**File:** `src/controllers/EventPhaseController.ts`

**Responsibilities:**
- Select/persist events
- Trigger skill checks
- Apply outcomes
- Manage event state

**Pattern:**
```typescript
const controller = await createEventPhaseController();
await controller.performEventCheck(eventId, actorId, skillName);
await controller.resolveEvent(previewId, resolutionData);
```

### With UnrestPhaseController

**File:** `src/controllers/UnrestPhaseController.ts`

**Responsibilities:**
- Calculate unrest
- Check for incidents
- Trigger incident resolution
- Manage incident state

**Pattern:**
```typescript
const controller = await createUnrestPhaseController();
const result = await controller.checkForIncidents();
await controller.resolveIncident(previewId, resolutionData);
```

### With OutcomePreviewService

**Both controllers use CheckInstance system:**

```typescript
// Create instance
const previewId = await outcomePreviewService.createInstance(
  'event',  // or 'incident'
  eventId,
  eventData,
  currentTurn
);

// Store outcome
await outcomePreviewService.storeOutcome(
  previewId,
  outcome,
  resolutionData,
  actorName,
  skillName,
  effect
);

// Mark applied
await outcomePreviewService.markApplied(previewId);
```

**See:** `docs/systems/check-instance-system.md`

### With GameCommandsService

**Special resources processed here:**

```typescript
// Structure damage
await gameCommandsService.damageStructure(params);

// Structure destruction
await gameCommandsService.destroyStructure(params);
```

**See:** `docs/systems/game-commands-system.md`

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
- ✅ Integration with CheckInstance and GameCommands systems

**Key Distinction:** Event trait `"ongoing"` ≠ Modifier duration `"ongoing"`

This architecture provides dynamic, replayable kingdom challenges while maintaining clear separation between event persistence and modifier application.
