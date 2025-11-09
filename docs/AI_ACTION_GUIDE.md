# AI Assistant: Action Implementation Guide

**Purpose:** Quick reference for implementing, updating, and maintaining kingdom actions.

---

## Quick Decision Tree

**Creating a new action?**
- JSON-only → Section 1.1
- Pre-roll dialog needed → Section 1.2
- Custom resolution → Section 1.3
- Game command → Section 1.4
- Post-roll selection → Section 1.5
- Hex selection → Section 1.6
- In-line selection (choice modifiers) → Section 1.7

**Updating existing action?**
- Change modifiers → Section 2.1
- Add game command → Section 2.2
- Add pre-roll dialog → Section 2.3
- Add hex selection → Section 2.4
- Add in-line selection → Section 2.5

**Debugging?**
- Dice not applying → Section 3.1
- Pre-roll dialog not opening → Section 3.2
- Command not executing → Section 3.3
- Selection data not accessible → Section 3.4
- Hex selection not working → Section 3.6
- In-line selection not appearing → Section 3.7

---

## Section 1: Creating New Actions

### 1.1 JSON-Only Action (Simple)

**When:** Action only changes resources (gold, unrest, fame, etc.)

**Files:** `data/player-actions/{action-id}.json`

**Reference:** 
- Implementation: `docs/systems/action-resolution-complete-flow.md#pattern-1-standard-json-only-action`
- Modifiers: `docs/systems/typed-modifiers-system.md#modifier-types`

**Example:**
```json
{
  "id": "deal-with-unrest",
  "name": "Deal with Unrest",
  "category": "uphold-stability",
  "skills": [{"skill": "diplomacy", "description": "diplomatic engagement"}],
  "effects": {
    "success": {
      "description": "The People Listen",
      "modifiers": [{
        "type": "static",
        "resource": "unrest",
        "value": -2,
        "duration": "immediate"
      }]
    }
  }
}
```

### 1.2 Pre-Roll Dialog Pattern

**When:** Need user selection BEFORE roll (settlement, faction, structure, etc.)

**Files to create/modify:**
1. `src/actions/{action-id}/YourDialog.svelte` - Dialog component
2. `src/controllers/actions/action-handlers-config.ts` - Registration
3. `src/view/kingdom/turnPhases/ActionsPhase.svelte` - State & handlers
4. `src/view/kingdom/turnPhases/components/ActionDialogManager.svelte` - Wire up

**Reference:** `docs/systems/action-resolution-complete-flow.md#pattern-2-pre-roll-dialog-pattern`

**Recent Example:** `request-economic-aid` (completed 2025-11-07)

**Implementation Steps:**
1. Create dialog component (filters valid selections)
2. Register in `action-handlers-config.ts` with `requiresPreDialog: true`
3. Add state variables to ActionsPhase.svelte
4. Add selection handler and roll execution function
5. Wire dialog into ActionDialogManager.svelte

### 1.3 Custom Resolution Pattern

**When:** Complex outcome calculation (50% cost reduction, tier transitions, etc.)

**Files:** `src/actions/{action-id}/YourAction.ts`

**Reference:** `docs/systems/action-resolution-complete-flow.md#pattern-3-custom-resolution-pattern`

**Example Use Cases:**
- `build-structure` - 50% cost reduction on crit success
- `upgrade-settlement` - Tier transition logic
- `repair-structure` - Repair mechanics

### 1.4 Game Command Pattern

**When:** Create entities (armies, settlements), modify state beyond resources

**Available Commands:** `docs/systems/game-commands-system.md#command-categories` (25+ types)

**Add in JSON:** `effects.{outcome}.gameCommands: []`

**Reference:** `docs/systems/game-commands-system.md#command-structure-examples`

**Example:**
```json
{
  "success": {
    "description": "Recruit a troop equal to the party level",
    "modifiers": [],
    "gameCommands": [{
      "type": "recruitArmy",
      "level": "kingdom-level"
    }]
  }
}
```

### 1.5 Post-Roll Selection Pattern (Custom Components)

**When:** User needs to make selection AFTER seeing outcome but BEFORE applying effects

**Files:** `src/view/kingdom/components/OutcomeDisplay/components/YourCustomResolution.svelte`

**⚠️ IMPORTANT:** Start with the simple pattern! Most custom UI should hardcode data and calculate from outcome.

**Quick Decision:**
- Simple choice (A/B/C)? → Use `choice-buttons` modifier (Section 1.7)
- Need custom UI? → Read comprehensive guide: **[Custom UI Action Guide](../guides/CUSTOM_UI_ACTION_GUIDE.md)**

**Two Patterns:**

1. **Simple Pattern (Recommended)** - Component hardcodes data, no props needed
   - Example: Harvest Resources (choose food/lumber/stone/ore)
   - Files: 2 (action + component)
   - Complexity: Low

2. **Complex Pattern (Rare)** - Component reads from stores for dynamic data
   - Example: Arrest Dissidents (allocate unrest across settlements)
   - Files: 2 (action + component)
   - Complexity: High

**Key Difference from Pre-Roll:**
- **Pre-roll** = Selection needed to determine WHICH skill check to make
- **Post-roll** = Selection needed to determine HOW to apply the outcome

**Full Implementation Guide:** [Custom UI Action Guide](../guides/CUSTOM_UI_ACTION_GUIDE.md)

**Key Principles:**
- ✅ Hardcode data in component (don't use props unless needed)
- ✅ Calculate amounts from `outcome` prop
- ✅ Keep UI minimal (visual feedback over text)
- ✅ Study working examples (Harvest Resources, Arrest Dissidents)
- ❌ Don't over-engineer with props
- ❌ Don't use custom UI when `choice-buttons` would work

### 1.6 Hex Selection Pattern

**When:** Action requires interactive hex selection on the kingdom map

**Files:** Action JSON + GameCommandsResolver method

**Reference:** `docs/systems/game-commands-system.md#hex-selection-integration`

**How It Works:**
1. Action triggers game command (e.g., `claimHexes`, `buildRoads`)
2. GameCommandsResolver calls HexSelectorService
3. Interactive overlay appears with validation
4. User selects hexes on map
5. Command executes with selected hexes

**Example Actions:**
- `claim-hexes` - Select hexes to add to kingdom
- `build-roads` - Select hexes for road construction
- `fortify-hex` - Select hex to fortify

**Common Game Commands with Hex Selection:**
- `claimHexes` - Expand territory
- `buildRoads` - Construct roads
- `fortifyHex` - Add defenses
- `foundSettlement` - Place new settlement
- `removeBorderHexes` - Lose territory (incidents/events)

**Key Features:**
- Type-specific color themes (claim=green, unclaim=red, road=teal, etc.)
- Validation functions (only border hexes, adjacent to claimed, etc.)
- Hover previews with visual feedback
- Cancel support (returns null, action aborts)

### 1.7 In-Line Selection Pattern (Choice Modifiers)

**When:** User needs to pick which resource to apply modifier to

**Files:** Action JSON only (no code needed)

**Reference:** `docs/systems/typed-modifiers-system.md#choicemodifier`

**⚠️ BREAKING CHANGE (2025-11-08):** Two explicit types for resource selection:
- `type: "choice-buttons"` - Large visual buttons (for player actions)
- `type: "choice-dropdown"` - Inline dropdown selector (for events/incidents)

**Choice Buttons Pattern (Actions):**
```json
{
  "success": {
    "description": "Gain 2 of your choice",
    "modifiers": [{
      "type": "choice-buttons",
      "resources": ["food", "lumber", "stone", "ore"],
      "value": 2,
      "negative": false,
      "duration": "immediate"
    }]
  }
}
```

**Display:** 4 large buttons appear inline: "Gain 2 Food", "Gain 2 Lumber", etc.

**Choice Dropdown Pattern (Events/Incidents):**
```json
{
  "failure": {
    "msg": "Minor artifacts; gain 1 of your choice",
    "modifiers": [{
      "type": "choice-dropdown",
      "resources": ["food", "lumber", "ore", "stone"],
      "value": 1,
      "negative": false,
      "duration": "immediate"
    }]
  }
}
```

**Display:** Dropdown appears inline in outcome card with resource options

**Key Differences:**
- **Choice Buttons** = Large visual buttons for important player decisions (actions)
- **Choice Dropdown** = Compact dropdown for quick selections (events/incidents)
- **Post-Roll Component** = Complex custom UI (ranges, multiple inputs, etc.)

**When to Use:**
- Use `choice-buttons` for **player actions** where choice is a key decision
- Use `choice-dropdown` for **events/incidents** where choice is minor/incidental

---

## Section 2: Updating Existing Actions

### 2.1 Change Modifiers

**Location:** `data/player-actions/{action-id}.json`

**Modifier Types:**

**Static:**
```json
{ "type": "static", "resource": "gold", "value": 10, "duration": "immediate" }
```

**Dice:**
```json
{ "type": "dice", "resource": "gold", "formula": "2d6", "negative": true, "duration": "immediate" }
```

**Choice Buttons (Actions):**
```json
{ "type": "choice-buttons", "resources": ["food", "lumber", "stone", "ore"], "value": 2, "negative": false, "duration": "immediate" }
```

**Choice Dropdown (Events/Incidents):**
```json
{ "type": "choice-dropdown", "resources": ["food", "lumber", "ore", "stone"], "value": 1, "negative": false, "duration": "immediate" }
```

**⚠️ BREAKING CHANGE (2025-11-08):** Old `type: "choice"` no longer supported. Use explicit types:
- `choice-buttons` for player actions
- `choice-dropdown` for events/incidents

**Reference:** `docs/systems/typed-modifiers-system.md#modifier-types`

**⚠️ CRITICAL:** ALWAYS use `"duration": "immediate"` for action modifiers, NOT `"ongoing"`

**Reference:** `docs/systems/events-and-incidents-system.md#always-use-immediate-duration`

### 2.2 Add Game Command

**Location:** `data/player-actions/{action-id}.json` → `effects.{outcome}.gameCommands`

**Available Commands:** `docs/systems/game-commands-system.md#command-categories` (25+ types)

**Categories:**
- Territory & Expansion (claimHexes, buildRoads, fortifyHex)
- Settlement & Construction (foundSettlement, buildStructure, upgradeSettlement)
- Military Operations (recruitArmy, trainArmy, deployArmy, disbandArmy)
- Diplomatic Actions (establishDiplomaticRelations, adjustFactionAttitude, requestEconomicAid)
- Event & Unrest Management (arrestDissidents, reduceImprisoned)

**Routing:** Commands automatically routed via GameCommandHelpers

**Reference:** `docs/systems/game-commands-system.md#data-flow`

### 2.3 Add Pre-Roll Dialog to Existing Action

**Step 1:** Register in `action-handlers-config.ts` → `requiresPreDialog: true`

**Step 2:** Create dialog component in `src/actions/{action-id}/YourDialog.svelte`

**Step 3:** Wire in ActionsPhase.svelte (add state, handlers, execution function)

**Step 4:** Add to ActionDialogManager.svelte (import, bind state, route events)

**Reference:** `docs/systems/action-resolution-complete-flow.md#implementation-steps` (Pattern 2)

### 2.4 Add Hex Selection to Existing Action

**Step 1:** Add game command to action JSON
```json
{
  "gameCommands": [{
    "type": "claimHexes",
    "count": 3
  }]
}
```

**Step 2:** Implement in GameCommandsResolver (if new command type)
- Call `hexSelectorService.selectHexes(config)`
- Provide validation function
- Apply changes to kingdom

**Step 3:** Route in GameCommandHelpers (if new command type)

**Reference:** `docs/systems/game-commands-system.md#hex-selection-integration`

### 2.5 Add In-Line Selection to Existing Action

**Location:** `data/player-actions/{action-id}.json`

**Simply add ChoiceModifier:**
```json
{
  "modifiers": [{
    "type": "choice",
    "resources": ["gold", "food", "lumber"],
    "value": 5
  }]
}
```

**No code changes needed** - OutcomeDisplay handles automatically

**Reference:** `docs/systems/typed-modifiers-system.md#choicemodifier`

---

## Section 3: Troubleshooting

### 3.1 Dice Values Not Applying

**Symptom:** User rolls dice, clicks Apply, but rolled value not used in game command

**Cause:** ResolutionData not being converted to preRolledValues Map

**Solution:** ActionPhaseController must convert ResolutionData → preRolledValues

**Reference:** `docs/systems/action-resolution-complete-flow.md#issue-1-dice-values-not-being-applied`

**Check:**
- Is controller calling `ActionResolver.executeAction()` with preRolledValues?
- Is game command using `"amount": "rolled"`?
- Is modifier index matching correctly?

### 3.2 Pre-Roll Dialog Not Opening

**Check:**
1. Registered in `action-handlers-config.ts` with `requiresPreDialog: true`?
2. State variable exists in ActionsPhase.svelte?
3. Dialog component imported in ActionDialogManager.svelte?
4. Dialog properly bound with `bind:show={showYourDialog}`?
5. Event handler exists (e.g., `handleYourSelection`)?

**Reference:** `docs/systems/action-resolution-complete-flow.md#issue-6-pre-roll-dialog-not-opening`

### 3.3 Game Commands Not Executing

**Symptom:** Resource modifiers apply, but game command effects don't happen

**Check:**
1. `gameCommands` field exists in action JSON?
2. Controller calls `ActionResolver.executeAction()` (not bypassing)?
3. Command type registered in `GameCommandHelpers.executeGameCommands()`?
4. Game command routed to GameCommandsResolver method?

**Reference:** `docs/systems/action-resolution-complete-flow.md#issue-4-game-commands-not-executing`

### 3.4 Selection Data Not Accessible

**Symptom:** Pre-roll dialog selection made, but game command doesn't have data

**Cause:** Not storing selection in global state

**Solution:** Store in global state after dialog selection:
```typescript
// In selection handler
(globalThis as any).__pendingYourSelection = selectionId;

// In action resolver
const selectionId = (globalThis as any).__pendingYourSelection;

// Clean up after
delete (globalThis as any).__pendingYourSelection;
```

**Reference:** `docs/systems/action-resolution-complete-flow.md#issue-7-selection-data-not-accessible-in-resolver`

### 3.5 Game Commands Not Loading from JSON

**Symptom:** Action JSON has gameCommands, but ActionResolver finds none

**Cause:** `action-loader.ts` not copying gameCommands from JSON

**Solution:** Ensure action-loader includes gameCommands in all outcome mappings

**Reference:** `docs/systems/action-resolution-complete-flow.md#issue-5-game-commands-not-loading-from-json`

### 3.6 Hex Selection Not Working

**Symptom:** Action triggers but no hex selector appears, or validation not working

**Check:**
1. Game command correctly formatted in JSON?
2. GameCommandsResolver calling `hexSelectorService.selectHexes()`?
3. Validation function provided and working correctly?
4. Kingmaker scene active? (hex selector requires map scene)
5. Hexes array exists in kingdom data?

**Common Issues:**
- **No hexes appear** → Validation function rejecting all hexes
- **Can't click hexes** → Canvas not interactive (scene not active)
- **Wrong hexes highlighted** → Validation function logic error
- **Selection not applying** → Check for null return (user cancelled)

**Debug Pattern:**
```typescript
// In validation function
validationFn: (hexId) => {
  const valid = yourValidationLogic(hexId);
  console.log(`[HexValidation] ${hexId}: ${valid}`);
  return valid;
}
```

**Reference:** `docs/systems/game-commands-system.md#hex-selection-integration`

### 3.7 Custom UI Not Rendering

**Symptom:** Custom component not appearing after outcome displayed

**Check:**
1. ✅ Component exported from action's `customResolution.component`?
2. ✅ Action registered in `implementations/index.ts`?
3. ✅ `needsCustomResolution()` returns true for outcome?
4. ✅ No JavaScript errors in console?

**Common Causes:**
- **Buttons not appearing** → Resource array empty (check hardcoded data)
- **Component not mounting** → needsCustomResolution() returns false
- **Selection not applying** → Missing dispatch('selection', ...) event
- **Apply stays disabled** → validateData() returns false

**Quick Fix - Debug logging:**
```typescript
// In action file
needsCustomResolution(outcome): boolean {
  const needs = outcome === 'success' || outcome === 'criticalSuccess';
  console.log(`[YourAction] needsCustomResolution(${outcome}): ${needs}`);
  return needs;
}

validateData(resolutionData: ResolutionData): boolean {
  console.log('[YourAction] Validating:', resolutionData.customComponentData);
  const valid = !!(resolutionData.customComponentData?.selectedOption);
  console.log('[YourAction] Valid:', valid);
  return valid;
}
```

**Detailed Troubleshooting:** [Custom UI Action Guide](../guides/CUSTOM_UI_ACTION_GUIDE.md#troubleshooting)

**Common Mistakes:**
- ❌ Using getComponentProps() (unnecessary complexity - hardcode data instead)
- ❌ Using custom component when choice-buttons would work
- ❌ Forgetting to emit 'selection' event
- ❌ Not storing state in customComponentData

**Quick Decision:**
- Simple A/B/C choice? → Use `choice-buttons` modifier (no code needed)
- Complex UI needed? → Follow [Simple Pattern](../guides/CUSTOM_UI_ACTION_GUIDE.md#the-simple-pattern-recommended)

### 3.8 In-Line Selection Not Appearing

**Symptom:** ChoiceModifier in JSON but no buttons/dropdown appears

**⚠️ BREAKING CHANGE (2025-11-08):** Must use explicit types `choice-buttons` or `choice-dropdown`

**Check:**
1. Modifier has correct explicit type (`"choice-buttons"` or `"choice-dropdown"`)?
2. `resources` array has 2+ options?
3. `negative` field present (true or false)?
4. OutcomeDisplay rendering correctly?
5. No JavaScript errors in console?

**Common Issues:**
- **Old type** → `type: "choice"` no longer works (BREAKING CHANGE)
- **Single resource** → No choice needed, shows as static modifier
- **Empty resources array** → Nothing to choose from
- **Wrong type** → Must be `"choice-buttons"` or `"choice-dropdown"`, not `"select"` or `"option"`
- **Missing negative field** → Always include `"negative": true` or `"negative": false`

**Example Fixes:**
```json
// ❌ Wrong - Old pattern (no longer supported)
{ "type": "choice", "resources": ["gold", "food"], "value": 5 }

// ❌ Wrong - Wrong type
{ "type": "select", "resources": ["gold"] }

// ✅ Correct - Choice Buttons (for actions)
{ 
  "type": "choice-buttons", 
  "resources": ["food", "lumber", "stone", "ore"], 
  "value": 2,
  "negative": false,
  "duration": "immediate"
}

// ✅ Correct - Choice Dropdown (for events/incidents)
{ 
  "type": "choice-dropdown", 
  "resources": ["food", "lumber", "ore", "stone"], 
  "value": 1,
  "negative": false,
  "duration": "immediate"
}
```

---

## Section 4: Common Patterns Reference

### Modifier Syntax Quick Reference

**Static (Fixed Value):**
```json
{ 
  "type": "static", 
  "resource": "gold", 
  "value": -10, 
  "duration": "immediate" 
}
```

**Dice (Player Rolls):**
```json
{ 
  "type": "dice", 
  "resource": "fame", 
  "formula": "1d4", 
  "negative": false,
  "duration": "immediate"
}
```

**Choice Buttons (Player Actions):**
```json
{ 
  "type": "choice-buttons", 
  "resources": ["food", "lumber", "stone", "ore"], 
  "value": 2,
  "negative": false,
  "duration": "immediate"
}
```

**Choice Dropdown (Events/Incidents):**
```json
{ 
  "type": "choice-dropdown", 
  "resources": ["food", "lumber", "ore", "stone"], 
  "value": 1,
  "negative": false,
  "duration": "immediate"
}
```

**⚠️ BREAKING CHANGE (2025-11-08):** Old `type: "choice"` no longer supported. Use explicit types.

**Full Reference:** `docs/systems/typed-modifiers-system.md`

### Game Command Syntax Quick Reference

**Recruit Army:**
```json
{ "type": "recruitArmy", "level": "kingdom-level" }
```

**Adjust Faction Attitude:**
```json
{ "type": "adjustFactionAttitude", "steps": -1 }
```

**Claim Hexes:**
```json
{ "type": "claimHexes", "count": 3 }
```

**Reduce Imprisoned (with dice roll):**
```json
{ 
  "type": "reduceImprisoned", 
  "settlementId": "from-globalThis",
  "amount": "rolled" 
}
```

**Hex Selection Commands:**
```json
// Claim hexes
{ "type": "claimHexes", "count": 3 }

// Build roads (chaining supported)
{ "type": "buildRoads", "count": 2 }

// Fortify hex
{ "type": "fortifyHex", "hexId": "player-selected" }

// Remove border hexes (events/incidents)
{ "type": "removeBorderHexes", "count": "dice", "dice": "1d3" }
```

**Full Reference:** `docs/systems/game-commands-system.md#command-categories`

### Global State Pattern (Pre-Roll Dialogs)

**Store selection:**
```typescript
(globalThis as any).__pendingYourSelection = selectionId;
```

**Access in resolver:**
```typescript
const selectionId = (globalThis as any).__pendingYourSelection;
```

**Clean up after resolution:**
```typescript
delete (globalThis as any).__pendingYourSelection;
```

**Common Names:**
- `__pendingStipendSettlement` - Collect stipend
- `__pendingExecuteOrPardonSettlement` - Execute/pardon prisoners
- `__pendingEconomicAidFaction` - Request economic aid
- `__pendingTrainArmyArmy` - Train army
- `__pendingRecruitArmy` - Recruit unit

**Note on Hex Selection:**
Hex selection does NOT use globalThis pattern - HexSelectorService returns selected hex IDs directly as Promise result.

**Note on In-Line Selection:**
In-line selections (ChoiceModifier) are stored in check instance `resolutionState.selectedResources`, not globalThis.

---

## Section 5: Architecture at a Glance

### Data Flow

```
JSON Action Definition
    ↓
Pre-Roll Dialog (optional) - User selects context
    ↓
Skill Roll (Foundry VTT) - PF2e roll system
    ↓
Check Instance Creation - Store roll data
    ↓
Outcome Display - User interacts (dice, choices)
    ↓
ResolutionData - Final numeric values + selections
    ↓
Controller - Orchestrates application
    ↓
GameCommands + Modifiers - Applied in parallel
    ↓
State Updates - Kingdom actor persistence
    ↓
Reactive Stores - UI updates across all clients
```

### Key Components

**ActionsPhase.svelte** (~950 lines)
- Phase orchestrator
- Dialog coordination
- Event routing
- Reactive display state

**ActionExecutionHelpers.ts** (~170 lines)
- Roll orchestration
- Character selection
- DC calculation
- Roll execution

**ActionHandlers-config.ts**
- Pre-roll dialog registry
- Custom action handlers
- requiresPreDialog flags

**CheckInstanceService**
- Check state management
- Instance creation/updates
- Status tracking

**GameCommandsResolver**
- Command execution
- State validation
- Domain service delegation

**OutcomeDisplay**
- User interaction (dice, choices)
- ResolutionData builder
- Primary/cancel actions

**Full Architecture:** `docs/systems/action-resolution-complete-flow.md#architecture-components`

### File Organization

```
src/
├── actions/                           # Custom implementations
│   ├── {action-id}/
│   │   ├── YourDialog.svelte         # Pre-roll dialog (if needed)
│   │   └── YourAction.ts             # Custom resolution (if needed)
│   └── shared/
│       └── ActionHelpers.ts           # Domain validation
│
├── controllers/
│   ├── actions/
│   │   ├── ActionExecutionHelpers.ts  # Roll orchestration
│   │   ├── action-handlers-config.ts  # Dialog registry
│   │   └── implementations/
│   │       └── index.ts               # Action registry
│
├── services/
│   ├── GameCommandsService.ts         # Resource modifiers
│   ├── GameCommandsResolver.ts        # Command execution
│   └── resolution/
│       └── OutcomeApplicationService.ts
│
└── view/kingdom/turnPhases/
    ├── ActionsPhase.svelte            # Main orchestrator
    └── components/
        ├── ActionDialogManager.svelte  # Dialog management
        └── ActionCategorySection.svelte
```

---

## Section 6: Related Systems

### Typed Modifiers System

**File:** `docs/systems/typed-modifiers-system.md`

**Purpose:** Resource changes (gold, fame, unrest, food, lumber, etc.)

**When to read:**
- Creating/updating any action with resource effects
- Understanding StaticModifier, DiceModifier, ChoiceModifier
- Debugging resource application issues

**Key Concepts:**
- Type-safe discriminated unions
- Duration semantics (immediate vs ongoing)
- Message placeholders (`{resourceName}`)

### Game Commands System

**File:** `docs/systems/game-commands-system.md`

**Purpose:** Complex state changes (armies, settlements, diplomacy, territory)

**When to read:**
- Action needs to create entities (armies, settlements)
- Action needs to modify game state beyond resources
- Adding new game command type
- Understanding hex selection integration

**Key Concepts:**
- 25+ typed command interfaces
- Dual-effect architecture (modifiers + commands)
- Service-based delegation
- HexSelectorService integration

### Events & Incidents System

**File:** `docs/systems/events-and-incidents-system.md`

**Purpose:** Random challenges and unrest-triggered problems

**When to read:**
- Working on events or incidents (different trigger, same patterns)
- Understanding trait system (ongoing, dangerous, continuous)
- Event persistence (`endsEvent` semantics)

**Key Concepts:**
- Same modifier/command patterns as actions
- Event trait `"ongoing"` ≠ Modifier duration `"ongoing"`
- Unrest-based triggering for incidents

### Check Instance System

**File:** `docs/systems/check-instance-system.md`

**Purpose:** Managing check state and outcome data

**When to read:**
- Understanding how roll results are stored
- Debugging instance-related issues
- Understanding status lifecycle (pending → resolved → applied)

### Action Resolution Complete Flow

**File:** `docs/systems/action-resolution-complete-flow.md`

**Purpose:** Comprehensive implementation guide (~900 lines)

**When to read:**
- Deep dive on any implementation pattern
- Complete data flow understanding
- Troubleshooting section (Common Issues & Solutions)
- Architecture details

---

## Section 7: Best Practices

### DO:

✅ Use `"duration": "immediate"` for ALL action modifiers
✅ Use typed modifiers (StaticModifier, DiceModifier, ChoiceModifier)
✅ Store pre-roll selections in `globalThis.__pending*`
✅ Clean up global state after resolution
✅ Use ActionExecutionHelpers for roll execution (avoid duplication)
✅ Validate prerequisites before executing commands
✅ Use type guards for modifier discrimination
✅ Log all state changes for debugging

### DON'T:

❌ Don't use `"duration": "ongoing"` for action modifiers (structures only)
❌ Don't bypass ActionResolver.executeAction() for actions with gameCommands
❌ Don't duplicate roll execution logic (use ActionExecutionHelpers)
❌ Don't assume dice will auto-apply (must convert to preRolledValues)
❌ Don't skip validation (use ActionHelpers for common checks)
❌ Don't use string pattern matching (use type discrimination)
❌ Don't forget to clear global state after resolution
❌ Don't skip instance creation (needed for outcome display)

---

## Section 8: Testing Checklist

### Pre-Roll Dialog Actions

- [ ] Dialog opens when action button clicked
- [ ] Dialog shows only valid selections
- [ ] Selecting item closes dialog and proceeds to roll
- [ ] Canceling dialog clears pending state
- [ ] Skill roll executes with correct context metadata
- [ ] Selection data accessible in action resolver via globalThis
- [ ] Global state cleaned up after resolution
- [ ] Action can be performed multiple times (state resets properly)

### Game Command Actions

- [ ] Resource modifiers apply first
- [ ] Game commands execute after modifiers
- [ ] Dice values passed correctly to commands (preRolledValues)
- [ ] Commands create/modify expected entities
- [ ] Error messages display for failed prerequisites
- [ ] State syncs to all clients

### Dice Modifier Actions

- [ ] Dice roller appears in outcome display
- [ ] Roll button executes dice formula
- [ ] Result displays correctly
- [ ] Primary button disabled until dice rolled
- [ ] Rolled value applied to resource
- [ ] Rolled value accessible to game commands

### Choice Modifier Actions (In-Line Selection)

- [ ] Dropdown appears inline in outcome display
- [ ] Shows all resources from ChoiceModifier.resources array
- [ ] Selection required before enabling primary button
- [ ] Selected resource label displays correctly
- [ ] Only selected resource receives modifier value
- [ ] Choice persists if user requests reroll

### Post-Roll Selection Actions (Custom Components)

- [ ] Outcome displays correctly first
- [ ] Custom component mounts after outcome shown
- [ ] Component shows valid range/options based on outcome
- [ ] Selection required before enabling Apply button
- [ ] Selected value passed to resolution
- [ ] Custom component data accessible in controller
- [ ] Component unmounts after application

### Hex Selection Actions

- [ ] Game command triggers hex selector
- [ ] Interactive overlay appears with correct color theme
- [ ] Only valid hexes can be selected (validation working)
- [ ] Hover shows preview with appropriate color
- [ ] Invalid hexes show red overlay on hover
- [ ] Correct number of hexes required
- [ ] Cancel properly aborts action (returns null)
- [ ] Selected hexes applied to kingdom state
- [ ] Map overlay cleans up after selection

---

**Last Updated:** 2025-11-07  
**Version:** 1.1  
**Purpose:** AI assistant quick reference for action implementation, maintenance, and troubleshooting

**Changelog:**
- **v1.1 (2025-11-07)** - Added hex selection, post-roll selection, and in-line selection patterns
- **v1.0 (2025-11-07)** - Initial release with core patterns and architecture
