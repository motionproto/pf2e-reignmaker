# Arrest Dissidents Action

**Category:** Uphold Stability  
**Status:** ✅ Complete

## Description

Allows players to convert unrest into imprisoned unrest by allocating it to settlements with justice structures (dungeons, prisons, etc.).

## Files

- **`ArrestDissidentsAction.ts`** - Business logic and requirements checking
- No custom UI components (uses generic allocation UI)

## Requirements

- Kingdom must have unrest > 0
- At least one justice structure with available capacity

## Custom Resolution

Shows allocation interface on success/critical success outcomes.

## Documentation

See: [public/Action Implementation/uphold-stability/arrest-dissidents.md](../../../public/Action%20Implementation/uphold-stability/arrest-dissidents.md)

## Data

JSON: `data/player-actions/arrest-dissidents.json`
