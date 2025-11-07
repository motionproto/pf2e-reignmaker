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
User selects action → BaseCheckCard UI
  → Skill check rolled via Foundry VTT
    → Outcome determined (critSuccess/success/failure/critFailure)
```

### 3. Resolution Applied

```
OutcomeDisplay resolves user interactions (dice, choices)
  → Controller calls GameCommandsService.applyNumericModifiers()
    → Resources updated in KingdomActor
      → Controller calls GameCommandsResolver for each gameCommand
        → State changes applied to kingdom
```

### 4. State Synchronized

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

ActiveCheckInstances store both modifier and gameCommand data:

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

## Summary

The Game Commands System provides:

- ✅ Structured gameplay mechanics beyond resource changes
- ✅ Type-safe command definitions (25+ types)
- ✅ Clear separation from resource modifiers
- ✅ Service-based architecture with delegation
- ✅ Full integration with player actions
- ✅ Compile-time validation and IDE support

This architecture enables complex kingdom operations while maintaining code clarity and type safety.
