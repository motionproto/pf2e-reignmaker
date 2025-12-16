# Balance Table Sync - Complete ✅

**Date:** December 15, 2025

## Summary

Successfully synchronized all 34 event pipelines with `EVENT_BALANCE_TABLE.csv` using a systematic, script-driven approach.

## What Was Updated

### 1. Approach Labels
- Updated all approach labels to match the "Approach Descriptor" column from the balance table
- Examples:
  - Criminal Trial: "Show Mercy", "Fair Trial", "Harsh Punishment"
  - Feud: "Mediate Peacefully", "Manipulate Outcome", "Force Compliance"
  - Military Exercises: "Defensive Drills", "Equipment Focus", "Aggressive Training"

### 2. Outcome Badges
- Updated all `outcomeBadges` arrays for each approach/outcome combination
- Generated TypeScript badge code from CSV data:
  - `valueBadge()` for static values (Gold, Fame, Unrest)
  - `diceBadge()` for dice formulas (1d3, 2d4, etc.)
  - `textBadge()` for game commands (Army conditions, Faction changes, etc.)

### 3. Strategic Choice Implementation
- Added strategic choice pattern to **Military Exercises** (was the only event missing it)
- All 34 events now use the standard `virtuous`, `practical`, `ruthless` approach IDs
- All events have 3 approaches with distinct outcomes

## Script-Driven Approach

Created automated Python scripts to ensure accuracy and consistency:

### `sync-balance-table.py`
Main synchronization script that:
1. Parses `EVENT_BALANCE_TABLE.csv`
2. Generates TypeScript badge code for each outcome
3. Updates approach labels in event files
4. Updates outcomeBadges arrays in event files
5. Saves parsed data to `balance-table-parsed.json`

### Results
```
Events processed: 33 (excluding removed Scholarly Discovery)
Approach labels updated: 92
Outcome badges updated: 280
Errors: 0
```

## Events Synchronized

All 34 events from the balance table are now synchronized:

1. ✅ Criminal Trial
2. ✅ Feud
3. ✅ Inquisition
4. ✅ Public Scandal
5. ✅ Plague
6. ✅ Food Shortage
7. ✅ Natural Disaster
8. ✅ Immigration
9. ✅ Assassination Attempt
10. ✅ Crime Wave
11. ✅ Notorious Heist
12. ✅ Bandit Activity
13. ✅ Raiders
14. ✅ Trade Agreement
15. ✅ Economic Surge
16. ✅ Food Surplus
17. ✅ Boomtown
18. ✅ Land Rush
19. ✅ Pilgrimage
20. ✅ Diplomatic Overture
21. ✅ Festive Invitation
22. ✅ Visiting Celebrity
23. ✅ Grand Tournament
24. ✅ Archaeological Find
25. ✅ Magical Discovery
26. ✅ Remarkable Treasure
27. ❌ Scholarly Discovery (removed as requested)
28. ✅ Nature's Blessing
29. ✅ Good Weather
30. ✅ Military Exercises (newly implemented)
31. ✅ Drug Den
32. ✅ Monster Attack
33. ✅ Undead Uprising
34. ✅ Cult Activity

## Excluded Events

Two events are correctly excluded from strategic choices:
- **Demand Expansion** - Uses hex selection mechanic
- **Demand Structure** - Uses structure selection mechanic

## Badge Generation Examples

### Static Values
```typescript
valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
valueBadge('Reduce Unrest by {{value}}', 'fas fa-exclamation-triangle', 1, 'positive')
```

### Dice Formulas
```typescript
diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
diceBadge('Lose {{value}} Food', 'fas fa-wheat', '1d3', 'negative')
```

### Game Commands
```typescript
textBadge('Army becomes Well Trained', 'fas fa-shield', 'positive')
textBadge('Faction attitude +1', 'fas fa-handshake', 'positive')
textBadge('Fortify hex', 'fas fa-fort', 'positive')
```

### Dynamic Badges (Generated in Preview)
Some effects generate badges dynamically:
- `Convert` - ConvertUnrestToImprisonedHandler
- `Pardon` - ReduceImprisonedHandler
- `Damage Structure` - DamageStructureHandler
- `Innocents` - Game command handlers

## Files Modified

### Event Pipelines
All 33 event files in `src/pipelines/events/` updated with correct:
- Approach labels
- OutcomeBadges arrays
- Military Exercises converted to strategic choice pattern

### Supporting Files
- `buildscripts/sync-balance-table.py` - Main sync script
- `docs/planning/balance-table-parsed.json` - Parsed CSV data
- `buildscripts/balance-table-output.txt` - Generated TypeScript code reference

## Verification

To verify sync status, run:
```bash
cd buildscripts
python3 sync-balance-table.py
```

Expected output: All events show "Already in sync" or "Updated X outcomes"

## Next Steps

The balance table sync is complete. All events now have:
1. ✅ Correct approach labels from balance table
2. ✅ Correct outcome values from balance table
3. ✅ Strategic choice pattern (except demand events)
4. ✅ Consistent badge formatting

The event system is now fully aligned with the game design specifications in `EVENT_BALANCE_TABLE.csv`.
