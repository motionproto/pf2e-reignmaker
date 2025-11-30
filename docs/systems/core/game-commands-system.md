# Game Commands System

**Purpose:** Structured gameplay mechanics for non-resource effects from player actions, events, and incidents

---

## Overview

The Game Commands System provides type-safe handling of gameplay mechanics that go beyond resource changes. While the Typed Modifiers System handles resource modifications (gold, unrest, fame), Game Commands handle territorial expansion, construction, military operations, and diplomatic actions.

**Key Principle:** Dual-effect architecture separates resource changes from gameplay mechanics for clarity and maintainability.

---

## Dual-Effect Architecture

All action outcomes use two parallel systems:

```typescript
interface ActionEffect {
  description: string;
  modifiers?: EventModifier[];      // Resource changes
  gameCommands?: GameCommand[];     // Gameplay mechanics
}
```

**Why Separate?**
- **Modifiers** = Immediate numeric changes (gold -10, fame +2)
- **GameCommands** = Complex state changes (recruit army, claim hexes, build settlement)

This separation allows each system to evolve independently while maintaining clear boundaries.

---

## Command Categories

The system provides 25+ typed command interfaces organized by function:

### Territory & Expansion
- `claimHexes` - Expand kingdom borders
- `buildRoads` - Construct roads in hexes
- `fortifyHex` - Add defensive fortifications

### Settlement & Construction
- `foundSettlement` - Create new village/town/city
- `upgradeSettlement` - Increase settlement tier
- `buildStructure` - Construct buildings
- `repairStructure` - Fix damaged structures
- `createWorksite` - Build resource extraction sites

### Military Operations
- `recruitArmy` - Create new army unit
- `trainArmy` - Improve army capabilities
- `deployArmy` - Move army to hex
- `outfitArmy` - Equip army with gear
- `recoverArmy` - Restore damaged army
- `disbandArmy` - Remove army unit

### Diplomatic Actions
- `establishDiplomaticRelations` - Open relations with nation
- `adjustFactionAttitude` - Improve or worsen diplomatic relations
- `requestEconomicAid` - Request resources from ally
- `requestMilitaryAid` - Request troops from ally
- `infiltration` - Covert operations
- `sendScouts` - Reconnaissance missions

### Event & Unrest Management
- `resolveEvent` - Apply bonus to event resolution
- `hireAdventurers` - Outsource event handling
- `arrestDissidents` - Convert unrest to imprisoned
- `executePrisoners` - Remove imprisoned unrest (harsh)
- `pardonPrisoners` - Remove imprisoned unrest (merciful)

### Support & Bonuses
- `aidBonus` - Grant circumstance bonus to ally
- `grantReroll` - Allow check reroll

**Reference:** See `src/controllers/actions/game-commands.ts` for complete type definitions.

---

## Resource Modification Patterns

### When to Use Each Method

The pipeline now uses an **execute-first pattern** where most resource modifications happen automatically. Understanding when to use each method is important:

| Method | Use Case | Features | When to Use |
|--------|----------|----------|-------------|
| **Automatic (JSON)** | Simple static/dice modifiers | Zero code, shortfall detection | Default - use whenever possible |
| `applyNumericModifiers()` | Dynamic costs | Shortfall detection, simple API | Costs calculated in execute |
| `applyOutcome()` | Rich logging | Full metadata, source tracking | Need detailed notifications |
| `applyActionCost()` | Upfront costs | Applied before roll | Costs paid regardless of outcome |

### Pattern 1: Automatic Application (Preferred)

JSON modifiers are applied automatically by the execute-first pattern. **No code needed!**

```json
// data/player-actions/my-action.json
{
  "outcomes": {
    "success": {
      "modifiers": [
        { "type": "static", "resource": "gold", "value": -10 },
        { "type": "dice", "resource": "unrest", "formula": "1d4" }
      ]
    }
  }
}
```

The pipeline automatically:
1. Converts modifiers to outcome badges
2. Lets user roll dice
3. Applies final values via GameCommandsService
4. Detects shortfalls and adds unrest

**Your execute function doesn't need to do anything!**

### Pattern 2: Dynamic Costs in Custom Execute

For costs calculated based on user selections or game state:

```typescript
execute: async (ctx) => {
  // JSON modifiers already applied by execute-first pattern
  
  // Calculate dynamic cost based on user selection
  const cost = calculateCost(ctx.metadata.selection);
  
  // Apply additional costs
  const gameCommandsService = await createGameCommandsService();
  await gameCommandsService.applyNumericModifiers([
    { resource: 'gold', value: -cost }
  ], ctx.outcome);
  
  // Custom logic
  await doCustomThing(ctx);
  return { success: true };
}
```

**Key Points:**
- Simple API - just array of `{ resource, value }`
- Full shortfall detection (+1 unrest per shortfall)
- Automatic floating notifications

### Pattern 3: Rich Tracking with applyOutcome

When you want detailed source tracking in logs and notifications:

```typescript
execute: async (ctx) => {
  const structure = getStructure(ctx.metadata.structureId);
  const cost = getRepairCost(structure);
  
  const gameCommandsService = await createGameCommandsService();
  await gameCommandsService.applyOutcome({
    type: 'action',
    sourceId: 'repair-structure',
    sourceName: `Repair ${structure.name}`,  // Shows in notifications
    outcome: ctx.outcome,
    modifiers: costModifiers
  });
  
  // Notification will say: "Repair Tavern cost: -3 gold, -2 lumber"
}
```

**Key Points:**
- Rich source tracking (shows action name in logs)
- Same shortfall detection as `applyNumericModifiers()`
- Better UX for complex actions

### Pattern 4: Upfront Costs (Before Roll)

For costs paid regardless of outcome (like scouting):

```typescript
// In pipeline definition
export const myPipeline = createActionPipeline('my-action', {
  cost: {
    gold: 1,
    lumber: 2
  },
  
  execute: async (ctx) => {
    // Deduct costs first (regardless of outcome)
    await applyActionCost(myPipeline);
    
    // Then handle outcome-specific logic
    if (ctx.outcome === 'success') {
      await doSuccessLogic(ctx);
    }
  }
});
```

**Examples:** `sendScouts` (1 gold), `buildRoads` (1 lumber + 1 stone)

---

## Service Architecture

### GameCommandsService

**Location:** `src/services/GameCommandsService.ts`

**Responsibilities:**
- Apply resource modifiers from outcomes
- Handle special resources (imprisoned_unrest, structure damage)
- Track action log for turn history
- Detect resource shortfalls and apply penalties

**Key Methods:**
- `applyNumericModifiers()` - Apply final numeric values
- `applyOutcome()` - Apply complete outcome (modifiers + special effects)
- `trackPlayerAction()` - Log action for turn summary
- `allocateImprisonedUnrest()` - Distribute imprisoned unrest to settlements

### GameCommandsResolver

**Location:** `src/services/GameCommandsResolver.ts`

**Responsibilities:**
- Route game commands to appropriate handlers
- Execute complex state changes (recruit army, found settlement)
- Validate prerequisites and requirements
- Delegate to specialized services (ArmyService, SettlementService)

**Key Methods:**
- `recruitArmy()` - Create army unit with NPC actor
- `disbandArmy()` - Remove army and refund resources
- `foundSettlement()` - Create new settlement entity

**Pattern:** GameCommandsResolver delegates to domain-specific services rather than implementing logic directly.

### ActionEffectsService (Legacy)

**Location:** `src/services/ActionEffectsService.ts`

**Status:** Legacy service for complex actions

**Note:** Being gradually replaced by GameCommandsResolver. Handles hex claiming, worksite creation, and other map-based operations.

---

## Data Flow

### Overview

All checks (events, incidents, actions) execute through **PipelineCoordinator**, which coordinates modifier and game command application at Step 8 (Execute Action).

**See:** `docs/systems/core/pipeline-coordinator.md` for complete pipeline architecture.

### 1. Action Defined (JSON)

```json
{
  "effects": {
    "success": {
      "description": "Recruit a troop equal to the party level",
      "modifiers": [],
      "gameCommands": [
        {
          "type": "recruitArmy",
          "level": "kingdom-level"
        }
      ]
    }
  }
}
```

### 2. Player Performs Action

```
User selects action → PipelineCoordinator.executePipeline()
  → Step 1: Requirements Check
    → Step 2: Pre-Roll Interactions (optional)
      → Step 3: Execute Roll
        → Skill check rolled via Foundry VTT
          → Outcome determined (critSuccess/success/failure/critFailure)
```

### 3. User Interaction

```
Step 4: Display Outcome (create OutcomePreview)
  → Step 5: Outcome Interactions
    → OutcomeDisplay resolves user interactions (dice, choices)
      → Step 6: Wait For Apply (user clicks button)
```

### 4. Resolution Applied

```
Step 7: Post-Apply Interactions (optional)
  → Step 8: Execute Action (EXECUTE-FIRST PATTERN)
    → 8a: applyDefaultModifiers() [AUTOMATIC]
      ├── Fame +1 (critical success)
      ├── Pre-rolled dice modifiers from resolutionData
      └── Static JSON modifiers
    → 8b: pipeline.execute() [CUSTOM - if defined]
      └── Can call applyNumericModifiers() for dynamic costs
    → 8c: GameCommandsResolver for each gameCommand
      → State changes applied to kingdom
        → Step 9: Cleanup
```

### 5. State Synchronized

```
KingdomActor updated
  → Foundry VTT persistence
    → All clients receive updates
      → Reactive stores update UI
```

---

## Command Structure Examples

### Simple Command

```typescript
interface RecruitArmyCommand {
  type: 'recruitArmy';
  level: number | 'kingdom-level';
}
```

**Usage:** Direct army creation at specified level.

### Proficiency-Scaled Command

```typescript
interface ClaimHexesCommand {
  type: 'claimHexes';
  count: number | 'proficiency-scaled';
  scaling?: ProficiencyScaling;
  bonus?: number;
}

interface ProficiencyScaling {
  trained: number;
  expert: number;
  master: number;
  legendary: number;
}
```

**Usage:** Number of hexes depends on skill proficiency level.

### Conditional Command

```typescript
interface GrantRerollCommand {
  type: 'grantReroll';
  condition: 'on-failure' | 'always';
}
```

**Usage:** Reroll only applies under specific circumstances.

---

## Hex Selection Integration

Many game commands require player input for selecting hexes on the kingdom map (claiming territory, removing border hexes, building roads, etc.). The **HexSelectorService** provides a unified, Promise-based interface for these interactions.

### Overview

**Purpose:** Interactive hex selection with validation, visual feedback, and automatic overlay management.

**Key Features:**
- Promise-based async API
- Type-specific color themes (claim = green, unclaim = red, road = teal, etc.)
- Validation functions for game rule enforcement
- Automatic scene switching and overlay management
- Hover previews and selection tracking

### HexSelectorService API

**Location:** `src/services/hex-selector/index.ts`

**Configuration:**
```typescript
interface HexSelectionConfig {
  title: string;                          // Panel title
  count: number;                          // Number of hexes to select
  colorType: HexSelectionType;            // Visual theme
  validationFn?: (hexId: string, pendingHexes?: string[]) => boolean;  // Optional validation
  allowToggle?: boolean;                  // Allow deselecting (default: true)
}

type HexSelectionType = 'claim' | 'unclaim' | 'road' | 'settlement' | 'fortify' | 'scout';
```

**Usage:**
```typescript
const selectedHexes = await hexSelectorService.selectHexes({
  title: 'Remove Border Hexes',
  count: 3,
  colorType: 'unclaim',
  validationFn: (hexId) => borderHexes.includes(hexId)
});

if (selectedHexes) {
  // User confirmed selection
  // selectedHexes = ['15.20', '16.21', '14.19']
} else {
  // User cancelled
}
```

**Return Value:**
- `string[] | null` - Array of hex IDs (e.g., `['15.20', '16.21']`) or `null` if cancelled

### Implementation Pattern

#### Step 1: Define Command Interface

Add type definition to `src/controllers/actions/game-commands.ts`:

```typescript
export interface RemoveBorderHexesCommand {
  type: 'removeBorderHexes';
  count: number | 'dice';
  dice?: string;  // e.g., '1d3' (required if count is 'dice')
}
```

#### Step 2: Implement in GameCommandsResolver

Add method to `src/services/GameCommandsResolver.ts`:

```typescript
async removeBorderHexes(count: number | 'dice', dice?: string): Promise<ResolveResult> {
  logger.info(`🏴 [removeBorderHexes] Removing border hexes: count=${count}, dice=${dice}`);
  
  try {
    const kingdom = getKingdomData();
    
    // 1. Handle dice rolling if needed
    let hexCount: number;
    if (count === 'dice') {
      const roll = new Roll(dice!);
      await roll.evaluate();
      hexCount = roll.total || 1;
      
      await roll.toMessage({
        flavor: 'Border Hexes Lost',
        speaker: { alias: 'Kingdom' }
      });
    } else {
      hexCount = count;
    }
    
    // 2. Calculate valid border hexes
    const borderHexes = await this.getBorderHexes(kingdom);
    if (borderHexes.length === 0) {
      return { success: false, error: 'No border hexes available' };
    }
    
    // 3. Open hex selector
    const { hexSelectorService } = await import('../services/hex-selector');
    const selectedHexes = await hexSelectorService.selectHexes({
      title: `Remove ${hexCount} Border Hex${hexCount !== 1 ? 'es' : ''}`,
      count: hexCount,
      colorType: 'unclaim',
      validationFn: (hexId) => borderHexes.includes(hexId)
    });
    
    if (!selectedHexes) {
      return { success: false, error: 'Hex selection cancelled' };
    }
    
    // 4. Apply changes
    await updateKingdom(k => {
      selectedHexes.forEach(hexId => {
        const hex = k.hexes.find(h => h.id === hexId);
        if (hex) hex.claimedBy = null;
      });
    });
    
    return {
      success: true,
      data: {
        removedHexes: selectedHexes,
        count: selectedHexes.length,
        message: `Removed ${selectedHexes.length} border hexes`
      }
    };
  } catch (error) {
    logger.error('❌ [removeBorderHexes] Failed:', error);
    return { success: false, error: error.message };
  }
}

// Helper: Calculate border hexes
async getBorderHexes(kingdom: any): Promise<string[]> {
  const { getAdjacentHexIds } = await import('../actions/shared/hexValidation');
  const { PLAYER_KINGDOM } = await import('../types/ownership');
  
  const claimedHexes = kingdom.hexes.filter(h => h.claimedBy === PLAYER_KINGDOM);
  
  return claimedHexes.filter(hex => {
    const adjacentHexIds = getAdjacentHexIds(hex.id);
    return adjacentHexIds.some(adjId => {
      const adjHex = kingdom.hexes.find(h => h.id === adjId);
      return !adjHex || adjHex.claimedBy === null;
    });
  }).map(h => h.id);
}
```

#### Step 3: Add Routing in GameCommandHelpers

Update `src/controllers/shared/GameCommandHelpers.ts`:

```typescript
export async function executeGameCommands(
  gameCommands: GameCommand[]
): Promise<void> {
  const resolver = await createGameCommandsResolver();
  
  for (const command of gameCommands) {
    switch (command.type) {
      case 'removeBorderHexes':
        await resolver.removeBorderHexes(command.count, command.dice);
        break;
      // ... other commands
    }
  }
}
```

#### Step 4: Use in JSON Data

Add to incident/event outcome in `data/incidents/major/border-raid.json`:

```json
{
  "effects": {
    "criticalFailure": {
      "msg": "Raiders devastate border regions, causing massive losses",
      "modifiers": [
        { "type": "static", "resource": "gold", "value": -50 }
      ],
      "gameCommands": [
        {
          "type": "removeBorderHexes",
          "count": "dice",
          "dice": "1d3"
        }
      ]
    }
  }
}
```

### Common Validation Patterns

#### Border Hexes Only
```typescript
validationFn: (hexId) => {
  const borderHexes = getBorderHexes(kingdom);
  return borderHexes.includes(hexId);
}
```

#### Adjacent to Claimed Territory
```typescript
validationFn: (hexId) => {
  const adjacentHexIds = getAdjacentHexIds(hexId);
  return adjacentHexIds.some(adjId => {
    const adjHex = kingdom.hexes.find(h => h.id === adjId);
    return adjHex?.claimedBy === PLAYER_KINGDOM;
  });
}
```

#### Road Connectivity (with Chaining)
```typescript
validationFn: (hexId, pendingHexes = []) => {
  const kingdom = getKingdomData();
  // Check adjacency to existing roads OR pending selections
  return getAdjacentRoadsAndSettlements(hexId, kingdom, pendingHexes).length > 0;
}
```

#### Settlement Placement
```typescript
validationFn: (hexId) => {
  const hex = kingdom.hexes.find(h => h.id === hexId);
  // Must be claimed and not already have settlement
  return hex?.claimedBy === PLAYER_KINGDOM &&
         !kingdom.settlements.some(s => s.location.x === hex.x && s.location.y === hex.y);
}
```

### Color Types

**Available Types:**
- `claim` - Green theme for expanding territory
- `unclaim` - Red theme for losing territory
- `road` - Teal theme with connection line previews
- `settlement` - Blue theme for founding settlements
- `fortify` - Orange theme for defensive structures
- `scout` - Yellow theme for exploration

**Visual Behavior:**
- Hover shows preview with type-specific color (lighter shade)
- Selected hexes render with solid color
- Invalid hexes show red overlay on hover
- Road type renders connection lines instead of fills

### Best Practices

#### ✅ DO:
- **Provide validation functions** for clear UX feedback (red = invalid)
- **Use appropriate colorType** to match intent (unclaim = red for loss)
- **Handle dice rolling BEFORE hex selection** (show total in title)
- **Check for null return** (user may cancel at any time)
- **Use ES6 imports** for hex utilities (no `require()`)
- **Log all hex operations** with emoji indicators for debugging

#### ❌ DON'T:
- Don't skip validation - users need visual feedback
- Don't assume selection will complete (handle cancellation)
- Don't roll dice inside hex selector (do it before)
- Don't use CommonJS `require()` (browser environment)
- Don't duplicate validation logic (reuse helpers)

### Debugging Tips

**Console Logging Pattern:**
```typescript
logger.info(`🏴 [removeBorderHexes] Removing border hexes: count=${count}, dice=${dice}`);
logger.info(`🎲 [removeBorderHexes] Rolled ${dice} = ${hexCount}`);
logger.info(`🏴 [removeBorderHexes] Found ${borderHexes.length} border hexes:`, borderHexes);
logger.info(`✅ [removeBorderHexes] Removed ${selectedHexes.length} border hexes`);
```

**Common Issues:**
- **gameCommands not loading** → Check `incident-loader.ts` preserves field
- **"require is not defined"** → Use ES6 `import` with `await`
- **Validation not working** → Log validation function inputs
- **Hover not showing** → Check colorType is valid string

---

## Integration Points

### With Player Actions

Player actions in `data/player-actions/*.json` use both modifiers and gameCommands:

**Resource-only action:**
```json
{
  "modifiers": [
    { "type": "static", "resource": "gold", "value": -50 }
  ],
  "gameCommands": []
}
```

**Gameplay-only action:**
```json
{
  "modifiers": [],
  "gameCommands": [
    { "type": "recruitArmy", "level": "kingdom-level" }
  ]
}
```

**Mixed action:**
```json
{
  "modifiers": [
    { "type": "static", "resource": "unrest", "value": -1 }
  ],
  "gameCommands": [
    { "type": "recruitArmy", "level": "kingdom-level" }
  ]
}
```

### With Check Instance System

OutcomePreviews store both modifier and gameCommand data:

```typescript
appliedOutcome: {
  modifiers: EventModifier[];
  gameCommands: GameCommand[];
  // ... other fields
}
```

### With Phase Controllers

Phase controllers coordinate command execution:

```typescript
// ActionPhaseController pattern
async resolveAction(action, outcome) {
  // 1. Apply resource modifiers
  await gameCommandsService.applyNumericModifiers(modifiers, outcome);
  
  // 2. Execute game commands
  for (const command of gameCommands) {
    await gameCommandsResolver.executeCommand(command);
  }
  
  // 3. Mark phase step complete
  await completePhaseStepByIndex(stepIndex);
}
```

---

## Type Safety

All commands use TypeScript discriminated unions:

```typescript
type GameCommand = 
  | ClaimHexesCommand
  | RecruitArmyCommand
  | FoundSettlementCommand
  | ... // 25+ command types
```

**Benefits:**
- Compile-time validation of command structure
- IDE autocomplete for command properties
- Exhaustive switch case checking
- Self-documenting command requirements

---

## Best Practices

### Command Design

- ✅ Use specific command types, not generic "doAction"
- ✅ Include validation data in command structure
- ✅ Prefer typed discriminants over string matching
- ✅ Keep commands focused on single operations

### Service Implementation

- ✅ Validate prerequisites before executing
- ✅ Return clear success/failure results
- ✅ Log all state changes for debugging
- ✅ Delegate to domain services (ArmyService, SettlementService)

### Data Authoring

- ✅ Use gameCommands for state changes, modifiers for resources
- ✅ Provide clear descriptions for user feedback
- ✅ Match command parameters to game rules
- ✅ Test all outcome combinations

---

## Faction Attitude Adjustment

**Command:** `adjustFactionAttitude`  
**Location:** `src/services/GameCommandsResolver.ts` → `adjustFactionAttitude()`  
**Status:** ✅ Fully Implemented (2025-11-07)

### Overview

Automates faction relationship changes from events and actions (e.g., `diplomatic-overture` event). Players select which faction to affect, and the system adjusts attitude by specified steps with optional constraints.

### Command Structure

```typescript
interface AdjustFactionAttitudeCommand {
  type: 'adjustFactionAttitude';
  steps: number;              // +1 = improve, -1 = worsen, +2 = improve twice, etc.
  maxLevel?: string;          // Optional cap (e.g., "Friendly")
  minLevel?: string;          // Optional floor (e.g., "Unfriendly")
  factionId?: string;         // Optional pre-selected faction (if null, player selects)
}
```

### Features

- ✅ **Player Selection**: Foundry Dialog with dropdown (filtered by eligibility)
- ✅ **Validation**: Only shows factions that can be adjusted based on current attitude
- ✅ **Diplomatic Structures**: Auto-removes "Friendly" cap if kingdom has diplomatic capacity > 1
- ✅ **Constraints**: Respects `maxLevel` and `minLevel` parameters
- ✅ **Direction-Aware**: Positive steps improve, negative steps worsen
- ✅ **Chat Integration**: Displays attitude changes in chat

### Attitude Progression

```
Hostile → Unfriendly → Indifferent → Friendly → Helpful
```

**Constraints:**
- **Without diplomatic structures** (capacity = 1): Limited to Friendly
- **With diplomatic structures** (capacity > 1): Can reach Helpful
- **maxLevel parameter**: Enforces custom caps (e.g., success outcome caps at Friendly)
- **minLevel parameter**: Enforces custom floors

### JSON Examples

**Critical Success (no cap):**
```json
{
  "gameCommands": [
    {
      "type": "adjustFactionAttitude",
      "steps": 1
    }
  ]
}
```

**Success (Friendly cap without structures):**
```json
{
  "gameCommands": [
    {
      "type": "adjustFactionAttitude",
      "steps": 1,
      "maxLevel": "Friendly"
    }
  ]
}
```

**Critical Failure (worsen relations):**
```json
{
  "gameCommands": [
    {
      "type": "adjustFactionAttitude",
      "steps": -1
    }
  ]
}
```

### Implementation Details

**Utilities:** `src/utils/faction-attitude-adjuster.ts`
- `adjustAttitudeBySteps()` - Pure calculation function
- `hasDiplomaticStructures()` - Checks diplomatic capacity
- `canAdjustAttitude()` - Validation helper
- `getAdjustmentBlockReason()` - Error message generator

**Service Layer:** `src/services/factions/index.ts`
- `FactionService.adjustAttitude()` - High-level service method
- Returns: `{ success, oldAttitude, newAttitude, reason }`

**Resolver:** `src/services/GameCommandsResolver.ts`
- `adjustFactionAttitude()` - Full game command implementation
- Handles faction selection, validation, and constraint application

**Routing:** `src/controllers/shared/GameCommandHelpers.ts`
- Routes command to resolver
- Converts result to specialEffects format

### Usage Pattern

1. **Event/Action triggers** with adjustFactionAttitude command
2. **EventPhaseController** executes gameCommands array
3. **GameCommandHelpers** routes to GameCommandsResolver
4. **Faction Selection Dialog** appears (filtered by eligibility)
5. **FactionService** adjusts attitude with constraints
6. **Chat Message** displays: "Relations with [Faction] improved: Unfriendly → Indifferent"
7. **KingdomStore** updates reactively

---

## Custom Resolution Components

**Purpose:** Provide action-specific UI for player choices and complex interactions that require more than simple modifiers.

### Overview

Actions can inject custom Svelte components into `OutcomeDisplay` to handle complex player interactions like resource selection, settlement targeting, or multi-step configurations. These components render inline as part of the outcome resolution flow, maintaining consistent UX across all actions.

**Key Benefits:**
- ✅ **Consistent UX** - Matches existing UI patterns (no popup dialogs)
- ✅ **Reactive** - State syncs across all clients via instance storage
- ✅ **Type-Safe** - Full TypeScript support with props validation
- ✅ **Outcome-Aware** - Component props can vary by outcome (crit success vs success)
- ✅ **Reusable** - Same component can be used by multiple actions

### Architecture

```
ActionCategorySection
  ↓ getCustomResolutionComponent(actionId, outcome) → { component, props }
BaseCheckCard
  ↓ Pass component + props
OutcomeDisplay
  ↓ Render with <svelte:component this={component} {...props} />
Custom Component
  ↓ User makes selection
  ↓ updateInstanceResolutionState(customComponentData)
  ↓ dispatch('selection', { modifiers })
OutcomeDisplay
  ↓ Store in choiceResult for display
  ↓ Include in ResolutionData.customComponentData
ActionPhaseController
  ↓ Pass to executeCustomResolution()
Action Implementation
  ↓ Validate and execute based on selection
```

### Implementation Pattern

#### Step 1: Create Svelte Component

**File:** `src/view/kingdom/components/OutcomeDisplay/components/YourComponent.svelte`

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { updateInstanceResolutionState, getInstanceResolutionState } from '../../../../../controllers/shared/ResolutionStateHelpers';
  import type { OutcomePreview } from '../../../../../models/OutcomePreview';

  // Props (passed from action implementation)
  export let instance: OutcomePreview | null = null;
  export let outcome: string;
  export let yourCustomProp: string[] = [];  // Example: resource types
  export let amount: number = 1;  // Example: amount to gain

  const dispatch = createEventDispatcher();

  // Get resolution state from instance (syncs across clients)
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedValue = resolutionState.customComponentData?.selectedValue || '';

  // Check if resolved
  $: isResolved = !!selectedValue;

  async function handleSelection(value: string) {
    if (!instance) return;

    // Store selection in instance (syncs to all clients)
    await updateInstanceResolutionState(instance.previewId, {
      customComponentData: { 
        selectedValue: value,
        additionalData: 'any metadata you need'
      }
    });

    // Emit modifiers for OutcomeDisplay to process
    dispatch('selection', { 
      selectedValue: value,
      modifiers: [{
        type: 'static',
        resource: value,
        value: amount,
        duration: 'immediate'
      }]
    });
  }
</script>

<div class="your-component">
  <h4>Choose Your Selection</h4>
  {#each yourCustomProp as option}
    <button 
      class:selected={selectedValue === option}
      on:click={() => handleSelection(option)}
      disabled={selectedValue && selectedValue !== option}
    >
      {option}
    </button>
  {/each}
</div>
```

**Key Requirements:**
- Accept `instance` and `outcome` props (always provided)
- Use `getInstanceResolutionState()` to read shared state
- Use `updateInstanceResolutionState()` to write shared state
- Emit `selection` event with modifiers array
- Store metadata in `customComponentData` for execute() method

#### Step 2: Configure Action Implementation

**File:** `src/actions/your-action/YourAction.ts`

```typescript
import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import YourComponent from '../../view/kingdom/components/OutcomeDisplay/components/YourComponent.svelte';

export const YourAction: CustomActionImplementation = {
  id: 'your-action',
  
  customResolution: {
    // ✅ Provide the Svelte component
    component: YourComponent,
    
    // ✅ NEW: Return outcome-specific props
    getComponentProps(outcome: string): Record<string, any> {
      // Example: Critical success gives more options
      if (outcome === 'criticalSuccess') {
        return {
          yourCustomProp: ['option1', 'option2', 'option3', 'option4'],
          amount: 2
        };
      }
      
      // Success gives fewer options
      return {
        yourCustomProp: ['option1', 'option2'],
        amount: 1
      };
    },
    
    validateData(resolutionData) {
      // Ensure selection was made
      return !!(resolutionData.customComponentData?.selectedValue);
    },
    
    async execute(resolutionData, instance?) {
      const { selectedValue, additionalData } = resolutionData.customComponentData || {};
      
      if (!selectedValue) {
        return { success: false, error: 'No selection made' };
      }
      
      // Resource changes are handled by OutcomeDisplay via modifiers
      // This execute() is just for validation and success message
      
      return {
        success: true,
        data: {
          message: `Selected: ${selectedValue}`
        }
      };
    }
  },
  
  needsCustomResolution(outcome) {
    // Only need custom resolution for successful outcomes
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};
```

#### Step 3: Register Action

**File:** `src/controllers/actions/implementations/index.ts`

```typescript
import YourAction from '../../../actions/your-action/YourAction';

// Add to registry
actionImplementations.set(YourAction.id, YourAction);

// Add to exports
export { YourAction };
```

### Real-World Example: Harvest Resources

**Component:** `ResourceChoiceSelector.svelte`

```svelte
<script lang="ts">
  export let resources: string[] = [];  // ['food', 'lumber', 'stone', 'ore']
  export let amount: number = 1;
  
  // ... selection logic with grid display
</script>
```

**Action:** `HarvestResourcesAction.ts`

```typescript
customResolution: {
  component: ResourceChoiceSelector,
  
  getComponentProps(outcome: string) {
    const amount = outcome === 'criticalSuccess' ? 2 : 1;
    return {
      resources: ['food', 'lumber', 'stone', 'ore'],
      amount: amount
    };
  },
  
  validateData(resolutionData) {
    return !!(resolutionData.customComponentData?.selectedResource);
  }
}
```

**JSON:** `data/player-actions/harvest-resources.json`

```json
{
  "effects": {
    "criticalSuccess": {
      "description": "Exceptional harvest! Choose a resource to gain.",
      "modifiers": [],
      "gameCommands": []
    },
    "success": {
      "description": "Good harvest! Choose a resource to gain.",
      "modifiers": [],
      "gameCommands": []
    }
  }
}
```

**Flow:**
1. Player rolls success → gets `ResourceChoiceSelector` with `amount: 1`
2. Component renders grid of 4 resources
3. Player selects "lumber"
4. Component stores in `customComponentData.selectedResource`
5. Component emits modifiers: `[{ type: 'static', resource: 'lumber', value: 1 }]`
6. OutcomeDisplay shows "+1 Lumber" in state changes
7. Player clicks "Apply Result"
8. Action's `execute()` validates selection and returns success

### When to Use Custom Components

**✅ USE Custom Components When:**
- Player must choose from multiple options (resources, settlements, factions)
- Complex multi-step configuration (army deployment paths, build queue)
- Visual selection (hex picking already uses HexSelectorService)
- Outcome-dependent options (crit success unlocks more choices)

**❌ DON'T Use Custom Components When:**
- Simple numeric modifiers (use static/dice modifiers)
- Binary choices (use `ChoiceModifier` with 2 options)
- Automatic effects (use `gameCommands` or modifiers)
- External UI (use HexSelectorService for hex selection)

### Component Design Guidelines

**DO:**
- Store ALL state in `customComponentData` (syncs to all clients)
- Emit modifiers in standard format (for OutcomeDisplay)
- Disable already-selected options (prevent confusion)
- Show confirmation when selection is complete
- Use consistent styling (match CollectStipendResolution, etc.)

**DON'T:**
- Use local component state for selections (won't sync)
- Call `updateKingdom()` directly (use modifiers instead)
- Create popup dialogs (defeats the inline UX benefit)
- Duplicate business logic (keep it in execute() method)

### Existing Component Examples

**Reference these for patterns:**
- `ResourceChoiceSelector.svelte` - Grid selection with icons
- `CollectStipendResolution.svelte` - Dropdown with formatted options
- `ArrestDissidentsResolution.svelte` - Multi-target allocation with sliders
- `ExecuteOrPardonPrisonersResolution.svelte` - Settlement selection with validation

---

## Manual Effects

Some gameplay mechanics cannot be automated and require manual intervention:

```json
{
  "manualEffects": [
    "Mark your largest settlement as 'Quarantined'",
    "Remove 1d3 hexes of farmland from kingdom map"
  ]
}
```

**When to use manualEffects:**
- Map modifications requiring visual updates
- NPC relationship changes
- Story/narrative consequences
- Rule exceptions or special cases

**Display:** Manual effects appear in warning-styled boxes in OutcomeDisplay.

---

---

## Prepare/Commit Pattern

**Status:** Active (2025-11-21)  
**Purpose:** Enable preview of game command effects before execution

### Overview

The Prepare/Commit pattern allows game commands to display outcome badges (like "Collected 50 gp" or "Recruited Iron Guard") in the preview BEFORE the user clicks "Apply Result". This ensures users see exactly what will happen before committing to state changes.

### PreparedCommand Interface

```typescript
// src/types/game-commands.ts
interface PreparedCommand {
  outcomeBadge: UnifiedOutcomeBadge;  // Preview badge for OutcomeDisplay
  commit: () => Promise<void>;         // Execute on "Apply Result"
}

// UnifiedOutcomeBadge from src/types/OutcomeBadge.ts
interface UnifiedOutcomeBadge {
  icon: string;           // FontAwesome class (e.g., 'fa-coins')
  prefix?: string;        // Text before value (e.g., 'Collected')
  value: BadgeValue;      // Static number or dice formula
  suffix?: string;        // Text after value (e.g., 'gp from Castle')
  variant?: 'positive' | 'negative' | 'neutral';
}
```

**Note:** The legacy `specialEffect` property is deprecated. Use `outcomeBadge` for all new code.

**Key Benefits:**
- ✅ Preview accuracy - What you see is what you get
- ✅ Clean cancellation - Just discard commit, no rollback needed
- ✅ Single code path - No duplicate preview/execution logic

### When to Use

**✅ Use Prepare/Commit For:**
- Pre-roll dialogs (data available before roll): `collect-stipend`, `recruit-unit`, `train-army`
- Simple entity operations: `establish-settlement`, `found-settlement`, `disband-army`
- Resource transfers to characters: `giveActorGold`

**❌ Don't Use For:**
- Post-roll user selection (use custom implementation)
- Complex calculations (use custom implementation)
- Actions needing custom UI components
- Simple resource adjustments (use modifiers directly)

### Implementation

**Step 1: Update GameCommandsResolver Method**

```typescript
/**
 * Your Command - Brief description
 * Uses prepare/commit pattern with UnifiedOutcomeBadge
 */
async yourCommand(param1: string): Promise<PreparedCommand> {
  logger.info(`🎯 [yourCommand] PREPARING with ${param1}`);
  
  // PHASE 1: PREPARE - Validate & calculate (NO state changes!)
  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  const capturedValue = calculateData(kingdom, param1);
  
  logger.info(`🎯 [yourCommand] PREPARED: Will apply ${capturedValue}`);

  // PHASE 2: RETURN - Preview badge + commit closure
  return {
    outcomeBadge: {
      icon: 'fa-icon',
      prefix: 'Action completed:',
      value: { type: 'static', amount: capturedValue },
      suffix: 'units',
      variant: 'positive'
    },
    commit: async () => {
      logger.info(`🎯 [yourCommand] COMMITTING: Applying changes`);
      
      await updateKingdom(kingdom => {
        kingdom.someData = capturedValue;
      });
      
      logger.info(`✅ [yourCommand] Successfully applied changes`);
    }
  };
}
```

**Step 2: Add Case to OutcomePreviewHelpers.ts**

```typescript
case 'yourCommand': {
  const param1 = getParam1FromOutcome(outcomeData);
  result = await resolver.yourCommand(param1);
  break;
}
```

**Step 3: Skip in action-resolver.ts**

```typescript
case 'yourCommand':
  console.log('⏭️ [action-resolver] Skipping - handled by prepare/commit pattern');
  return { success: true };
```

### Completed Implementations

**✅ giveActorGold** - Collect Stipend (gold to character inventory)  
**✅ recruitArmy** - Recruit Unit (create army actor)  
**✅ foundSettlement** - Establish Settlement (create settlement)  
**✅ disbandArmy** - Disband Army (remove army with refund)  
**✅ trainArmy** - Train Army (level-up with outcome effects)

### Best Practices

**✅ DO:**
- Validate everything in PREPARE phase
- Capture all values in closures
- Use descriptive messages with names
- Log at each phase with emoji prefixes
- Clean up globalThis in commit phase

**❌ DON'T:**
- Modify state in PREPARE phase
- Assume data exists in COMMIT (capture in closure)
- Serialize commits to actor flags (use CommitStorage)
- Duplicate preview logic

---

## Summary

The Game Commands System provides:

- ✅ Structured gameplay mechanics beyond resource changes
- ✅ Type-safe command definitions (25+ types)
- ✅ Clear separation from resource modifiers
- ✅ Service-based architecture with delegation
- ✅ Full integration with PipelineCoordinator (Step 8: Execute Action)
- ✅ Compile-time validation and IDE support
- ✅ Prepare/Commit pattern for preview-before-execute

**Integration with PipelineCoordinator:**
- Game commands execute at Step 8 (Execute Action)
- Applied after user clicks "Apply Result" (Step 6 complete)
- Can use post-apply interactions (Step 7) for user input
- All effects are part of the unified pipeline flow

This architecture enables complex kingdom operations while maintaining code clarity and type safety.

---

**Related Documents:**
- `docs/systems/core/pipeline-coordinator.md` - Complete pipeline architecture
- `docs/systems/core/check-type-differences.md` - Events vs Incidents vs Actions
