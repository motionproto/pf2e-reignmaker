# Manual Effects Guide

## Overview

Manual effects allow you to specify game effects in events and incidents that **cannot be automatically applied** by the system, but need to be shown to players so they can apply them manually.

Examples:
- "Lose 1d3 hexes of farmland"
- "Mark a random settlement as 'Quarantined'"
- "Remove a random structure from your largest settlement"

## How It Works

Use the special `resource: "manual"` in an `EventModifier` to create a manual effect.

### Basic Structure

```json
{
  "failure": {
    "msg": "The plague spreads across your farmlands!",
    "modifiers": [
      {
        "name": "Disease Panic",
        "resource": "unrest",
        "value": 2,
        "duration": "immediate"
      },
      {
        "name": "Lose 1d3 hexes of farmland (roll and remove from map)",
        "resource": "manual",
        "value": 0,
        "duration": "immediate"
      }
    ]
  }
}
```

## Display Behavior

Manual effects are displayed in a **special warning box** in the outcome display:

```
┌─────────────────────────────────┐
│ ❌ Failure                       │
├─────────────────────────────────┤
│ The plague spreads!             │
│                                  │
│ ⚠️ MANUAL EFFECTS - APPLY YOURSELF │
│ • Lose 1d3 hexes of farmland    │
│                                  │
│ Unrest: +2  ✓ (automated)       │
├─────────────────────────────────┤
│              [OK]                │
└─────────────────────────────────┘
```

## Technical Details

### Field Requirements

- **name**: (required) The description of what the player needs to do
- **resource**: (required) Must be `"manual"`
- **value**: (required) Use `0` (not used, but required by schema)
- **duration**: (required) Typically `"immediate"`

### Processing

1. **Display**: Manual effects are shown in a warning-styled box with an exclamation icon
2. **Application**: Manual effects are **NOT** automatically applied to kingdom resources
3. **User Action**: Players read the effect and apply it themselves in Foundry

### Multiple Manual Effects

You can have multiple manual effects in a single outcome:

```json
{
  "criticalFailure": {
    "msg": "Catastrophic collapse!",
    "modifiers": [
      {
        "name": "Lose 1d3 hexes of farmland",
        "resource": "manual",
        "value": 0,
        "duration": "immediate"
      },
      {
        "name": "Mark your largest settlement as 'Quarantined' (no structures can be built for 1 turn)",
        "resource": "manual",
        "value": 0,
        "duration": "immediate"
      },
      {
        "name": "Remove one random Farm or Plantation structure",
        "resource": "manual",
        "value": 0,
        "duration": "immediate"
      }
    ]
  }
}
```

## When to Use Manual Effects

### ✅ **Use manual effects when:**
- Effect requires dice rolls the system can't handle (e.g., "1d3 hexes")
- Effect requires player choice beyond resource selection (e.g., "random structure")
- Effect modifies game state outside kingdom resources (e.g., map changes, settlement status)
- Effect has complex conditional logic (e.g., "if you have a Farm, lose it; otherwise lose 10 food")

### ❌ **Don't use manual effects when:**
- Simple resource changes (use normal modifiers)
- Player choice between resources (use `resource: ["gold", "food"]` arrays)
- Dice-based resource changes (use dice formulas: `"value": "1d4"`)

## Best Practices

### 1. Be Specific and Clear

❌ **Bad:** `"Lose some hexes"`
✅ **Good:** `"Lose 1d3 hexes of farmland (roll 1d3 and remove that many hexes from the map)"`

### 2. Include Instructions

❌ **Bad:** `"Settlement quarantined"`
✅ **Good:** `"Mark your largest settlement as 'Quarantined' in notes (no structures can be built for 1 turn)"`

### 3. Combine with Automated Effects

It's common to have both automated and manual effects:

```json
"modifiers": [
  {
    "name": "Panic",
    "resource": "unrest",
    "value": 3,
    "duration": "immediate"
  },
  {
    "name": "Lose 1d3 hexes (roll and remove from map)",
    "resource": "manual",
    "value": 0,
    "duration": "immediate"
  }
]
```

The unrest will be applied automatically, while the hex loss is manual.

## Migration from Old System

If you previously put complex effects only in the `msg` field:

**Before:**
```json
{
  "failure": {
    "msg": "The plague spreads! Lose 1d3 hexes. +2 Unrest.",
    "modifiers": [
      {
        "name": "Disease Panic",
        "resource": "unrest",
        "value": 2,
        "duration": "immediate"
      }
    ]
  }
}
```

**After:**
```json
{
  "failure": {
    "msg": "The plague spreads across your farmlands!",
    "modifiers": [
      {
        "name": "Disease Panic",
        "resource": "unrest",
        "value": 2,
        "duration": "immediate"
      },
      {
        "name": "Lose 1d3 hexes of farmland",
        "resource": "manual",
        "value": 0,
        "duration": "immediate"
      }
    ]
  }
}
```

## Examples

### Example 1: Hex Loss
```json
{
  "name": "Lose 1d3 hexes of farmland (roll 1d3 and remove from map)",
  "resource": "manual",
  "value": 0,
  "duration": "immediate"
}
```

### Example 2: Settlement Status
```json
{
  "name": "Mark your capital as 'Under Siege' (no civic actions for 1 turn)",
  "resource": "manual",
  "value": 0,
  "duration": "immediate"
}
```

### Example 3: Structure Loss
```json
{
  "name": "Remove one random Luxury or Trade structure from your kingdom",
  "resource": "manual",
  "value": 0,
  "duration": "immediate"
}
```

### Example 4: Complex Conditional
```json
{
  "name": "If you have a Temple, lose it; otherwise lose 20 gold instead",
  "resource": "manual",
  "value": 0,
  "duration": "immediate"
}
```

## Summary

Manual effects provide a clean, structured way to communicate complex game effects that require GM or player intervention. They're displayed prominently, skipped during automatic resource application, and give clear instructions to players on what they need to do.
