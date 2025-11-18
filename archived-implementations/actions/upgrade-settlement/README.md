# Upgrade Settlement Action

**Category:** Urban Planning  
**Status:** ✅ Complete

## Description

Allows players to increase settlement levels with automatic tier transitions when structure requirements are met.

## Files

- **`UpgradeSettlementAction.ts`** - Business logic and tier validation
- **`UpgradeSettlementDialog.svelte`** - Main settlement selection dialog
- **`UpgradeSettlementSelectionDialog.svelte`** - Settlement picker UI
- **`UpgradeSettlementConfirmDialog.svelte`** - Confirmation dialog

## Requirements

- At least one settlement meets structure requirements for next tier:
  - **Village → Town:** 2+ structures
  - **Town → City:** 4+ structures
  - **City → Metropolis:** 8+ structures
- Sufficient gold to pay for upgrade (cost = current level + 1)

## Tier Transitions

Settlements automatically upgrade tier when level reaches threshold AND structure requirements are met.

## Custom Resolution

Uses pre-roll dialog for settlement selection (no custom resolution component needed - standard outcome display).

## Documentation

See: [public/Action Implementation/urban-planning/upgrade-settlement.md](../../../public/Action%20Implementation/urban-planning/upgrade-settlement.md)

## Data

JSON: `data/player-actions/upgrade-settlement.json`
