# Establish Settlement Action

**Category:** Urban Planning  
**Status:** ✅ Complete

## Description

Allows players to found new village-tier settlements with custom naming and optional bonus structure on critical success.

## Files

- **`EstablishSettlementAction.ts`** - Business logic and settlement creation
- **`EstablishSettlementDialog.svelte`** - Settlement naming and bonus structure selection UI

## Requirements

- No specific pre-requirements (manual validation for hex spacing on map)
- Settlements should be placed 4+ hexes apart (validated manually via Kingmaker hex map)

## Custom Resolution

Shows naming dialog on **success** and **critical success**:
- **Success:** Enter settlement name
- **Critical Success:** Enter name + select one free structure

## Workflow

1. Player selects "Establish Settlement" action
2. Makes skill check
3. On success: Dialog appears for naming
4. Settlement created at location `{x: 0, y: 0}` (unmapped - must be placed on Kingmaker hex map)
5. On critical success: Bonus structure added automatically

## Documentation

See: [public/Action Implementation/urban-planning/establish-settlement.md](../../../public/Action%20Implementation/urban-planning/establish-settlement.md)

## Data

JSON: `data/player-actions/establish-settlement.json`
