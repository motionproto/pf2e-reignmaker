# Typed Modifiers System

**Purpose:** Type-safe resource modifications using explicit TypeScript discriminants instead of regex pattern matching

---

## Overview

The Typed Modifiers System provides structured, type-safe handling of all resource changes in the kingdom:
- **Static modifiers** - Fixed numeric values
- **Dice modifiers** - Player-rolled values
- **Choice modifiers** - Player-selected resources

**Key Benefit:** Eliminates brittle regex patterns with compile-time type safety.

---

## Modifier Types

### StaticModifier

Fixed numeric value applied to a resource.

```typescript
interface StaticModifier {
  type: 'static';
  resource: ResourceType;
  value: number;
  duration?: ModifierDuration;
}
```

**Example:**
```json
{
  "type": "static",
  "resource": "unrest",
  "value": 1,
  "duration": "immediate"
}
```

**Usage:** Most common modifier type for immediate numerical changes.

### DiceModifier

Requires player to roll dice for the value.

```typescript
interface DiceModifier {
  type: 'dice';
  resource: ResourceType;
  formula: string;        // Just the formula (no negative sign)
  negative?: boolean;     // Separate flag for negative
  duration?: ModifierDuration;
}
```

**Examples:**
```json
{
  "type": "dice",
  "resource": "gold",
  "formula": "2d6",
  "negative": true,
  "duration": "immediate"
}
```

**Pattern:** Formula is always positive, `negative` flag controls application.

### ChoiceModifier

Player chooses from multiple resource options.

```typescript
interface ChoiceModifier {
  type: 'choice';
  resources: ResourceType[];  // Player selects from these
  value: number | DiceValue;  // Can be static or dice
  duration?: ModifierDuration;
}
```

**Example:**
```json
{
  "type": "choice",
  "resources": ["lumber", "ore", "food", "stone"],
  "value": {
    "formula": "2d4+1",
    "negative": true
  },
  "duration": "immediate"
}
```

**UI:** Renders as dropdown selection in OutcomeDisplay.

---

## Duration Types

### Immediate

Applies once and is done. Default if omitted.

```json
{
  "duration": "immediate"
}
```

### Ongoing

Persists until event/incident is resolved.

```json
{
  "duration": "ongoing"
}
```

**Use Case:** Events with `endsEvent: false` that continue across turns.

### Turn Count

Lasts for specific number of turns.

```json
{
  "duration": 3  // Expires after 3 turns
}
```

**Use Case:** Temporary buffs/debuffs with fixed duration.

---

## Resource Types

```typescript
type ResourceType = 
  // Basic resources
  | 'gold' | 'food' | 'lumber' | 'stone' | 'ore' | 'luxuries'
  // Kingdom stats
  | 'unrest' | 'fame'
  // Special resources
  | 'imprisoned_unrest'  // Unrest from imprisoning dissidents
  | 'damage_structure';  // Damage to kingdom structures
```

---

## Outcome Structure

All outcomes (events, incidents, actions) use the same structure:

```typescript
interface EventOutcome {
  msg?: string;                   // Description with {resourceName} placeholders
  modifiers?: EventModifier[];    // Resource changes
  manualEffects?: string[];       // GM instructions (not auto-applied)
  endsEvent?: boolean;            // For events: should it persist?
}

type EventModifier = StaticModifier | DiceModifier | ChoiceModifier;
```

### Message Placeholders

Use `{resourceName}` in messages to auto-display values:

```json
{
  "msg": "Lose {gold} gold and {fame} fame",
  "modifiers": [
    { "type": "static", "resource": "gold", "value": -10 },
    { "type": "dice", "resource": "fame", "formula": "1d4", "negative": true }
  ]
}
```

**Resolution:**
1. System detects dice modifier
2. Player rolls 1d4 (result: 3)
3. Message becomes: "Lose 10 gold and 3 fame"
4. Effects applied: gold -10, fame -3

---

## Type Discrimination

### Detection Pattern

```typescript
// Use type field, not pattern matching
function processModifier(modifier: EventModifier) {
  switch (modifier.type) {
    case 'static':
      return applyStatic(modifier.resource, modifier.value);
      
    case 'dice':
      return showDiceRoller(modifier.formula, modifier.negative);
      
    case 'choice':
      return showChoiceDropdown(modifier.resources, modifier.value);
  }
}
```

### Type Guards

```typescript
import { isDiceModifier, isChoiceModifier, isStaticModifier } from '../types/modifiers';

if (isDiceModifier(modifier)) {
  // TypeScript knows: modifier.formula exists
  const roll = rollDice(modifier.formula);
}
```

---

## Manual Effects

Some effects cannot be automated (map changes, NPC reactions, etc.):

```json
{
  "msg": "The plague becomes endemic!",
  "modifiers": [
    { "type": "static", "resource": "unrest", "value": 3 }
  ],
  "manualEffects": [
    "Mark your largest settlement as 'Quarantined' (no new structures for 1 turn)",
    "Remove 1d3 hexes of farmland from your kingdom map"
  ]
}
```

**Display:** Warning-styled box with orange highlighting in OutcomeDisplay.

**Application:** Player/GM manually applies these effects.

---

## Game Effects (Planned)

Game effects provide automated gameplay mechanics (not yet implemented):

```typescript
interface GameEffect {
  type: string;
  [key: string]: any;  // Effect-specific properties
}
```

**Planned Types:**
- Territory: `claimHexes`, `fortifyHex`, `buildRoads`
- Construction: `buildStructure`, `repairStructure`, `createWorksite`
- Military: `recruitArmy`, `trainArmy`, `deployArmy`
- Diplomatic: `establishDiplomaticRelations`, `requestEconomicAid`

**Current Status:** Type definitions exist, automation not implemented. Game effects described in `manualEffects` or handled via custom UI.

---

## Integration Points

### With Check Instance System

ActiveCheckInstances store outcomes with typed modifiers:

```typescript
appliedOutcome: {
  modifiers: EventModifier[];  // Typed array
  manualEffects: string[];
  // ... other fields
}
```

### With OutcomeDisplay

OutcomeDisplay automatically handles all modifier types:
- Detects dice modifiers → shows dice roller
- Detects choice modifiers → shows dropdown
- Validates all resolved before enabling "Apply Result"

### With GameEffectsService

GameEffectsService receives final numeric values after user interaction:

```typescript
interface ResolutionData {
  numericModifiers: Array<{
    resource: string;
    value: number;  // Already rolled/chosen
  }>;
  manualEffects: string[];
  complexActions: any[];  // Future: game effects
}
```

---

## Migration from String-Based

### Before (Regex Pattern)

```json
{
  "resource": "gold",
  "value": "-2d6"
}
```

**Problems:**
- Brittle regex matching
- No type safety
- Hard to validate
- Easy to introduce bugs

### After (Typed)

```json
{
  "type": "dice",
  "resource": "gold",
  "formula": "2d6",
  "negative": true
}
```

**Benefits:**
- ✅ Explicit type field
- ✅ Compile-time validation
- ✅ Self-documenting
- ✅ Easy to extend

---

## Build Integration

### Hand-Written Types

**File:** `src/types/modifiers.ts`

**Status:** Hand-written, never auto-generated

**Header:**
```typescript
// ⚠️ HAND-WRITTEN - DO NOT AUTO-GENERATE ⚠️
```

**Contents:**
- Core modifier type definitions
- Duration types
- Resource types
- Type guards and utilities

### Auto-Generated Types

**Files:** `src/types/events.ts`, `src/types/incidents.ts`

**Pattern:** Import from `modifiers.ts`:
```typescript
import type { 
  EventModifier, 
  ModifierDuration,
  StaticModifier,
  DiceModifier,
  ChoiceModifier 
} from './modifiers';
```

**Build Command:**
```bash
npm run generate-types
# or
python3 buildscripts/generate-types.py
```

---

## Best Practices

### Data Authoring

- ✅ Use clear names: `"Gold Loss from Trade Embargo"`
- ✅ Explicit negatives: `negative: true` for losses
- ✅ Resource placeholders: Match `msg` to modifier resources
- ✅ Manual effects: Clear instructions for GM

### Code Implementation

- ✅ Use type discrimination, not regex
- ✅ Use type guards for narrowing
- ✅ Validate structure at build time
- ✅ Handle all cases exhaustively

### UI Implementation

- ✅ OutcomeDisplay handles all types automatically
- ✅ Show dice before rolling
- ✅ Disable "Apply" until all interactions complete
- ✅ Display manual effects prominently

---

## Examples

### Static Value

```json
{
  "success": {
    "msg": "Gain {gold} gold and {fame} fame",
    "modifiers": [
      { "type": "static", "resource": "gold", "value": 10 },
      { "type": "static", "resource": "fame", "value": 2 }
    ]
  }
}
```

### Dice Roll

```json
{
  "failure": {
    "msg": "Lose {gold} gold",
    "modifiers": [
      {
        "type": "dice",
        "resource": "gold",
        "formula": "2d6",
        "negative": true
      }
    ]
  }
}
```

### Player Choice

```json
{
  "failure": {
    "msg": "Minor artifacts; gain 1 of your choice",
    "modifiers": [
      {
        "type": "choice",
        "resources": ["food", "lumber", "ore", "stone"],
        "value": 1,
        "duration": 1
      }
    ]
  }
}
```

### Mixed with Manual Effects

```json
{
  "criticalFailure": {
    "msg": "The plague becomes endemic!",
    "modifiers": [
      { "type": "static", "resource": "food", "formula": "-1d4", "duration": "ongoing" },
      { "type": "static", "resource": "unrest", "value": 3 }
    ],
    "manualEffects": [
      "Mark your largest settlement as 'Quarantined'",
      "Remove 1d3 hexes of farmland from your kingdom map"
    ],
    "endsEvent": false
  }
}
```

---

## Summary

The Typed Modifiers System provides:

- ✅ Explicit type discrimination (no regex)
- ✅ Compile-time type safety
- ✅ Self-documenting data structures
- ✅ Consistent handling across all outcome types
- ✅ Easy validation and extension
- ✅ Automatic UI rendering in OutcomeDisplay

This architecture replaces brittle string parsing with a robust, maintainable type system that scales with the project's complexity.
