# PF2e Modifier Integration Guide

## Overview

This document explains how modifiers are integrated between the Kingdom system and the PF2e roll system, allowing kingdom-specific modifiers to appear in PF2e skill check dialogs.

## Architecture

### 1. Data Flow

```
KingdomState (persistent modifiers, structures)
    ↓
ModifierService (aggregation & temporary modifiers)
    ↓
PF2eIntegrationService (conversion to PF2e format)
    ↓
PF2e Roll Dialog (displays modifiers for player selection)
```

### 2. Services

#### **ModifierService** (`src/services/ModifierService.ts`)
- **Purpose**: Aggregates modifiers from multiple sources
- **Sources**:
  - Kingdom State structures (skill bonuses from buildings)
  - Long-term modifiers (from events, unresolved incidents)
  - Temporary modifiers (aid another, situational bonuses)
  - Unrest penalties

#### **PF2eIntegrationService** (`src/api/pf2e-integration.ts`)
- **Purpose**: Interface with PF2e system
- **Responsibilities**:
  - Character management
  - Skill check execution
  - Modifier format conversion
  - Roll result processing

## Modifier Sources

### 1. **Structures**
Buildings in settlements can provide skill bonuses:

```typescript
// Example structure bonuses
const skillBonuses = {
  'embassy': { 'diplomacy': 2 },
  'barracks': { 'intimidation': 1, 'warfare lore': 1 },
  'library': { 'arcana': 1, 'society': 1 },
  'marketplace': { 'mercantile lore': 1, 'society': 1 },
  'temple': { 'religion': 2 },
  'thieves-guild': { 'thievery': 2, 'stealth': 1 },
  'academy': { 'arcana': 2, 'occultism': 1 },
  'garrison': { 'warfare lore': 2, 'intimidation': 1 }
};
```

### 2. **Unrest**
Unrest levels apply penalties to all checks:
- **Stable** (0-4): No penalty
- **Discontent** (5-9): -1 penalty
- **Unrest** (10-14): -2 penalty
- **Rebellion** (15+): -4 penalty

### 3. **Long-term Modifiers**
From events and unresolved incidents stored in `KingdomState.modifiers`:
- Duration-based (turns)
- Permanent effects
- Until-resolved conditions

### 4. **Temporary Modifiers**
Session-only modifiers not persisted:
- Aid Another bonuses (+1 or +2 circumstance)
- Situational modifiers
- One-time effects

## Usage Examples

### Adding a Temporary Modifier

```typescript
import { modifierService } from './services/ModifierService';

// Add an Aid Another bonus
modifierService.addTemporaryModifier('diplomacy', {
  name: 'Aid from Valeros',
  value: 2,
  type: 'circumstance',
  source: 'aid-another',
  enabled: true
});
```

### Performing a Kingdom Check

```typescript
import { performKingdomSkillCheck } from './api/pf2e-integration';

// Perform a kingdom action with automatic modifier inclusion
await performKingdomSkillCheck(
  'Diplomacy',           // skill name
  'action',              // check type
  'Quell Unrest',        // action name
  'quell-unrest-001',    // unique ID
  {                      // outcomes
    criticalSuccess: { msg: 'Unrest reduced by 2' },
    success: { msg: 'Unrest reduced by 1' },
    failure: { msg: 'No effect' },
    criticalFailure: { msg: 'Unrest increases by 1' }
  }
);
```

The modifiers will automatically be:
1. Gathered from all sources
2. Converted to PF2e format
3. Displayed in the roll dialog
4. Applied to the roll if enabled

### Clearing Temporary Modifiers

```typescript
// Clear modifiers for a specific skill
modifierService.clearTemporaryModifiers('diplomacy');

// Clear all temporary modifiers
modifierService.clearTemporaryModifiers();
```

## Modifier Types

PF2e uses specific modifier types for stacking rules:

- **ability**: Ability score modifiers
- **circumstance**: Situational bonuses (e.g., Aid Another)
- **status**: Ongoing effects
- **item**: Bonuses from items/structures
- **potency**: Magical enhancement bonuses
- **proficiency**: Skill proficiency bonuses
- **untyped**: Always stacks

## Component Integration

### Actions Phase
```typescript
// Already integrated - uses performKingdomActionRoll
```

### Events Phase
```typescript
// Already integrated - uses performKingdomSkillCheck
```

### Unrest Phase (Incidents)
```typescript
// Use performKingdomSkillCheck for incident resolution
await performKingdomSkillCheck(
  skill,
  'incident',
  incident.name,
  incident.id,
  outcomes
);
```

## Extending the System

### Adding New Modifier Sources

1. Update `ModifierService.getModifiersForCheck()` to include new source
2. Implement getter method for the new modifier type
3. Ensure proper type conversion in `convertToRollModifier()`

### Adding Structure Bonuses

Update the `getStructureSkillBonus()` method in ModifierService:

```typescript
const skillBonuses: Record<string, Record<string, number>> = {
  'new-structure': { 'skill-name': bonus-value },
  // ...
};
```

### Custom Modifier Types

Create new modifiers with the `RollModifier` interface:

```typescript
interface RollModifier {
  name: string;
  value: number;
  type?: 'circumstance' | 'status' | 'item' | 'untyped';
  enabled?: boolean;
  source?: string;
}
```

## Best Practices

1. **Always clear temporary modifiers** after a check completes
2. **Use appropriate modifier types** for proper stacking
3. **Provide clear modifier names** for player understanding
4. **Document modifier sources** in the source field
5. **Test modifier stacking** with multiple sources

## Troubleshooting

### Modifiers Not Appearing
- Check ModifierService is properly initialized
- Verify KingdomState has expected data
- Ensure skill name matches PF2e slug mapping

### Incorrect Modifier Values
- Check for proper type conversion in `convertToPF2eModifiers()`
- Verify structure bonus mappings
- Check unrest penalty calculations

### Roll Not Executing
- Ensure character is selected
- Verify skill exists on character
- Check browser console for errors
