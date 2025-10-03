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

### Player Choices (Choice Buttons)

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

### Resource Array Choices (Dropdown Selector)

```json
{
  "failure": {
    "msg": "Minor artifacts; gain 1 of your choice",
    "modifiers": [
      {
        "name": "Resource Choice",
        "resource": ["food", "lumber", "ore", "stone"],
        "value": 1,
        "duration": "turns",
        "turns": 1
      }
    ]
  }
}
```

**System Behavior**:
1. Detects `resource` is an array, not a string
2. Renders dropdown selector: "Choose resource to gain (+1):"
3. Dropdown shows options: Food, Lumber, Ore, Stone
4. Player selects "Ore" from dropdown
5. Preview updates to show "+1 Ore"
6. "Apply Result" button enables after selection
7. When applied, adds 1 ore to kingdom

**Key Differences from Choice Buttons**:
- **UI**: Dropdown `<select>` vs clickable buttons
- **Use Case**: Better for multiple similar options (4+ resources)
- **Data**: Single modifier with array vs multiple choices
- **Display**: Auto-formatted resource names (food → Food)

**Combined Example**:
```json
{
  "failure": {
    "msg": "Choose penalty type, then select resource:",
    "modifiers": [],
    "choices": [
      {
        "label": "Lose 1 resource of your choice",
        "modifiers": [
          {
            "name": "Resource Loss",
            "resource": ["food", "lumber", "ore", "stone"],
            "value": -1,
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

This shows both systems working together: player picks a choice button, and if that choice has a resource array, they then see a dropdown.

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
// Resource can be a single type OR an array of types for player choice
interface EventModifier {
  name: string;
  resource: ResourceType | ResourceType[];  // Single OR array for choice
  value: number | string;  // e.g., 5, "1d4", "-2d6+1"
  duration: ModifierDuration;
  turns?: number;
}

// Outcome contains message and modifiers
// NEW: Separated control fields from modifiers for clarity
interface EventOutcome {
  msg: string;
  endsEvent?: boolean;           // Does this outcome end the event (vs. persist as ongoing)?
  modifiers: EventModifier[];    // Only actual resource/state changes
  manualEffects?: string[];      // Effects requiring manual GM application (e.g., "Lose 1d3 hexes")
  choices?: EventChoice[];       // Optional player choices
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

## Manual Effects (Non-Automated)

Some game effects cannot be automated (e.g., "Lose 1d3 hexes", "Mark settlement as quarantined"). These use the `manualEffects` field:

```json
{
  "criticalFailure": {
    "msg": "The plague becomes endemic! Ongoing losses until resolved.",
    "modifiers": [
      {
        "name": "Plague Deaths",
        "resource": "food",
        "value": "-1d4",
        "duration": "ongoing"
      },
      {
        "name": "Widespread Panic",
        "resource": "unrest",
        "value": 3,
        "duration": "immediate"
      }
    ],
    "manualEffects": [
      "Mark your largest settlement as 'Quarantined' (no new structures for 1 turn)",
      "Remove 1d3 hexes of farmland from your kingdom map"
    ],
    "endsEvent": false
  }
}
```

**System Behavior**:
1. Auto-applies all modifiers (food loss, unrest gain)
2. Displays manual effects in a warning-styled box with orange highlighting
3. Player/GM manually applies the hex loss and quarantine marker
4. Event persists (can be resolved in future turns)

**Manual Effects Display**:
- Rendered with warning icon and orange border
- Listed as bullet points
- Clear header: "Manual Effects - Apply Yourself"
- Cannot be auto-applied by the system

**When to Use Manual Effects**:
- Map changes (hex loss, hex gain)
- Settlement state changes (quarantine, destruction)
- Narrative consequences (NPC reactions, story triggers)
- External system changes (Foundry scenes, tokens, etc.)

## Event Persistence & Resolution

The `endsEvent` field controls whether an event is removed after the outcome:

```json
{
  "failure": {
    "msg": "You fail to contain the issue, but prevent it from escalating.",
    "modifiers": [
      {
        "name": "Containment Cost",
        "resource": "gold",
        "value": -10,
        "duration": "immediate"
      }
    ],
    "endsEvent": true  // Event removed even though they failed
  }
}
```

**vs.**

```json
{
  "failure": {
    "msg": "The problem persists! It will continue until resolved.",
    "modifiers": [
      {
        "name": "Ongoing Penalty",
        "resource": "unrest",
        "value": 1,
        "duration": "ongoing"
      }
    ],
    "endsEvent": false  // Event persists in Events tab for future resolution
  }
}
```

**Default Behavior** (if `endsEvent` is omitted):
- **Success/Critical Success**: Event ends (as if `endsEvent: true`)
- **Failure/Critical Failure**: Event persists (as if `endsEvent: false`)
- Players can attempt to resolve persistent events in future Event Phases

**Persistent Event Flow**:
1. Player rolls failure → Event added to active events list
2. Ongoing modifiers apply every Event Phase
3. Event appears in Events tab with resolution options
4. Player can spend actions to try resolving again
5. Success removes the event and stops ongoing penalties

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

### Example 6: Resource Array Choice
```json
{
  "failure": {
    "msg": "Minor artifacts; gain 1 of your choice",
    "modifiers": [
      {
        "name": "Resource Choice",
        "resource": ["food", "lumber", "ore", "stone"],
        "value": 1,
        "duration": "turns",
        "turns": 1
      }
    ]
  }
}
```

### Example 7: Multiple Resource Arrays
```json
{
  "criticalSuccess": {
    "msg": "Abundant resources; gain 2 of one type and 1 of another",
    "modifiers": [
      {
        "name": "Major Resource Gain",
        "resource": ["food", "lumber", "ore", "stone"],
        "value": 2,
        "duration": "turns",
        "turns": 1
      },
      {
        "name": "Minor Resource Gain",
        "resource": ["food", "lumber", "ore", "stone"],
        "value": 1,
        "duration": "turns",
        "turns": 1
      }
    ]
  }
}
```
Player sees two dropdowns - one for the +2 resource, one for the +1 resource.

## Validation Rules

1. **Resource Placeholders Must Match**: Every `{resourceName}` in a message should have a corresponding modifier with that resource (unless using resource arrays with dropdowns)
2. **Valid Dice Formulas**: String values must match dice pattern or be left as-is
3. **Consistent Signs**: Don't use `"-1d4"` for gains or `"1d4"` for losses (confusing)
4. **No Empty Modifiers**: If outcome has effects, include modifiers (or manualEffects, or both)
5. **Choice Modifiers Required**: Choices must have at least one modifier
6. **Resource Array Homogeneity**: When using resource arrays, all options should be the same type (all commodities, all stats, etc.)
7. **No Placeholders for Arrays**: Don't use `{resource}` placeholders for resource array modifiers - describe the choice in the message
8. **Manual Effects Are Strings**: `manualEffects` is an array of strings, not modifiers - describe what the player/GM must do manually
9. **Don't Mix Control & Resources**: Use `endsEvent` boolean, not a fake modifier with `resource: "endsEvent"`

## Best Practices

1. **Clear Messages**: Always show what will happen: `"Lose {gold} gold"` not `"Gold penalty"`
2. **Descriptive Names**: Use clear modifier names: `"Gold Loss from Trade Embargo"`
3. **Explicit Negatives**: Use `-` prefix for losses: `"-1d4"` not `"1d4"` with reverse logic
4. **Consistent Formatting**: Keep similar outcomes in similar format
5. **Test Values**: When designing, note expected averages in comments
6. **Resource Arrays for Many Options**: Use resource arrays (dropdown) for 4+ similar options; use choice buttons for 2-3 distinct options
7. **Clear Choice Messages**: For resource arrays, message should indicate "your choice" or similar: `"gain 1 of your choice"`
8. **Manual Effects Are Explicit**: Write clear instructions: `"Remove 1d3 hexes from map"` not `"Hex loss"`
9. **Separate Concerns**: Keep automated effects in `modifiers`, manual effects in `manualEffects`, control flow in `endsEvent`

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

## UI System Selection

### When to Use Choice Buttons

Use `choices` array with separate modifiers for each choice when:
- **Few Options**: 2-3 distinct choices
- **Different Types**: Each choice affects different resources/outcomes
- **Narrative Clarity**: Each choice represents a different story path

Example: "Pay gold OR gain unrest" - clearly different consequences

### When to Use Resource Arrays

Use `resource: [...]` array in a single modifier when:
- **Many Similar Options**: 4+ options of the same category
- **Same Mechanic**: All options have the same effect, just different targets
- **Cleaner Data**: One modifier instead of many identical choice objects

Example: "Gain 1 resource of your choice" - all commodities, same value

### UI Components

**Choice Buttons** → Rendered as clickable button grid
**Resource Arrays** → Rendered as dropdown `<select>` element

Both systems automatically:
- Roll any dice formulas in the modifiers
- Disable "Apply Result" until selection is made
- Preview the selected outcome
- Apply the chosen effect

## Future Extensions

Potential enhancements:
- **Level Scaling**: `"value": "{kingdomLevel}d4"` (formula with variable)
- **Conditional Values**: `"value": "{tier === 'major' ? '2d6' : '1d4'}"`
- **Min/Max Constraints**: `"value": "1d4 (min: 2)"`
- **Dynamic Arrays**: `"resource": "{availableResources}"` (computed at runtime)

---

**Version**: 2.2 (Separated Manual Effects & Event Persistence)  
**Last Updated**: 2025-10-04  
**Status**: Active Specification

## Changelog

### v2.2 (2025-10-04)
- **BREAKING**: Removed `resource: "manual"` and `resource: "endsEvent"` from ResourceType
- **NEW**: Added `manualEffects: string[]` to EventOutcome for non-automated effects
- **CLARIFIED**: `endsEvent?: boolean` controls event persistence (always boolean, never a modifier)
- Updated TypeScript types to reflect new structure
- Added examples for manual effects and event persistence
- Updated validation rules and best practices

### v2.1 (2025-10-03)
- Added resource arrays for dropdown selectors
- Documented difference between choice buttons and resource arrays
- Added examples for multiple resource arrays

### v2.0
- Direct dice formulas in `value` field
- Resource-based placeholders in messages
- Removed magic number system
