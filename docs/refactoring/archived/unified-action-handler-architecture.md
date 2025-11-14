# Unified Action Handler: Architectural Design

**Purpose:** Single, consistent action resolution system with preview-before-execute UX for all actions

**Last Updated:** 2025-11-14

---

## Executive Summary

This design unifies 26 disparate player actions into a single, predictable flow. All actions follow the same 9-step process, eliminating inconsistent UX and reducing custom implementation code by ~60%.

**Key Innovation:** Mandatory preview phase shows users exactly what will happen before state changes are applied.

---

## The Problem

### Current State Issues

1. **Inconsistent UX**
   - 5 actions show preview (recruit-unit, collect-stipend, etc.)
   - 21 actions execute immediately with no preview
   - Users surprised by unexpected state changes

2. **Multiple Implementation Paths**
   - 12 custom action implementations
   - 5 prepare/commit actions
   - 9 standard JSON-only actions
   - Each reinvents common patterns

3. **Scattered Logic**
   - ActionPhaseController: 200+ lines of routing
   - ActionResolver: Game command routing
   - CheckInstanceHelpers: Prepare some commands
   - Custom implementations: 1000+ lines total

4. **No Stable API**
   - Adding new action requires understanding 4+ systems
   - Custom implementations have no standard structure
   - Preview logic duplicated in execution logic

---

## The Solution: Unified Action Handler

### Core Concept

**Replace imperative custom implementations with declarative pipeline configurations.**

Actions become data structures that describe behavior, not code that implements it.

---

## The 9-Step Unified Flow

Every action follows the same path through the system:

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Select Skill                                        │
│ User chooses skill to use (Diplomacy, Warfare, etc.)        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 2: Pre-Roll Interactions (optional)                    │
│ Gather information BEFORE skill check                       │
│ • Entity Selection (settlement, faction, army, structure)   │
│ • Map Selection (hex, path, placement)                      │
│ • Configuration (resource type, options)                    │
│ • Text Input (name your settlement)                         │
│ • Compound (multiple interactions together)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 3: Prepare Roll                                        │
│ Character selection, DC calculation, roll options           │
│ (Handled by existing ActionExecutionHelpers)                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 4: PF2e Roll Dialog                                    │
│ Foundry VTT native skill check interface                    │
│ (Handled by performKingdomActionRoll)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 5: Process Roll Result → Create Check Instance         │
│ Determine outcome, store in KingdomActor.activeCheckInstances│
│ (Handled by CheckInstanceHelpers)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 6: Post-Roll Interactions (optional)                   │
│ Resolve details AFTER outcome is known                      │
│ • Dice Rolling (1d4 for variable outcomes)                  │
│ • Choice Selection (pick resource from options)             │
│ • Allocation (slider for amounts)                           │
│ • Text Input (name army after seeing recruitment quality)   │
│ • Confirmation (acknowledge outcome-specific effects)        │
│ • Compound (multi-field forms like recruit-unit)            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 7: Preview Outcome ⭐ NEW - REQUIRED FOR ALL           │
│ Show exactly what WILL happen before execution              │
│                                                              │
│ MODE A: Calculated Preview (20 actions)                     │
│   → Display badges after interactions complete              │
│   → Resource changes (+10 gold, -2 unrest)                  │
│   → Entity operations (recruit Iron Guard)                  │
│   → Warnings (insufficient resources)                       │
│                                                              │
│ MODE B: Interactive Preview (6 actions)                     │
│   → Preview provided BY the map interaction                 │
│   → User sees hexes highlight, paths draw in real-time     │
│   → No separate preview display needed                      │
│   → "Apply Result" confirms visible selection               │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 8: Apply Outcome                                       │
│ User clicks "Apply Result" → Execute state changes          │
│ Uses preview calculations (no duplication!)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ STEP 9: Reset Action                                        │
│ Clean up state, ready for next use                          │
│ (Handled by CheckInstanceService)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Two Preview Modes

The system supports two distinct ways of providing preview, both ensuring users see what will happen before execution:

### Mode A: Calculated Preview (20 actions)

**How It Works:**
1. Post-roll interactions complete (dice, choices, forms)
2. Handler calls `preview.calculate(context)` with all data
3. Preview displayed as badges/text: "Will recruit Iron Guard (Level 3)"
4. User reviews preview
5. Clicks "Apply Result" to execute

**When to Use:**
- Actions without map interactions
- Outcome-dependent effects need calculation
- Resource changes need to be clearly displayed
- Entity operations need textual description

**Examples:**
- recruit-unit: Shows "Will recruit Iron Guard (Level 3) stationed at Capital"
- collect-stipend: Shows "Will transfer 50 gp to your character"
- deal-with-unrest: Shows "Will reduce unrest by 2"

**Visual:**
```
[Interactions Complete]
    ↓
[Calculate Preview Data]
    ↓
┌─────────────────────────────────┐
│ Preview Display                 │
│                                 │
│ ⚔️ Will recruit Iron Guard      │
│    Level 3, stationed at Capital│
│                                 │
│ 💰 -50 gold                     │
│ ⚠️ Warning: Low treasury        │
└─────────────────────────────────┘
    ↓
[Apply Result Button]
```

---

### Mode B: Interactive Preview (6 actions)

**How It Works:**
1. Post-roll outcome determined
2. Map interaction opens (HexSelectorService, army path tool)
3. **User sees preview IN REAL-TIME** while selecting
4. Hexes highlight, paths draw, locations mark as user interacts
5. Selection confirmed → Map interaction closes
6. "Apply Result" executes using visible selection (no separate preview display)

**When to Use:**
- Actions that modify map state
- Visual/spatial decisions
- Path planning or territory selection
- Real-time feedback more valuable than text description

**Examples:**
- claim-hexes: Hexes highlight green as selected, borders update live
- build-roads: Path draws as user clicks hexes, connections show
- deploy-army: Route visualizes with arrow, distance calculates
- establish-settlement: Settlement icon appears at cursor, placement validates

**Visual:**
```
[Post-Roll Outcome]
    ↓
[Open Map Selector]
    ↓
┌─────────────────────────────────┐
│ Kingdom Map (Interactive)       │
│                                 │
│  [Hex A] ← Selected (green)    │
│  [Hex B] ← Hovering (light)    │
│  [Hex C] ← Invalid (red)       │
│                                 │
│  Counter: 2/3 hexes selected    │
│  [Confirm] [Cancel]             │
└─────────────────────────────────┘
    ↓
[User Confirms Selection]
    ↓
[Apply Result Button] ← Executes visible state
```

---

### Key Differences

| Aspect | Calculated Preview | Interactive Preview |
|--------|-------------------|---------------------|
| **When shown** | After interactions complete | During interaction |
| **Display** | Text badges, resource counts | Visual map changes |
| **Confirmation** | Review calculated preview | Confirm visible selection |
| **User sees** | "Will do X" description | Actual result visualization |
| **Best for** | Abstract changes (recruit army, gain gold) | Spatial changes (claim hexes, draw paths) |

---

### Pipeline Configuration

**Calculated Preview:**
```typescript
{
  preview: {
    calculate: (context) => ({
      resources: [{ resource: 'gold', value: -50 }],
      entities: [{ type: 'army', name: 'Iron Guard', action: 'create' }]
    }),
    format: (preview) => [
      { type: 'resource', message: 'Will recruit Iron Guard', ... }
    ]
  }
}
```

**Interactive Preview:**
```typescript
{
  preRollInteractions: [{
    type: 'map-selection',
    selectionMode: 'hex',
    count: 3
  }],
  preview: {
    providedByInteraction: true  // Map interaction IS the preview
  }
}
```

---

### Detection Logic

Handler automatically detects which mode:

```
If action has map-selection interaction:
  → Mode B: Interactive Preview
  → Skip separate preview display
  → Map already showed what will happen
  
Else:
  → Mode A: Calculated Preview
  → Call calculate() and format()
  → Display badges before Apply button
```

---

### Actions by Preview Mode

**Calculated Preview (20):**
- arrest-dissidents, collect-stipend, deal-with-unrest
- disband-army, establish-diplomatic-relations
- execute-or-pardon-prisoners, harvest-resources
- infiltration, outfit-army, purchase-resources
- recover-army, recruit-unit, repair-structure
- request-economic-aid, request-military-aid
- sell-surplus, send-scouts, train-army
- upgrade-settlement, build-structure

**Interactive Preview (6):**
- claim-hexes (hex selection shows claims)
- build-roads (path drawing shows roads)
- deploy-army (path shows route + conditions)
- fortify-hex (hex selection shows fortifications)
- create-worksite (hex selection shows worksite placement)
- establish-settlement (placement shows settlement location)

**Key Insight:** Both modes are "preview before execute" - just different presentations. All 26 actions have preview!

---

## Interaction System Architecture

### Universal Interaction Types

Actions declare what interactions they need. The handler orchestrates them automatically.

#### 1. **Entity Selection**
Select from settlement/faction/army/structure lists.

**Used by:** collect-stipend, train-army, establish-diplomatic-relations, etc.

**When:** Usually pre-roll (select what you're acting on), rarely post-roll (outcome determines options)

**UI:** Dialog with dropdown/list

---

#### 2. **Map Selection**
Select hexes, paths, or placement locations on kingdom map.

**Modes:**
- **Hex Selection** - Pick N hexes (claim-hexes, fortify-hex)
- **Hex Path** - Draw connected route (build-roads)
- **Army Path** - Plan deployment route (deploy-army)
- **Placement** - Choose location for new entity (establish-settlement)

**Used by:** claim-hexes, build-roads, deploy-army, fortify-hex, create-worksite

**When:** Pre-roll (declare intent before rolling)

**UI:** HexSelectorService with validation and visual feedback

---

#### 3. **Configuration**
Set parameters like resource types, quantities, or options.

**Used by:** purchase-resources (which resource), build-structure (which structure)

**When:** Usually pre-roll (configure action parameters)

**UI:** Dropdowns, radio buttons, number inputs

---

#### 4. **Dice Rolling**
Roll dice for variable outcomes after skill check.

**Used by:** execute-or-pardon-prisoners (1d4), send-scouts, infiltration

**When:** Post-roll ONLY (requires completed skill check)

**UI:** DiceRoller component with formula display

---

#### 5. **Choice Selection**
Pick from outcome-dependent options.

**Presentations:**
- **Dropdown** - Long lists (harvest-resources: pick resource)
- **Button Grid** - Visual choices (repair-structure: cost tiers)
- **Radio Buttons** - Exclusive options

**Used by:** harvest-resources, repair-structure (via custom components)

**When:** Post-roll (outcome determines available choices)

**UI:** ChoiceSelector or custom components

---

#### 6. **Allocation**
Specify amounts or distributions.

**Presentations:**
- **Slider** - Visual amount selection
- **Input** - Direct number entry
- **Multi-target** - Distribute across multiple recipients

**Used by:** arrest-dissidents (how many to imprison), outfit-army (gold to spend)

**When:** Post-roll (outcome determines max/min)

**UI:** Custom components with validation

---

#### 7. **Text Input**
Free-form text entry.

**Used by:** establish-settlement (name), recruit-unit (army name)

**When:** Pre-roll (plan ahead) OR post-roll (name after seeing quality)

**UI:** Text input with validation

---

#### 8. **Compound**
Multiple interaction types combined in one form.

**Used by:** 
- recruit-unit (text input + entity selection)
- establish-settlement (text input + map selection + entity selection)
- outfit-army (entity selection + choice + allocation)

**When:** Post-roll (outcome affects multiple fields/options)

**UI:** Custom dialog/panel with multiple components

---

### Interaction Constraints

**Pre-Roll Can Use:**
- ✅ Entity Selection
- ✅ Map Selection
- ✅ Configuration
- ✅ Text Input
- ✅ Compound (of above types)

**Post-Roll Can Use:**
- ✅ All pre-roll types (rare but valid)
- ✅ Dice Rolling
- ✅ Choice Selection
- ✅ Allocation
- ✅ Confirmation
- ✅ Compound (any combination)

**Runtime Validation:**
Handler throws error if illogical usage detected (e.g., dice rolling in pre-roll phase).

---

## Pipeline Configuration Model

### Declarative Action Registration

Instead of writing custom TypeScript classes, actions register pipeline configs:

```
Action Pipeline = {
  preRollInteractions: [...],
  postRollInteractions: [...],
  preview: { calculate, format },
  execute: { validate, apply }
}
```

### Pipeline Phases

#### Phase 1: Pre-Roll Interactions
**Purpose:** Gather information needed before skill check

**Handler Responsibilities:**
- Detect interaction types from config
- Mount appropriate UI components
- Validate selections
- Store in metadata for later phases

**Output:** `metadata: { settlementId, armyId, hexPath, customName, ... }`

---

#### Phase 2-5: Roll Execution (Existing System)
**Purpose:** Execute skill check and determine outcome

**No Changes:** Uses existing ActionExecutionHelpers and CheckInstanceHelpers

**Output:** `ActiveCheckInstance` with outcome stored

---

#### Phase 6: Post-Roll Interactions
**Purpose:** Resolve outcome-dependent details

**Handler Responsibilities:**
- Detect interaction types from config
- Mount appropriate UI components
- Pass outcome for conditional logic
- Validate user input
- Store in resolutionData

**Output:** `ResolutionData: { numericModifiers, customComponentData }`

---

#### Phase 7: Preview Calculation ⭐ NEW
**Purpose:** Show exactly what will happen BEFORE execution

**Handler Responsibilities:**
- Call `preview.calculate(context)` with all data
- Receive `PreviewData` with resources/entities/effects
- Call `preview.format(previewData)` to create UI badges
- Display in OutcomeDisplay component

**Context Provided:**
```
{
  action: PlayerAction (from JSON),
  outcome: string (critSuccess/success/failure/critFailure),
  kingdom: KingdomData (current state),
  resolutionData: ResolutionData (user's dice, choices),
  metadata: Record<string, any> (pre-roll selections)
}
```

**Preview Data Structure:**
```
{
  resources: [{ resource: 'gold', value: -50 }],
  entities: [{ 
    type: 'army', 
    name: 'Iron Guard', 
    action: 'create',
    details: { level: 3, conditions: ['+1 initiative'] }
  }],
  specialEffects: [{
    type: 'resource',
    message: 'Will recruit Iron Guard (Level 3)',
    icon: 'fas fa-shield-alt',
    variant: 'positive'
  }],
  warnings: ['Insufficient gold for full recruitment']
}
```

**Key Benefit:** Preview calculations are REUSED in execution (no duplication).

---

#### Phase 8: Execution
**Purpose:** Apply state changes using preview data

**Handler Responsibilities:**
- Run `execute.validate(context, preview)` if defined
- Call `execute.apply(context, preview)` with preview data
- Apply changes to KingdomActor via updateKingdom()
- Handle errors and rollback if needed

**Key Innovation:** Execute receives preview data and uses those calculations directly.

---

#### Phase 9: Reset (Existing System)
**Purpose:** Clean up and ready for next action

**No Changes:** CheckInstanceService handles cleanup

---

## ActionContext: Single Data Flow

All phases receive the same context object:

```
ActionContext = {
  action: PlayerAction,        // From JSON loader
  outcome: string,             // From CheckInstance
  kingdom: KingdomData,        // From KingdomStore
  resolutionData: ResolutionData,  // From post-roll interactions
  metadata: Record<string, any>    // From pre-roll interactions
}
```

**Benefits:**
- No global state pollution
- Clear data dependencies
- Easy testing
- Single object to pass around

---

## System-Wide Architectural Changes

### 1. New Component: UnifiedActionHandler

**Location:** `src/services/UnifiedActionHandler.ts`

**Responsibilities:**
- Register action pipeline configs
- Orchestrate 9-step flow
- Execute pre/post-roll interactions
- Calculate and format previews
- Coordinate execution

**Key Methods:**
- `registerAction(id, pipeline)` - Register at module init
- `needsPreRollInteraction(actionId, kingdom)` - Check if pre-roll needed
- `executePreRollInteractions(actionId, kingdom)` - Handle pre-roll
- `executePostRollInteractions(actionId, outcome, metadata)` - Handle post-roll
- `calculatePreview(actionId, context)` - Generate preview
- `formatPreview(actionId, preview)` - Format for display
- `executeAction(actionId, context, preview)` - Apply changes

---

### 2. Simplified Controller

**ActionPhaseController** reduces from 200+ lines to ~50 lines:

**Before:**
```
• Check for custom implementation
• Route to custom resolver
• OR route to ActionResolver
• Handle game commands separately
• Complex error handling
```

**After:**
```
• Call handler.executeAction()
• Single execution path
• Standard error handling
```

---

### 3. Unified Dialog System

**Before:** 12 separate dialog implementations

**After:** 4 standard interaction handlers
- Entity selection handler
- Map selection handler (HexSelectorService)
- Configuration handler
- Compound handler (combines others)

**Impact:** ~800 lines of dialog code eliminated

---

### 4. Preview System Integration

**OutcomeDisplay Component Changes:**
- Add preview section BEFORE "Apply Result" button
- Display SpecialEffect badges from formatted preview
- Show warnings if any
- Enable button only when preview is valid

**Consistency:** All 26 actions show preview the same way

---

### 5. Elimination of Custom Implementations

**Files Removed:**
- `src/actions/*/Action.ts` (12 files, ~1000 lines)
- `src/controllers/actions/implementations/index.ts` (~100 lines)
- Custom routing logic in ActionPhaseController (~80 lines)

**Replaced With:**
- Pipeline configs (~50 lines per complex action)
- Reusable interaction handlers
- Single execution path

---

## Action Coverage Matrix

| Action | Pre-Roll | Post-Roll | Preview | Notes |
|--------|----------|-----------|---------|-------|
| arrest-dissidents | ❌ | Allocation (slider) | ✅ | Choose imprisonment amount |
| build-roads | Hex Path | ❌ | ✅ | Draw road path, proficiency scaling |
| build-structure | Entity (2x) | ❌ | ✅ | Settlement + structure, 50% cost on crit |
| claim-hexes | Hex Selection | ❌ | ✅ | Proficiency scaling, adjacency validation |
| collect-stipend | Entity (settlement) | ❌ | ✅ | Gold transfer to character |
| create-worksite | Hex Selection | ❌ | ✅ | Resource type validation |
| deal-with-unrest | ❌ | ❌ | ✅ | Simple resource change |
| deploy-army | Entity + Army Path | ❌ | ✅ | Outcome determines conditions |
| disband-army | Entity (army) | ❌ | ✅ | Resource refund calculation |
| establish-diplomatic-relations | Entity (faction) | ❌ | ✅ | Relationship creation |
| establish-settlement | ❌ | Compound | ✅ | Name + placement + free structure (crit) |
| execute-or-pardon-prisoners | Entity (settlement) | Dice (1d4) | ✅ | Imprisoned reduction |
| fortify-hex | Hex Selection | ❌ | ✅ | Defensive fortification |
| harvest-resources | ❌ | Choice (resource) | ✅ | Resource type selector |
| infiltration | Entity (faction) | Dice | ✅ | Variable outcomes |
| outfit-army | Entity (army) | Compound | ✅ | Equipment + gold allocation |
| purchase-resources | Configuration | ❌ | ✅ | Resource type + quantity |
| recover-army | Entity (army) | ❌ | ✅ | Healing calculation |
| recruit-unit | ❌ | Compound | ✅ | Name + settlement + conditions |
| repair-structure | Entity (structure) | Choice (cost tier) | ✅ | Repair options by outcome |
| request-economic-aid | Entity (faction) | ❌ | ✅ | Resource transfer by attitude |
| request-military-aid | Entity (faction) | ❌ | ✅ | Military assistance |
| sell-surplus | ❌ | ❌ | ✅ | Resource exchange |
| send-scouts | ❌ | Dice | ✅ | Discovery outcomes |
| train-army | Entity (army) | ❌ | ✅ | Level-up, outcome effects |
| upgrade-settlement | Entity (settlement) | ❌ | ✅ | Tier transitions |

**Coverage:** All 26 actions supported by interaction system + preview.

---

## Migration Strategy

### Phase 1: Build Foundation (Week 1)
- Create UnifiedActionHandler service
- Define interaction interfaces
- Implement pipeline registration
- Add runtime validation

### Phase 2: Proof of Concept (Week 1-2)
- Convert 3 simple actions (deal-with-unrest, claim-hexes, purchase-resources)
- Validate flow works end-to-end
- Refine based on learnings

### Phase 3: Update Controllers (Week 2)
- Simplify ActionPhaseController
- Update OutcomeDisplay for preview display
- Test with converted actions

### Phase 4: Convert Remaining Actions (Week 3-4)
- Convert all 23 remaining actions
- Migrate custom components to interaction system
- Update documentation

### Phase 5: Cleanup (Week 4)
- Remove custom implementation files
- Remove ACTION_IMPLEMENTATIONS registry
- Remove routing logic
- Archive old code

---

## Benefits Summary

### For Users
- ✅ **Consistent UX** - All actions look and feel the same
- ✅ **Always know what happens** - Preview before every action
- ✅ **No surprises** - Confirm before state changes
- ✅ **Better feedback** - Clear warnings and validation

### For Developers
- ✅ **Single pattern** - Learn once, use everywhere
- ✅ **Declarative configs** - Data, not code
- ✅ **Reusable components** - Interaction handlers work for all actions
- ✅ **Type-safe** - Compile-time validation of pipelines
- ✅ **Testable** - Each phase tested independently

### For Maintainability
- ✅ **60% code reduction** - ~1400 lines eliminated
- ✅ **Single execution path** - Easy debugging
- ✅ **Centralized logic** - All in UnifiedActionHandler
- ✅ **Discoverable** - Pipeline configs self-document
- ✅ **Extensible** - New actions use existing infrastructure

---

## Key Design Decisions

### 1. Declarative over Imperative
**Why:** Reduces code volume, increases consistency, makes actions data instead of programs.

### 2. Mandatory Preview
**Why:** Eliminates #1 user complaint (unexpected state changes), builds trust.

### 3. Single Context Object
**Why:** Eliminates global state, makes testing easy, clarifies dependencies.

### 4. Runtime Validation
**Why:** Flexible while preventing obvious mistakes, better than compile-time for this use case.

### 5. Reuse Preview in Execute
**Why:** Eliminates duplication, guarantees "what you see is what you get."

---

## Success Metrics

### Code Metrics
- [ ] Remove 12 custom implementation files (~1000 lines)
- [ ] Simplify ActionPhaseController by 75% (~150 lines)
- [ ] Eliminate 12 duplicate dialog implementations (~800 lines)
- [ ] Total reduction: ~1950 lines (~60% of action system code)

### UX Metrics
- [ ] 26/26 actions show preview (currently 5/26)
- [ ] 26/26 actions have consistent interaction patterns
- [ ] Zero "unexpected state change" bug reports
- [ ] Reduced user support questions

### Developer Metrics
- [ ] New action implementation time: 2 hours → 30 minutes
- [ ] Lines of code per action: ~80 → ~30
- [ ] Test coverage: 40% → 80% (easier to test)
- [ ] Onboarding time: 2 days → 4 hours

---

## Next Steps

1. **Review and Approve** - Get stakeholder buy-in on architecture
2. **Prototype** - Build Phase 1 + convert 1 action to validate design
3. **Iterate** - Refine based on prototype learnings
4. **Full Migration** - Convert all 26 actions systematically
5. **Documentation** - Update AI_ACTION_GUIDE.md with new patterns

---

**Goal:** Every action follows the same 9-step flow, every user sees preview, every developer uses the same API.
