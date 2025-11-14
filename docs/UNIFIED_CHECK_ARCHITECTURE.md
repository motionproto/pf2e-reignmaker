# Unified Check Resolution Architecture

**Purpose:** Master reference for Actions, Events, and Incidents resolution system

**Last Updated:** 2025-11-14

---

## Executive Summary

Actions, Events, and Incidents are **three variations of the same underlying system**: skill-based checks resolved through a unified 9-step pipeline. They share 95% of their architecture and differ only in triggering mechanism, pre-roll requirements, and persistence rules.

**Key Innovation:** Mandatory preview phase ensures users see exactly what will happen before any state changes are applied—across all 93 checks (26 actions + 37 events + 30 incidents).

---

## The Three Check Types

| Aspect | Actions | Events | Incidents |
|--------|---------|--------|-----------|
| **Trigger** | Player choice | Random (1/turn) | Unrest % roll |
| **Count** | 26 | 37 | 30 |
| **Pre-Roll** | Entity/Map/Config selection | None | None |
| **Post-Roll** | All interaction types | Limited (dice, choice) | Limited (dice, choice) |
| **Preview** | Always required | Required (NEW) | Required (NEW) |
| **Persistence** | Never | Optional (ongoing trait) | Optional (ongoing trait) |
| **Game Commands** | Yes (25+ types) | No (special resources) | No (special resources) |

**Total:** 93 checks using the same resolution pipeline.

---

## The Unified 9-Step Pipeline

Every check follows this flow, regardless of type:

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Trigger                                             │
│ • Actions: Player clicks action button                      │
│ • Events: Random selection (kingdom level filter)           │
│ • Incidents: Unrest percentage roll                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 2: Pre-Roll Interactions (optional)                    │
│ • Actions: May require entity/map/configuration selection   │
│ • Events/Incidents: Skip (none needed)                      │
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
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 6: Post-Roll Interactions (optional)                   │
│ Inline in outcome preview, BEFORE Apply button              │
│ • Actions: Choice widgets, dice rollers                     │
│ • Events/Incidents: Limited (dice, choice-dropdown only)    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 7: Preview Outcome ⭐ REQUIRED FOR ALL                 │
│ Mode A: Calculated Preview (text/badges)                    │
│ Mode B: Interactive Preview (map visualization)             │
│ Shows outcome with user choices from Step 6                 │
│                     [Apply Result]                           │
└────────────────────────┬────────────────────────────────────┘
                         │ User clicks Apply
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 7.5: Post-Apply Interactions (optional)                │
│ Full-screen/modal, AFTER Apply button clicked               │
│ • Actions: Map selections, entity browsers                  │
│ • Events/Incidents: None (never needed)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 8: Execute                                             │
│ ALL: Apply changes using preview data (no re-calculation)   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 9: Reset                                               │
│ • Actions: Always clear                                     │
│ • Events/Incidents: Persist if endsCheck: false             │
└─────────────────────────────────────────────────────────────┘
```

---

## Three-Phase Interaction System

The unified pipeline supports **three optional interaction phases** to accommodate different action patterns:

### Phase 1: Pre-Roll Interactions
**Timing:** BEFORE skill check  
**Use for:** Decisions that affect the roll or are needed regardless of outcome  
**Available to:** Actions only  

**Example patterns:**
- Entity selection: "Which settlement for stipend collection?"
- Map selection: "Where to deploy army?"
- Configuration: "How many resources to purchase?"

**Flow:**
```
User initiates action → Pre-roll dialog → User selects → Skill check
```

### Phase 2: Post-Roll Interactions (Inline)
**Timing:** AFTER outcome determined, BEFORE Apply button  
**Display:** Inline within outcome preview  
**Use for:** Choices/decisions based on outcome  
**Available to:** All check types (limited for events/incidents)

**Example patterns:**
- Choice widgets: "Choose +2 Gold OR +1 Fame"
- Dice rollers: "Roll 1d4 for imprisoned reduction"
- Resource selection: "Choose which bonus to apply"

**Flow:**
```
Skill check → Outcome → Choice widgets (inline) → Preview updates → Apply
```

### Phase 3: Post-Apply Interactions
**Timing:** AFTER Apply button clicked  
**Display:** Full-screen/modal overlay  
**Use for:** Complex workflows that need full screen  
**Available to:** Actions only

**Example patterns:**
- Map selections: "Select hexes to claim"
- Entity browsers: "Choose army to outfit"
- Multi-step wizards: "Configure settlement"

**Flow:**
```
Apply clicked → Map overlay → User selects → Kingdom updates → Completion panel → OK
```

### Why Three Phases?

**Pre-roll vs Post-roll:**
- Some decisions must happen before the roll (entity selection, initial configuration)
- Some decisions depend on the outcome (choose rewards based on success level)

**Post-roll vs Post-apply:**
- Inline choices fit within outcome preview (compact, quick)
- Map/entity selection needs full screen (complex, visual)

**Example: Claim Hexes uses Post-Apply**
```typescript
postApplyInteractions: [{
  type: 'map-selection',
  outcomeAdjustment: {
    criticalSuccess: { count: (ctx) => /* proficiency-based */ },
    success: { count: 1 }
  }
}]
```

User sees: Outcome → Apply → Map opens → Select hexes → Territory expands → OK

---

## Interaction System

### Universal Interaction Types

Actions declare needed interactions via pipeline configs. The handler orchestrates them automatically.

#### 1. Entity Selection
Select from settlement/faction/army/structure lists.

**When:** Pre-roll (actions only)

**Examples:** collect-stipend, train-army, establish-diplomatic-relations

#### 2. Map Selection
Select hexes, draw paths, or choose placement on kingdom map.

**Modes:**
- Hex Selection (claim-hexes, fortify-hex)
- Hex Path (build-roads)
- Army Path (deploy-army)
- Placement (establish-settlement)

**When:** Pre-roll (actions only)

**Provides:** Interactive preview (selection IS the preview)

#### 3. Configuration
Set parameters like resource types, quantities, options.

**When:** Pre-roll (actions only)

**Examples:** purchase-resources, build-structure

#### 4. Dice Rolling
Roll dice for variable outcomes after skill check.

**When:** Post-roll (all check types)

**Examples:** execute-or-pardon-prisoners (1d4), archaeological-find event

#### 5. Choice Selection
Pick from outcome-dependent options.

**Presentations:**
- choice-buttons (actions - large visual buttons)
- choice-dropdown (events/incidents - compact dropdown)

**When:** Post-roll (all check types)

**Examples:** harvest-resources, repair-structure

#### 6. Allocation
Specify amounts or distributions via sliders/inputs.

**When:** Post-roll (actions only)

**Examples:** arrest-dissidents, outfit-army

#### 7. Text Input
Free-form text entry.

**When:** Pre-roll OR post-roll (actions only)

**Examples:** establish-settlement (name), recruit-unit (army name)

#### 8. Compound
Multiple interaction types combined in one form.

**When:** Post-roll (actions only)

**Examples:** recruit-unit (text + entity), establish-settlement (text + map + entity)

### Interaction Constraints

**Actions:**
- Pre-roll: Entity, Map, Configuration, Text, Compound
- Post-roll: All types

**Events/Incidents:**
- Pre-roll: None
- Post-roll: Dice, Choice-dropdown only

---

## Two Preview Modes

### Mode A: Calculated Preview

**How it works:**
1. Post-roll interactions complete
2. Handler calls `preview.calculate(context)` with all data
3. Preview displayed as badges: "Will recruit Iron Guard (Level 3)"
4. User reviews, clicks "Apply Result"

**When to use:**
- Actions without map interactions (20/26)
- All events (37/37)
- All incidents (30/30)

**Example:**
```
Preview Display:
⚔️ Will recruit Iron Guard
   Level 3, stationed at Capital
💰 -50 gold
⚠️ Warning: Low treasury

[Apply Result]
```

### Mode B: Interactive Preview

**How it works:**
1. Post-roll outcome determined
2. Map interaction opens (HexSelectorService)
3. **User sees preview IN REAL-TIME** while selecting
4. Hexes highlight, paths draw as user interacts
5. Selection confirmed → "Apply Result" executes visible state

**When to use:**
- Map-based actions (6/26): claim-hexes, build-roads, deploy-army, fortify-hex, create-worksite, establish-settlement
- Never for events/incidents

**Example:**
```
Kingdom Map (Interactive):
[Hex A] ← Selected (green)
[Hex B] ← Hovering (light)
[Hex C] ← Invalid (red)

Counter: 2/3 hexes selected
[Confirm] [Cancel]
```

**Key Insight:** Map interaction itself IS the preview—no separate display needed.

---

## Game Commands Integration

### What Are Game Commands?

Complex state changes beyond simple resource modifiers:
- Create entities (recruitArmy, foundSettlement)
- Modify state (claimHexes, trainArmy)
- Transfer resources (giveActorGold)
- Special operations (reduceImprisoned, damageStructure)

### Current State: Mixed Concerns

**Problem:** Some commands use "prepare/commit" pattern (old interim solution):
- `prepare()` mixed pre-roll data gathering + preview calculation
- `commit()` contained the actual execution logic
- Mixed concerns across Steps 2, 7, and 8

**This pattern is being ELIMINATED, not expanded.**

### Target State: Simple Execution Functions

**Game commands become pure execution functions:**

```typescript
// Simple execution function (extracted from old commit closures)
async function recruitArmyExecution(
  kingdom: KingdomData,
  armyData: { name: string; level: number; stationedAt: string }
): Promise<void> {
  await updateKingdom(k => {
    k.armies.push({
      id: generateId(),
      name: armyData.name,
      level: armyData.level,
      stationed: armyData.stationedAt
    });
    k.gold -= calculateRecruitmentCost(armyData.level);
  });
}
```

**Preview logic moves to pipeline:**

```typescript
// In action pipeline config
{
  preview: {
    calculate: (ctx) => {
      const cost = calculateRecruitmentCost(ctx.kingdom.level);
      return {
        resources: [{ resource: 'gold', value: -cost }],
        entities: [{ type: 'army', action: 'create', name: ctx.resolutionData.armyName }]
      };
    }
  },
  execute: async (ctx) => {
    await recruitArmyExecution(ctx.kingdom, {
      name: ctx.resolutionData.armyName,
      level: ctx.kingdom.level,
      stationedAt: ctx.resolutionData.settlementId
    });
  }
}
```

### Clean Separation of Concerns

**Pipeline handles:**
- Step 2: Pre-roll interactions (entity/map selection)
- Step 7: Preview calculation (`preview.calculate()`)
- Step 8: Execution (calls game command functions)

**Game commands handle:**
- Pure execution (apply state changes)
- Take structured data (no context mixing)
- Testable in isolation

**Result:** Users see complete preview (resources + command effects) before applying.

---

## Data Structures

### CheckPipeline

Universal config format for all check types:

```typescript
interface CheckPipeline {
  // Metadata
  id: string;
  name: string;
  description: string;
  checkType: 'action' | 'event' | 'incident';
  
  // Skill options (all)
  skills: SkillOption[];
  
  // Pre-roll (actions only)
  preRollInteractions?: Interaction[];
  
  // Post-roll (all, limited for events/incidents)
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
    providedByInteraction?: boolean;  // Map selection mode
  };
  
  // Actions-specific
  gameCommands?: GameCommand[];
  
  // Events/Incidents-specific
  traits?: Trait[];
  endsCheck?: boolean;
}
```

### CheckContext

Single data object passed through all pipeline phases:

```typescript
interface ActorContext {
  // Basic info
  actorId: string;
  actorName: string;
  level: number;
  
  // Skill info
  selectedSkill: string;
  proficiencyRank: number;  // 0 = untrained, 1 = trained, 2 = expert, 3 = master, 4 = legendary
  
  // Full skill data (for future use)
  skillData?: {
    rank: number;
    modifier?: number;
    breakdown?: string;
  };
}

interface CheckContext {
  check: PlayerAction | KingdomEvent | KingdomIncident;
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  kingdom: KingdomData;
  actor?: ActorContext;             // Actor context (proficiency, level, etc.)
  resolutionData: ResolutionData;   // Post-roll interactions
  metadata: Record<string, any>;    // Pre-roll selections
  instanceId: string;
}
```

**ActorContext Usage:**

The `actor` field provides access to character-level information during pipeline execution, enabling:

- **Dynamic interaction parameters:** Proficiency-based hex counts, level-scaled effects
- **Character-aware decisions:** Skill modifier checks, proficiency requirements
- **Preview calculations:** Character-specific resource generation estimates

**Example - Proficiency-based hex count:**
```typescript
postApplyInteractions: [{
  type: 'map-selection',
  outcomeAdjustment: {
    criticalSuccess: {
      // Dynamic count based on proficiency rank
      count: (ctx) => {
        const proficiency = ctx.actor?.proficiencyRank || 0;
        return proficiency >= 3 ? 4 : proficiency >= 2 ? 3 : 2;
      }
    }
  }
}]
```

### PreviewData

Structured output from preview calculation:

```typescript
interface PreviewData {
  resources: Array<{
    resource: ResourceType;
    value: number;
  }>;
  
  entities?: Array<{
    type: 'army' | 'settlement' | 'structure';
    name: string;
    action: 'create' | 'modify' | 'delete';
    details: any;
  }>;
  
  specialEffects: SpecialEffect[];
  warnings?: string[];
}
```

### SpecialEffect

Formatted badge for display:

```typescript
interface SpecialEffect {
  type: 'resource' | 'entity' | 'status';
  message: string;
  icon?: string;
  variant: 'positive' | 'negative' | 'neutral';
}
```

---

## Architectural Components

### UnifiedCheckHandler

**Location:** `src/services/UnifiedCheckHandler.ts` (to be created)

**Responsibilities:**
- Register check pipeline configs
- Orchestrate 9-step flow
- Execute pre/post-roll interactions
- Calculate and format previews
- Coordinate execution

**Key Methods:**
- `registerCheck(id, pipeline)` - Register at module init
- `executePreRollInteractions(checkId)` - Handle pre-roll (actions only)
- `executeSkillCheck(checkId, skill, metadata)` - Trigger roll
- `executePostRollInteractions(instanceId)` - Handle post-roll
- `calculatePreview(instanceId, resolutionData)` - Generate preview
- `formatPreview(preview)` - Format for display
- `executeCheck(instanceId, preview)` - Apply changes

### Simplified Controllers

Controllers become thin wrappers (~50 lines each):

**ActionPhaseController:**
```typescript
async resolveAction(actionId, skill) {
  await checkHandler.executePreRollInteractions(actionId);
  await checkHandler.executeSkillCheck(actionId, skill, metadata);
}
```

**EventPhaseController:**
```typescript
async resolveEvent(eventId, skill) {
  await checkHandler.executeSkillCheck(eventId, skill);
}
```

**UnrestPhaseController:**
```typescript
async resolveIncident(incidentId, skill) {
  await checkHandler.executeSkillCheck(incidentId, skill);
}
```

### Shared Services (Unchanged)

- **CheckInstanceService** - State management
- **GameCommandsService** - Modifier application
- **OutcomeDisplay** - UI component

---

## Benefits of Unification

### For Users
- ✅ 93/93 checks show preview (currently ~10/93)
- ✅ Consistent UX across all check types
- ✅ No unexpected state changes
- ✅ Same interaction patterns everywhere

### For Developers
- ✅ Single pipeline for all 93 checks
- ✅ Declarative configs (~50 lines/check)
- ✅ Reusable interaction handlers
- ✅ Type-safe with compile-time validation
- ✅ New check: 2 hours → 20 minutes

### For Maintainability
- ✅ 70% code reduction (~2500 lines eliminated)
  - Actions: ~1950 lines
  - Events: ~300 lines
  - Incidents: ~250 lines
- ✅ Single execution path
- ✅ Centralized in UnifiedCheckHandler
- ✅ Self-documenting pipeline configs
- ✅ Extensible for future check types

---

## Success Metrics

### Code Metrics
- [ ] Remove 3 controller implementations (~550 lines)
- [ ] Remove 12 custom action implementations (~1000 lines)
- [ ] Remove 12 action dialogs (~800 lines)
- [ ] Remove duplicated resolution logic (~150 lines)
- [ ] **Total: ~2500 lines eliminated**

### UX Metrics
- [ ] 93/93 checks show preview
- [ ] 93/93 checks have consistent patterns
- [ ] Zero "unexpected state change" reports
- [ ] Reduced support questions

### Developer Metrics
- [ ] New check time: 2 hours → 20 minutes
- [ ] Code per check: ~80 → ~30 lines
- [ ] Test coverage: 40% → 85%
- [ ] Onboarding time: 3 days → 4 hours

---

## Key Design Decisions

### 1. Declarative over Imperative
**Why:** Reduces code volume, increases consistency, makes checks data instead of programs.

### 2. Mandatory Preview for All
**Why:** Eliminates #1 user complaint (unexpected state changes), builds trust.

### 3. Single CheckContext Object
**Why:** Eliminates global state, makes testing easy, clarifies dependencies.

### 4. Game Commands as Pipeline Step
**Why:** Integrates complex operations into standard flow, enables preview for all commands.

### 5. Prepare/Commit Pattern
**Why:** Guarantees preview accuracy, eliminates duplicate logic, enables rollback.

### 6. Two Preview Modes
**Why:** Map interactions provide real-time visual feedback; calculated previews for everything else.

### 7. Tiered Interaction Support
**Why:** Actions need full complexity; events/incidents stay simple by design.

---

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Check Types** | 3 separate systems | 1 unified system |
| **Controllers** | 530 lines total | 150 lines total |
| **Preview** | 10/93 checks | 93/93 checks |
| **Custom Code** | ~1180 lines | 0 lines |
| **Implementation** | Imperative (code) | Declarative (data) |
| **Execution Path** | 3 different paths | 1 unified path |
| **Testing** | System-level only | Unit + integration |
| **Onboarding** | 3 days (3 systems) | 4 hours (1 system) |

---

## Related Documentation

- **Migration Guide:** `docs/refactoring/MIGRATION_GUIDE.md` - Step-by-step implementation
- **Check Instance System:** `docs/systems/check-instance-system.md` - State management
- **Game Commands System:** `docs/systems/game-commands-system.md` - Complex operations
- **Typed Modifiers:** `docs/systems/typed-modifiers-system.md` - Resource changes
- **AI Action Guide:** `docs/AI_ACTION_GUIDE.md` - Quick reference for implementation

---

**Goal:** Every check follows the same 9-step flow, every user sees preview, every developer uses the same API—across all 93 kingdom challenges.
