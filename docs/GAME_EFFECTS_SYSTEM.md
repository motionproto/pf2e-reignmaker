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

Standard kingdom resources using `EventModifier` format:

```typescript
interface ActionModifier {
  name: string;
  resource: 'gold' | 'food' | 'lumber' | 'stone' | 'ore' | 'unrest' | 'fame';
  value: number;
  duration: 'immediate' | 'ongoing' | 'permanent' | 'turns';
  turns?: number;
}
```

**Example:**
```json
"modifiers": [
  {
    "name": "Disband Army",
    "resource": "unrest",
    "value": -2,
    "duration": "immediate"
  }
]
```

### Game Effects

Gameplay mechanics defined in `src/controllers/actions/game-effects.ts`:

- **Territory:** `claimHexes`, `fortifyHex`, `buildRoads`
- **Construction:** `buildStructure`, `repairStructure`, `createWorksite`, `foundSettlement`, `upgradeSettlement`
- **Military:** `recruitArmy`, `trainArmy`, `deployArmy`, `outfitArmy`, `recoverArmy`, `disbandArmy`
- **Diplomatic:** `establishDiplomaticRelations`, `requestEconomicAid`, `requestMilitaryAid`, `infiltration`
- **Events:** `resolveEvent`, `hireAdventurers`
- **Support:** `aidBonus`, `grantReroll`
- **Unrest:** `arrestDissidents`, `executePrisoners`, `pardonPrisoners`

---

## Examples

### Claim Hexes (Proficiency Scaling)

```json
"gameEffects": [
  {
    "type": "claimHexes",
    "count": "proficiency-scaled",
    "scaling": {
      "trained": 1,
      "expert": 1,
      "master": 2,
      "legendary": 3
    },
    "bonus": 1  // Critical success adds +1 extra hex
  }
]
```

### Aid Another (Complex Bonus)

```json
"gameEffects": [
  {
    "type": "aidBonus",
    "target": "other-pc",
    "bonusType": "proficiency-scaled",
    "value": {
      "trained": 2,
      "expert": 2,
      "master": 3,
      "legendary": 4
    },
    "allowReroll": true  // Only on critical success
  }
]
```

### Hire Adventurers (Mode-Based)

```json
// Critical Success
"gameEffects": [
  {
    "type": "hireAdventurers",
    "mode": "resolve-event"
  }
]

// Success
"gameEffects": [
  {
    "type": "hireAdventurers",
    "mode": "bonus-to-event",
    "bonus": 2
  }
]
```

### Create Worksite (Conditional Effect)

```json
"gameEffects": [
  {
    "type": "createWorksite",
    "worksiteType": "farm",  // or "mine", "quarry", "lumbermill"
    "immediateResource": true  // Only on critical success
  }
]
```

### Combined Effects (Resources + Gameplay)

```json
{
  "criticalSuccess": {
    "description": "Army disbands smoothly, people welcome them home with honours!",
    "modifiers": [
      {
        "name": "Disband Army",
        "resource": "unrest",
        "value": -2,
        "duration": "immediate"
      }
    ],
    "gameEffects": [
      {
        "type": "disbandArmy",
        "targetArmy": "selected"
      }
    ]
  }
}
```

---

## Implementation

### TypeScript Types

All game effects are strongly typed in `src/controllers/actions/game-effects.ts`:

```typescript
export type GameEffect =
  | ClaimHexesEffect
  | BuildStructureEffect
  | AidBonusEffect
  | HireAdventurersEffect
  | CreateWorksiteEffect
  | ... // 25+ effect types
```

### Processing

Action execution service processes both effect types:

```typescript
// 1. Apply resource modifiers (harmonized with events/incidents)
for (const modifier of effect.modifiers) {
  applyResourceChange(modifier.resource, modifier.value);
}

// 2. Apply game effects (action-specific mechanics)
for (const gameEffect of effect.gameEffects) {
  switch (gameEffect.type) {
    case 'claimHexes':
      handleClaimHexes(gameEffect);
      break;
    case 'aidBonus':
      handleAidBonus(gameEffect);
      break;
    // ... etc
  }
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

Adding new effect types is simple:

1. Add type to `game-effects.ts`
2. Create handler in `action-execution.ts`
3. Use in action JSON files

Example - adding a new "Trade Route" effect:

```typescript
// game-effects.ts
export interface EstablishTradeRouteEffect extends BaseGameEffect {
  type: 'establishTradeRoute';
  targetSettlement: string;
  tradeGood: 'food' | 'luxury' | 'ore';
}

// action-execution.ts
case 'establishTradeRoute':
  handleEstablishTradeRoute(gameEffect);
  break;
```

---

## Summary

The game effects system provides **complete harmonization** across all kingdom data:

- **Events/Incidents** → Resource modifiers only
- **Player Actions** → Resource modifiers + Game effects

All effects are now **structured, typed, and validated** - no more string parsing! 🎉
