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
