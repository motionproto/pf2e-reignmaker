# Game Effects System

## Overview

Player actions now use a **dual-effect system** to represent all possible outcomes:

1. **Resource Modifiers** (`modifiers`) - Kingdom resource changes (gold, food, unrest, etc.)
2. **Game Effects** (`gameEffects`) - Gameplay mechanics (claim territory, build structures, aid allies, etc.)

This provides **complete type safety** and **self-documenting data** without relying on brittle string parsing.

---

## Architecture

### Structured Effects

```json
{
  "effects": {
    "success": {
      "description": "Claim 2 hexes based on proficiency",
      "modifiers": [],
      "gameEffects": [
        {
          "type": "claimHexes",
          "count": "proficiency-scaled",
          "scaling": {
            "trained": 1,
            "expert": 1,
            "master": 2,
            "legendary": 3
          }
        }
      ]
    }
  }
}
```

**Benefits:**
- ✅ Type-safe and validated at build time
- ✅ Self-documenting data structure
- ✅ Easy to query and analyze
- ✅ Consistent with event/incident modifiers

---

## Effect Types

### Resource Modifiers

Standard kingdom resources using `EventModifier` format from `src/types/modifiers.ts`:

```typescript
// Static modifier (most common for player actions)
interface StaticModifier {
  type: 'static';
  resource: ResourceType;
  value: number;
  duration?: ModifierDuration;  // 'immediate' | 'ongoing' | number (turn count)
  name?: string;
}

type ResourceType = 'gold' | 'food' | 'lumber' | 'stone' | 'ore' | 'luxuries' | 
                    'unrest' | 'fame' | 'imprisoned_unrest' | 'damage_structure';
```

**Example:**
```json
"modifiers": [
  {
    "type": "static",
    "name": "Disband Army",
    "resource": "unrest",
    "value": -2,
    "duration": "immediate"
  }
]
```

**Duration Options:**
- `'immediate'` (or omitted) - Applied once
- `'ongoing'` - Persists until event resolved
- `number` - Lasts for specific number of turns (e.g., `3`)

### Game Effects

**Note:** Game effects system is planned but not yet implemented in player action data files. Current player actions use only `modifiers` for resource changes and include gameplay effects in the `description` field or `special` field for manual GM handling.

**Planned Effect Types:**
- **Territory:** `claimHexes`, `fortifyHex`, `buildRoads`
- **Construction:** `buildStructure`, `repairStructure`, `createWorksite`, `foundSettlement`, `upgradeSettlement`
- **Military:** `recruitArmy`, `trainArmy`, `deployArmy`, `outfitArmy`, `recoverArmy`, `disbandArmy`
- **Diplomatic:** `establishDiplomaticRelations`, `requestEconomicAid`, `requestMilitaryAid`, `infiltration`

---

## Examples

### Simple Resource Modifier

```json
"modifiers": [
  {
    "type": "static",
    "resource": "unrest",
    "value": -2,
    "duration": "immediate",
    "name": "Deal with Unrest"
  }
]
```

### Dice Modifier

```json
"modifiers": [
  {
    "type": "dice",
    "resource": "gold",
    "formula": "2d6",
    "negative": true,
    "duration": "immediate"
  }
]
```

### Choice Modifier

```json
"modifiers": [
  {
    "type": "choice",
    "resources": ["lumber", "ore", "food", "stone"],
    "value": {
      "formula": "2d4+1",
      "negative": true
    },
    "duration": "immediate"
  }
]
```

### Complex Outcome (Multiple Modifiers)

```json
{
  "criticalSuccess": {
    "description": "Army disbands smoothly, people welcome them home with honours!",
    "modifiers": [
      {
        "type": "static",
        "name": "Disband Army",
        "resource": "unrest",
        "value": -2,
        "duration": "immediate"
      }
    ]
  }
}
```

**Note:** Gameplay effects like "disband army" are currently handled through the UI and manual GM actions, not automated game effects.

---

## Implementation

### TypeScript Types

All modifiers use the typed modifier system from `src/types/modifiers.ts`:

```typescript
export type EventModifier = StaticModifier | DiceModifier | ChoiceModifier;
```

### Processing

Modifiers are processed through the resolution system:

```typescript
// 1. Detect modifier type
if (modifier.type === 'static') {
  // Apply immediate numeric change
  await applyResourceChange(modifier.resource, modifier.value);
}

// 2. Handle dice modifiers
if (modifier.type === 'dice') {
  // Show dice roller UI
  // Player rolls, then apply result
}

// 3. Handle choice modifiers
if (modifier.type === 'choice') {
  // Show resource selection UI
  // Player chooses, then resolve value (static or dice)
}
```

---


---

## Benefits

### For Data Authors
- Clear structure shows exactly what an action does
- No need to memorize parsing patterns
- Validation catches errors at build time

### For Developers
- Type-safe effect handling
- No regex parsing needed
- Easy to add new effect types
- Query-able data (e.g., "find all actions that claim hexes")

### For Users
- Consistent behavior
- Predictable outcomes
- Better error messages

---

## Future Extensions

The typed modifier system can be extended with new modifier types as needed:

```typescript
// Example: Percentage modifier
export interface PercentageModifier {
  type: 'percentage';
  resource: ResourceType;
  percent: number;
  negative?: boolean;
  duration?: ModifierDuration;
}

// Example: Conditional modifier
export interface ConditionalModifier {
  type: 'conditional';
  condition: string;
  modifier: EventModifier;
  duration?: ModifierDuration;
}
```

---

## Summary

The typed modifier system provides **complete harmonization** across all kingdom data:

- **Events/Incidents** → Typed resource modifiers (`StaticModifier`, `DiceModifier`, `ChoiceModifier`)
- **Player Actions** → Same typed resource modifiers

All modifiers are now **structured, typed, and validated** - no more regex parsing! 🎉

**Current Implementation:**
- ✅ Resource modifiers (typed and validated)
- ✅ Manual effects (displayed as GM instructions)
- ⏳ Game effects (planned for future automation)
