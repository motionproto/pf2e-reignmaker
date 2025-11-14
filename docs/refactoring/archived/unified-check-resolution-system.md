# Unified Check Resolution System

**Purpose:** Common architecture for Actions, Events, and Incidents resolution

**Last Updated:** 2025-11-14

---

## Executive Summary

Actions, Events, and Incidents are **three variations of the same underlying system**: skill-based checks that resolve through the same 9-step pipeline. They differ only in:

1. **Triggering mechanism** (player choice vs random vs unrest-based)
2. **Pre-roll interactions** (actions only)
3. **Persistence rules** (ongoing events/incidents vs one-shot actions)

**Key Insight:** The UnifiedActionHandler architecture can serve all three check types with minimal modifications.

---

## The Three Check Types

### Actions (Player-Initiated)
- **Trigger:** Player chooses from available actions during Actions phase
- **Count:** 26 defined actions
- **Repeatable:** Every turn
- **Pre-roll:** May require dialogs/map selections (settlement, faction, hex, etc.)
- **Post-roll:** Some require user interactions (dice, choices, compound forms)
- **Persistence:** Never persist between turns
- **Preview:** Always required (calculated or interactive)

### Events (Random)
- **Trigger:** Random selection during Events phase (one per turn)
- **Count:** 37 defined events
- **Repeatable:** If `endsEvent: false` + trait `ongoing`
- **Pre-roll:** Never
- **Post-roll:** Simple interactions only (dice, choice-dropdown)
- **Persistence:** Can persist until resolved
- **Preview:** Currently inconsistent (5/37 show preview)

### Incidents (Unrest-Triggered)
- **Trigger:** Percentage roll based on unrest during Unrest phase
- **Count:** 30 defined incidents (8 minor, 10 moderate, 12 major)
- **Repeatable:** If `endsEvent: false` + trait `ongoing`
- **Pre-roll:** Never
- **Post-roll:** Simple interactions only (dice, choice-dropdown)
- **Persistence:** Can persist until resolved
- **Preview:** Currently inconsistent (similar to events)

---

## Structural Comparison

### Data Structure Overlap

| Field | Actions | Events | Incidents | Notes |
|-------|---------|--------|-----------|-------|
| `id` | ✅ | ✅ | ✅ | Unique identifier |
| `name` | ✅ | ✅ | ✅ | Display name |
| `description` | ✅ | ✅ | ✅ | Player-facing text |
| `category` | ✅ | ❌ | ❌ | Actions only (governance, expansion, etc.) |
| `tier` | ❌ | ✅ (1-20) | ✅ (minor/moderate/major) | Level requirement/severity |
| `skills` | ✅ | ✅ | ✅ | **IDENTICAL FORMAT** |
| `effects` | ✅ | ✅ | ✅ | **IDENTICAL FORMAT** |
| `traits` | ❌ | ✅ | ✅ | Events/incidents only (ongoing, dangerous) |
| `gameCommands` | ✅ | ❌ | ❌ | Actions only (recruitArmy, claimHexes, etc.) |

### Skills Format (100% Identical)

**Actions:**
```json
"skills": [
  { "skill": "warfare", "description": "military deployment" },
  { "skill": "diplomacy", "description": "diplomatic approach" }
]
```

**Events:**
```json
"skills": [
  { "skill": "society", "description": "historical research" },
  { "skill": "religion", "description": "divine significance" }
]
```

**Incidents:**
```json
"skills": [
  { "skill": "intimidation", "description": "show force" },
  { "skill": "stealth", "description": "infiltrate bandits" }
]
```

**Structure:** Identical array of `{ skill, description }` objects.

### Effects/Outcomes Format (95% Identical)

**Actions:**
```json
"effects": {
  "criticalSuccess": {
    "description": "Outcome text",
    "modifiers": [...],
    "gameCommands": [...]
  }
}
```

**Events:**
```json
"effects": {
  "criticalSuccess": {
    "msg": "Outcome text",
    "modifiers": [...],
    "endsEvent": true
  }
}
```

**Incidents:**
```json
"effects": {
  "criticalSuccess": {
    "msg": "Outcome text",
    "modifiers": [...],
    "manualEffects": [...],
    "endsEvent": true
  }
}
```

**Differences:**
- Actions use `description`, events/incidents use `msg` (trivial naming)
- Actions have `gameCommands`, events/incidents have `endsEvent`
- All use **identical modifier structures**

### Modifier Format (100% Identical)

**All three use the same typed modifier system:**

```json
// Static modifier
{
  "type": "static",
  "resource": "gold",
  "value": 10,
  "duration": "immediate"
}

// Dice modifier
{
  "type": "dice",
  "resource": "fame",
  "formula": "1d4",
  "negative": false,
  "duration": "immediate"
}

// Choice modifier
{
  "type": "choice-buttons",  // Actions
  "type": "choice-dropdown",  // Events/Incidents
  "resources": ["food", "lumber", "stone", "ore"],
  "value": 2,
  "negative": false,
  "duration": "immediate"
}
```

**See:** `docs/systems/typed-modifiers-system.md`

---

## Resolution Flow Comparison

### Unified 9-Step Flow

All three check types follow the same pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Trigger                                             │
│ Actions: Player clicks button                               │
│ Events: Random selection                                    │
│ Incidents: Unrest percentage roll                           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 2: Pre-Roll Interactions                               │
│ Actions: Entity/Map/Configuration selection (if needed)     │
│ Events: None                                                │
│ Incidents: None                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 3: Prepare Roll                                        │
│ ALL: Character selection, DC calculation                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 4: PF2e Roll Dialog                                    │
│ ALL: Foundry VTT native skill check                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 5: Create Check Instance                               │
│ ALL: Store in KingdomActor.activeCheckInstances             │
│ Actions: checkType = 'action'                               │
│ Events: checkType = 'event'                                 │
│ Incidents: checkType = 'incident'                           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 6: Post-Roll Interactions                              │
│ Actions: Dice, choices, compound forms, map selections      │
│ Events: Dice, choice-dropdown only                          │
│ Incidents: Dice, choice-dropdown only                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 7: Preview                                             │
│ Actions: Always (calculated or interactive)                 │
│ Events: Sometimes (inconsistent)                            │
│ Incidents: Sometimes (inconsistent)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 8: Execute                                             │
│ ALL: Apply modifiers via GameCommandsService                │
│ Actions: Execute game commands                              │
│ Events: Check endsEvent, update turnState                   │
│ Incidents: Check endsEvent, update turnState                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 9: Reset                                               │
│ Actions: Mark applied, clear instance                       │
│ Events: Persist if endsEvent: false                         │
│ Incidents: Persist if endsEvent: false                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Differences by Step

**Step 1 (Trigger):**
- Actions: User-initiated during Actions phase
- Events: Random selection during Events phase
- Incidents: Unrest-based during Unrest phase

**Step 2 (Pre-Roll):**
- Actions: May require dialogs (settlements, factions, structures, hexes)
- Events/Incidents: Never

**Step 6 (Post-Roll):**
- Actions: Full interaction types (dice, choice-buttons, allocation, text-input, compound)
- Events/Incidents: Limited (dice, choice-dropdown only)

**Step 7 (Preview):**
- Actions: Mandatory (architectural requirement)
- Events/Incidents: Inconsistent (architectural gap)

**Step 9 (Reset):**
- Actions: Always reset
- Events/Incidents: Persist if `endsEvent: false` + `ongoing` trait

---

## Architecture Synergies

### Shared Systems (Already Unified)

#### 1. CheckInstanceService
**Used by all three check types:**
```typescript
// Actions
await checkInstanceService.createInstance('action', actionId, actionData, turn);

// Events
await checkInstanceService.createInstance('event', eventId, eventData, turn);

// Incidents
await checkInstanceService.createInstance('incident', incidentId, incidentData, turn);
```

**See:** `docs/systems/check-instance-system.md`

#### 2. GameCommandsService
**Applies modifiers for all check types:**
```typescript
await gameCommandsService.applyOutcome({
  type: 'action',  // or 'event', 'incident'
  sourceId: checkId,
  outcome,
  modifiers,
  preRolledValues
});
```

**See:** `docs/systems/game-commands-system.md`

#### 3. Typed Modifiers System
**All three use identical modifier structures:**
- StaticModifier
- DiceModifier
- ChoiceModifier (choice-buttons for actions, choice-dropdown for events/incidents)

**See:** `docs/systems/typed-modifiers-system.md`

#### 4. OutcomeDisplay Component
**Already handles all three check types:**
- Actions: Full interaction support
- Events: Basic dice/choice support
- Incidents: Basic dice/choice support

**File:** `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte`

### Divergent Systems (Need Unification)

#### 1. Controllers

**Current State:**
- ActionPhaseController (~200 lines)
- EventPhaseController (~150 lines)
- UnrestPhaseController (~180 lines)

**Problem:** Duplicated logic for roll execution, outcome application, state management.

**Solution:** Extract common logic to UnifiedCheckHandler, controllers become thin wrappers.

#### 2. Preview System

**Current State:**
- Actions: 21/26 lack preview (architectural gap)
- Events: ~32/37 lack preview (architectural gap)
- Incidents: ~25/30 lack preview (architectural gap)

**Problem:** Only prepare/commit actions show preview consistently.

**Solution:** UnifiedCheckHandler enforces preview for all check types.

#### 3. Interaction Handlers

**Current State:**
- Actions: 12 custom dialogs + interaction handlers
- Events: No pre-roll interactions
- Incidents: No pre-roll interactions

**Problem:** Actions have complex pre-roll needs, events/incidents don't.

**Solution:** UnifiedCheckHandler supports optional pre-roll interactions (only used by actions).

---

## Unified Check Handler Architecture

### Extending UnifiedActionHandler

The UnifiedActionHandler designed for actions can be extended to support all check types:

```typescript
interface UnifiedCheckHandler {
  // Registration (all check types)
  registerCheck(type: CheckType, id: string, config: CheckPipeline): void;
  
  // Trigger (check-type specific)
  triggerPlayerAction(actionId: string): void;
  triggerRandomEvent(kingdomLevel: number): void;
  triggerIncident(unrestLevel: number): void;
  
  // Pre-roll (actions only)
  executePreRollInteractions(checkId: string): Promise<Metadata>;
  
  // Roll execution (all check types)
  executeSkillCheck(checkId: string, skill: string, metadata?: Metadata): Promise<void>;
  
  // Post-roll (all check types)
  executePostRollInteractions(instanceId: string): Promise<ResolutionData>;
  
  // Preview (all check types)
  calculatePreview(instanceId: string, resolutionData: ResolutionData): Promise<PreviewData>;
  formatPreview(preview: PreviewData): SpecialEffect[];
  
  // Execute (check-type specific)
  executeAction(instanceId: string, preview: PreviewData): Promise<void>;
  executeEvent(instanceId: string, preview: PreviewData): Promise<void>;
  executeIncident(instanceId: string, preview: PreviewData): Promise<void>;
  
  // Persistence (events/incidents only)
  checkPersistence(instanceId: string): Promise<boolean>;
  persistCheck(checkId: string): Promise<void>;
}
```

### Check Pipeline Configuration

**Universal config format:**

```typescript
interface CheckPipeline {
  // Metadata
  id: string;
  name: string;
  description: string;
  
  // Skill options (all)
  skills: SkillOption[];
  
  // Pre-roll (actions only)
  preRollInteractions?: Interaction[];
  
  // Post-roll (all, but limited for events/incidents)
  postRollInteractions?: Interaction[];
  
  // Outcomes (all)
  outcomes: {
    criticalSuccess?: Outcome;
    success?: Outcome;
    failure?: Outcome;
    criticalFailure?: Outcome;
  };
  
  // Preview (all)
  preview: {
    calculate?: (context: CheckContext) => PreviewData;
    format?: (preview: PreviewData) => SpecialEffect[];
    providedByInteraction?: boolean;
  };
  
  // Actions-specific
  gameCommands?: GameCommand[];
  
  // Events/Incidents-specific
  traits?: Trait[];
  endsCheck?: boolean;  // Replaces endsEvent
}
```

### Check-Type Specific Behavior

**Actions:**
- Pre-roll interactions: Full support (entity, map, configuration, compound)
- Post-roll interactions: Full support (all types)
- Preview: Always required (calculated or interactive)
- Persistence: Never
- Game commands: Supported

**Events:**
- Pre-roll interactions: None
- Post-roll interactions: Limited (dice, choice-dropdown)
- Preview: Required (NEW - architectural improvement)
- Persistence: If `endsCheck: false` + `ongoing` trait
- Game commands: Not supported (use special resources instead)

**Incidents:**
- Pre-roll interactions: None
- Post-roll interactions: Limited (dice, choice-dropdown)
- Preview: Required (NEW - architectural improvement)
- Persistence: If `endsCheck: false` + `ongoing` trait
- Game commands: Not supported (use special resources instead)

---

## Migration Path to Unified System

### Phase 1: Actions (Already Planned)
1. Implement UnifiedActionHandler
2. Convert 26 actions to pipeline configs
3. Validate all action patterns work

**Timeline:** 4 weeks (from unified-action-handler-architecture.md)

### Phase 2: Extend to Events
1. Add event-specific trigger mechanism
2. Support `endsCheck` persistence
3. Add trait system support
4. Convert 37 events to pipeline configs
5. Mandate preview for all events

**Timeline:** 2 weeks

**Changes:**
- EventPhaseController becomes thin wrapper
- Events gain consistent preview
- No pre-roll interactions (verified constraint)
- Limited post-roll interactions (choice-dropdown only)

### Phase 3: Extend to Incidents
1. Add incident-specific trigger mechanism
2. Reuse event persistence/trait logic
3. Convert 30 incidents to pipeline configs
4. Mandate preview for all incidents

**Timeline:** 1 week

**Changes:**
- UnrestPhaseController becomes thin wrapper
- Incidents gain consistent preview
- Same constraints as events

### Phase 4: Cleanup
1. Remove EventPhaseController business logic (~100 lines)
2. Remove UnrestPhaseController business logic (~120 lines)
3. Archive old implementation files
4. Update documentation

**Timeline:** 1 week

**Total Migration:** 8 weeks (actions + events + incidents + cleanup)

---

## Benefits of Unification

### For Users
- ✅ **Consistent UX** - All checks look/feel the same
- ✅ **Always preview** - See outcome before applying (events/incidents gain this)
- ✅ **No surprises** - Confirm all state changes
- ✅ **Same interaction patterns** - Learn once, applies everywhere

### For Developers
- ✅ **Single system** - One pipeline for 93 checks (26 + 37 + 30)
- ✅ **Declarative configs** - ~50 lines per check (no code)
- ✅ **Reusable components** - Interaction handlers work for all
- ✅ **Type-safe** - Compile-time validation
- ✅ **Testable** - Each phase tested independently

### For Maintainability
- ✅ **70% code reduction** - ~2500 lines eliminated total
  - Actions: ~1950 lines (calculated)
  - Events: ~300 lines (controller + duplicated logic)
  - Incidents: ~250 lines (controller + duplicated logic)
- ✅ **Single execution path** - All checks use same flow
- ✅ **Centralized logic** - All in UnifiedCheckHandler
- ✅ **Discoverable** - Pipeline configs self-document
- ✅ **Extensible** - New checks use existing infrastructure

---

## Key Design Decisions

### 1. Unified Data Structure
**Decision:** Normalize events/incidents to use action-like structure

**Trade-off:** Rename `msg` → `description`, `endsEvent` → `endsCheck`

**Benefit:** Single pipeline config format, no special cases

### 2. Mandatory Preview for All
**Decision:** Extend preview requirement to events/incidents

**Trade-off:** Events/incidents need preview calculation logic

**Benefit:** Consistent UX, no surprises for users

### 3. Limited Interactions for Events/Incidents
**Decision:** Events/incidents support dice and choice-dropdown only

**Trade-off:** Can't use compound forms, text input, allocation

**Benefit:** Maintains game design intent (simple random challenges)

### 4. Optional Pre-Roll Interactions
**Decision:** Pre-roll interactions are pipeline feature, not used by events/incidents

**Trade-off:** Actions code paths different from events/incidents

**Benefit:** Actions retain flexibility without complicating events/incidents

### 5. Shared CheckInstance System
**Decision:** Continue using ActiveCheckInstance for all check types

**Trade-off:** None (already works this way)

**Benefit:** Single source of truth for check state

---

## Success Metrics

### Code Metrics
- [ ] Remove 3 controller implementations (~550 lines)
- [ ] Remove 12 custom action implementations (~1000 lines)
- [ ] Remove 12 action dialogs (~800 lines)
- [ ] Remove duplicated resolution logic (~150 lines events/incidents)
- [ ] **Total reduction: ~2500 lines (~70% of check system code)**

### UX Metrics
- [ ] 93/93 checks show preview (currently ~10/93)
- [ ] 93/93 checks have consistent interaction patterns
- [ ] Zero \"unexpected state change\" bug reports
- [ ] Reduced user support questions

### Developer Metrics
- [ ] New check implementation time: 2 hours → 20 minutes
- [ ] Lines of code per check: ~80 → ~30
- [ ] Test coverage: 40% → 85% (easier to test)
- [ ] Onboarding time: 3 days → 4 hours

---

## Comparison Matrix

| Feature | Actions | Events | Incidents | Unified Handler |
|---------|---------|--------|-----------|-----------------|
| **Trigger** | Player choice | Random | Unrest % | Configurable |
| **Pre-roll Interactions** | Full support | None | None | Optional |
| **Post-roll Interactions** | Full support | Limited | Limited | Tiered support |
| **Preview** | 5/26 | 5/37 | 2/30 | **93/93** ✅ |
| **Modifiers** | Typed system | Typed system | Typed system | Typed system |
| **CheckInstance** | Yes | Yes | Yes | Yes |
| **GameCommands** | Yes | No | No | Check-type specific |
| **Persistence** | No | Optional | Optional | Optional |
| **Controller** | 200 lines | 150 lines | 180 lines | **50 lines** ✅ |
| **Custom Code** | 1000 lines | 100 lines | 80 lines | **0 lines** ✅ |

---

## Example Conversions

### Action to Pipeline Config

**Before (JSON + TypeScript):**
```json
// data/player-actions/deal-with-unrest.json
{
  "effects": {
    "success": {
      "description": "Reduce unrest",
      "modifiers": [{"type": "static", "resource": "unrest", "value": -2}]
    }
  }
}
```

**After (Pipeline Config):**
```typescript
{
  id: 'deal-with-unrest',
  checkType: 'action',
  skills: [{ skill: 'diplomacy', description: 'diplomatic engagement' }],
  outcomes: {
    success: {
      description: 'Reduce unrest',
      modifiers: [{ type: 'static', resource: 'unrest', value: -2 }]
    }
  },
  preview: {
    calculate: (ctx) => ({ resources: [{ resource: 'unrest', value: -2 }] }),
    format: (prev) => [{ type: 'resource', message: 'Will reduce unrest by 2', variant: 'positive' }]
  }
}
```

### Event to Pipeline Config

**Before (JSON):**
```json
// data/events/archaeological-find.json
{
  "traits": ["beneficial"],
  "effects": {
    "success": {
      "msg": "Valuable artifacts",
      "modifiers": [{"type": "static", "resource": "gold", "value": 1}],
      "endsEvent": true
    }
  }
}
```

**After (Pipeline Config):**
```typescript
{
  id: 'archaeological-find',
  checkType: 'event',
  traits: ['beneficial'],
  skills: [
    { skill: 'society', description: 'historical research' },
    { skill: 'religion', description: 'divine significance' }
  ],
  outcomes: {
    success: {
      description: 'Valuable artifacts',
      modifiers: [{ type: 'static', resource: 'gold', value: 1 }],
      endsCheck: true
    }
  },
  preview: {
    calculate: (ctx) => ({ resources: [{ resource: 'gold', value: 1 }] }),
    format: (prev) => [{ type: 'resource', message: 'Will gain 1 gold', variant: 'positive' }]
  }
}
```

### Incident to Pipeline Config

**Before (JSON):**
```json
// data/incidents/minor/bandit-activity.json
{
  "tier": "minor",
  "effects": {
    "failure": {
      "msg": "Bandits raid",
      "modifiers": [{"type": "dice", "resource": "gold", "formula": "1d4", "negative": true}],
      "endsEvent": true
    }
  }
}
```

**After (Pipeline Config):**
```typescript
{
  id: 'bandit-activity',
  checkType: 'incident',
  severity: 'minor',
  traits: ['dangerous'],
  skills: [
    { skill: 'intimidation', description: 'show force' },
    { skill: 'stealth', description: 'infiltrate bandits' }
  ],
  outcomes: {
    failure: {
      description: 'Bandits raid',
      modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', negative: true }],
      endsCheck: true
    }
  },
  postRollInteractions: [{ type: 'dice', resource: 'gold', formula: '1d4' }],
  preview: {
    calculate: (ctx) => ({
      resources: [{ resource: 'gold', value: -(ctx.resolutionData.diceRolls.gold || 0) }]
    }),
    format: (prev) => [{ type: 'resource', message: `Will lose ${-prev.resources[0].value} gold`, variant: 'negative' }]
  }
}
```

---

## Summary

Actions, Events, and Incidents are **fundamentally the same system** with minor variations:

**Shared (95% of code):**
- ✅ Skill-based resolution
- ✅ PF2e roll integration
- ✅ CheckInstance state management
- ✅ Typed modifier system
- ✅ GameCommandsService integration
- ✅ OutcomeDisplay UI
- ✅ Same data structures

**Different (5% of code):**
- Triggering mechanism (player vs random vs unrest)
- Pre-roll interactions (actions only)
- Interaction complexity (actions = full, events/incidents = limited)
- Persistence rules (actions never, events/incidents optional)

**Unification Strategy:**
1. Extend UnifiedActionHandler to UnifiedCheckHandler
2. Support three check types with tiered features
3. Enforce preview for all 93 checks
4. Reduce controller logic by 70%
5. Maintain game design intent (simple events/incidents, complex actions)

**Result:** Single pipeline serves all kingdom challenges with consistent UX and minimal code.
