# Event & Incident Outcome Specification

## Overview

This specification defines how random values (dice rolls) and static values are represented in event and incident outcomes. The system uses **direct dice formulas** in modifier values with **resource-based placeholders** in messages for clarity and simplicity.

## Core Principles

1. **Modifiers Live in Outcomes**: Each outcome (criticalSuccess, success, failure, criticalFailure) contains its own modifiers
2. **Direct Formulas**: Dice formulas go directly in the `value` field (e.g., `"-1d4"`, `"2d6+1"`)
3. **Resource Placeholders**: Messages use `{resourceName}` which auto-resolves from modifiers
4. **Auto-Detection**: System automatically detects and rolls dice formulas vs static numbers

## JSON Format

### Basic Structure

Every outcome has:
- `msg` - Description text with `{resourceName}` placeholders
- `modifiers` - Array of resource changes (each modifier has resource and value)
- `choices` (optional) - Player choice buttons

### Static Values

```json
{
  "success": {
    "msg": "Gain {gold} gold and {fame} fame",
    "modifiers": [
      {
        "name": "Gold Reward",
        "resource": "gold",
        "value": 10,
        "duration": "immediate"
      },
      {
        "name": "Fame Reward",
        "resource": "fame",
        "value": 2,
        "duration": "immediate"
      }
    ]
  }
}
```

**System Behavior**:
- Sees `{gold}` in message → finds modifier with `resource: "gold"`
- Value is `10` (number) → replaces `{gold}` with `10`
- Message becomes: "Gain 10 gold and 2 fame"

### Dice Formulas

```json
{
  "criticalFailure": {
    "msg": "Lose {gold} gold AND {resources} resources, +{unrest} unrest",
    "modifiers": [
      {
        "name": "Critical Gold Loss",
        "resource": "gold",
        "value": "-2d4",
        "duration": "immediate"
      },
      {
        "name": "Critical Resource Loss",
        "resource": "resources",
        "value": "-1d4+1",
        "duration": "immediate"
      },
      {
        "name": "Unrest Penalty",
        "resource": "unrest",
        "value": 1,
        "duration": "immediate"
      }
    ]
  }
}
```

**System Behavior**:
- Parses modifiers, detects `"-2d4"` and `"-1d4+1"` as dice formulas
- Rolls: `2d4` = 6, `1d4+1` = 3
- Replaces in message: `{gold}` → `6`, `{resources}` → `3`, `{unrest}` → `1`
- Message becomes: "Lose 6 gold AND 3 resources, +1 unrest"
- Applies: gold -6, resources -3, unrest +1

### Player Choices

```json
{
  "failure": {
    "msg": "Choose one:",
    "modifiers": [],
    "choices": [
      {
        "label": "Lose {gold} gold",
        "modifiers": [
          {
            "name": "Gold Loss",
            "resource": "gold",
            "value": "-1d4",
            "duration": "immediate"
          }
        ]
      },
      {
        "label": "Lose {resources} resources",
        "modifiers": [
          {
            "name": "Resource Loss",
            "resource": "resources",
            "value": "-1d4+1",
            "duration": "immediate"
          }
        ]
      }
    ]
  }
}
```

**System Behavior**:
1. Shows two choice buttons with labels containing `{resourceName}`
2. Player clicks "Lose {gold} gold"
3. System rolls `1d4` = 3
4. Updates button label: "Lose 3 gold"
5. When applied, deducts 3 gold

### Mixed Values

```json
{
  "success": {
    "msg": "Gain 10 gold and {fame} fame",
    "modifiers": [
      {
        "name": "Fixed Gold Reward",
        "resource": "gold",
        "value": 10,
        "duration": "immediate"
      },
      {
        "name": "Random Fame Reward",
        "resource": "fame",
        "value": "1d4",
        "duration": "immediate"
      }
    ]
  }
}
```

## TypeScript Types

```typescript
// Modifier value can be a static number or dice formula string
interface EventModifier {
  name: string;
  resource: ResourceType;
  value: number | string;  // e.g., 5, "1d4", "-2d6+1"
  duration: ModifierDuration;
  turns?: number;
}

// Outcome contains message and modifiers
interface EventOutcome {
  msg: string;
  endsEvent?: boolean;
  modifiers: EventModifier[];
  choices?: EventChoice[];
}

// Choices also use modifiers
interface EventChoice {
  label: string;
  modifiers: EventModifier[];
}
```

## Implementation Details

### Dice Formula Detection

A value is a dice formula if it's a string matching: `^-?\d+d\d+([+-]\d+)?$`

Examples:
- `"1d4"` ✅
- `"2d6+1"` ✅
- `"-1d4"` ✅
- `"-2d6-1"` ✅
- `"1d4+1d6"` ❌ (not supported - use multiple modifiers)

### Roll Resolution Process

1. **Parse Outcome**: Extract all modifiers from the outcome (or choice)
2. **Identify Dice**: Check each modifier's value - is it a string with dice pattern?
3. **Roll Dice**: For each dice formula, roll and get numeric result
4. **Build Resource Map**: Create `{ resourceName: rolledValue }` map
5. **Replace Placeholders**: In messages, replace `{resourceName}` with values from map
6. **Apply Effects**: Use numeric values to modify kingdom state

### Message Placeholder Rules

- **Format**: `{resourceName}` (curly braces, exact resource name)
- **Case Sensitive**: Must match modifier's `resource` field exactly
- **Auto-Lookup**: System finds modifier with matching resource name
- **Fallback**: If resource not in modifiers, placeholder remains unchanged

### Negative Values

For losses, include the minus sign in the dice formula:
- `"value": "-1d4"` → rolls 1d4, applies as negative (e.g., -3)
- `"value": -5` → static loss of 5

### Supported Dice Formats

- `"1d4"` - Single die type
- `"2d6"` - Multiple dice
- `"1d4+1"` - Dice with positive modifier
- `"3d6-2"` - Dice with negative modifier
- `"-1d4"` - Negative result (loss)
- `"-2d6+1"` - Negative with modifier

## Complete Examples

### Example 1: Simple Random Penalty
```json
{
  "failure": {
    "msg": "Lose {gold} gold",
    "modifiers": [
      {
        "name": "Gold Loss",
        "resource": "gold",
        "value": "-1d4",
        "duration": "immediate"
      }
    ]
  }
}
```

### Example 2: Multiple Random Penalties
```json
{
  "criticalFailure": {
    "msg": "Lose {gold} gold, {fame} fame, and gain {unrest} unrest",
    "modifiers": [
      {
        "name": "Gold Loss",
        "resource": "gold",
        "value": "-2d6",
        "duration": "immediate"
      },
      {
        "name": "Fame Loss",
        "resource": "fame",
        "value": "-1d4",
        "duration": "immediate"
      },
      {
        "name": "Unrest Gain",
        "resource": "unrest",
        "value": "1d4+1",
        "duration": "immediate"
      }
    ]
  }
}
```

### Example 3: Player Choice Between Penalties
```json
{
  "failure": {
    "msg": "Choose your penalty:",
    "modifiers": [],
    "choices": [
      {
        "label": "Pay {gold} gold",
        "modifiers": [
          {
            "name": "Gold Payment",
            "resource": "gold",
            "value": "-2d4",
            "duration": "immediate"
          }
        ]
      },
      {
        "label": "Gain {unrest} unrest",
        "modifiers": [
          {
            "name": "Unrest Penalty",
            "resource": "unrest",
            "value": "1d4",
            "duration": "immediate"
          }
        ]
      }
    ]
  }
}
```

### Example 4: Mixed Static and Random
```json
{
  "success": {
    "msg": "Gain 10 gold and {fame} fame",
    "modifiers": [
      {
        "name": "Fixed Gold",
        "resource": "gold",
        "value": 10,
        "duration": "immediate"
      },
      {
        "name": "Variable Fame",
        "resource": "fame",
        "value": "1d4",
        "duration": "immediate"
      }
    ]
  }
}
```

### Example 5: Only Static Values
```json
{
  "success": {
    "msg": "Gain {gold} gold and {fame} fame",
    "modifiers": [
      {
        "name": "Gold Reward",
        "resource": "gold",
        "value": 5,
        "duration": "immediate"
      },
      {
        "name": "Fame Reward",
        "resource": "fame",
        "value": 2,
        "duration": "immediate"
      }
    ]
  }
}
```

## Validation Rules

1. **Resource Placeholders Must Match**: Every `{resourceName}` in a message should have a corresponding modifier with that resource
2. **Valid Dice Formulas**: String values must match dice pattern or be left as-is
3. **Consistent Signs**: Don't use `"-1d4"` for gains or `"1d4"` for losses (confusing)
4. **No Empty Modifiers**: If outcome has effects, include modifiers
5. **Choice Modifiers Required**: Choices must have at least one modifier

## Best Practices

1. **Clear Messages**: Always show what will happen: `"Lose {gold} gold"` not `"Gold penalty"`
2. **Descriptive Names**: Use clear modifier names: `"Gold Loss from Trade Embargo"`
3. **Explicit Negatives**: Use `-` prefix for losses: `"-1d4"` not `"1d4"` with reverse logic
4. **Consistent Formatting**: Keep similar outcomes in similar format
5. **Test Values**: When designing, note expected averages in comments

## Migration from Old Format

### Old: Magic Number (-999)
```json
{
  "modifiers": [{
    "resource": "gold",
    "value": -999
  }],
  "diceFormula": "1d4"
}
```

### New: Direct Formula
```json
{
  "msg": "Lose {gold} gold",
  "modifiers": [{
    "resource": "gold",
    "value": "-1d4",
    "duration": "immediate"
  }]
}
```

### Old: Hardcoded Average
```json
{
  "msg": "Lose 6 gold",
  "modifiers": [{
    "resource": "gold",
    "value": -6
  }]
}
```

### New: Proper Dice (if it should be random)
```json
{
  "msg": "Lose {gold} gold",
  "modifiers": [{
    "resource": "gold",
    "value": "-2d4",
    "duration": "immediate"
  }]
}
```

## Future Extensions

Potential enhancements:
- **Level Scaling**: `"value": "{kingdomLevel}d4"` (formula with variable)
- **Conditional Values**: `"value": "{tier === 'major' ? '2d6' : '1d4'}"`
- **Min/Max Constraints**: `"value": "1d4 (min: 2)"`

---

**Version**: 2.0 (Simplified)  
**Last Updated**: 2025-10-03  
**Status**: Active Specification
