# Repair Structure Action

**Category:** Urban Planning  
**Status:** ✅ Complete

## Description

Allows players to repair damaged structures by choosing between a dice-roll cost or paying half the original build cost.

## Files

- **`RepairStructureAction.ts`** - Business logic and cost calculation
- **`RepairCostChoice.svelte`** - UI for cost selection (dice vs half cost)
- **`RepairStructureDialog.svelte`** - Pre-roll structure selection dialog

## Requirements

- At least one damaged structure exists in the kingdom

## Custom Resolution

Shows cost choice UI on **success** outcome only:
- **Success:** Choose between `1d4` gold OR half build cost (lumber/stone)
- **Critical Success:** Free repair (no UI needed, handled by gameEffects)

## Special Behavior

If player cannot afford selected cost:
- Structure is NOT repaired
- Unrest increases by 1
- Warning notification shown

## Documentation

See: [public/Action Implementation/urban-planning/repair-structure.md](../../../public/Action%20Implementation/urban-planning/repair-structure.md)

## Data

JSON: `data/player-actions/repair-structure.json`
