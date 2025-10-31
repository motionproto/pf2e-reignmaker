# Check Hex Data

Utility for comparing hex data between Kingmaker module and Kingdom Store.

## Purpose

Verify data consistency and troubleshoot sync issues by comparing the same hex across two data sources:
- **Kingmaker module** - Source of truth for map/hex state
- **Kingdom Store** - Reignmaker's internal state

## Prerequisites

1. Load Foundry VTT with both Kingmaker and Reignmaker modules enabled
2. Open a scene with the Kingmaker map
3. Open browser console (F12 → Console tab)

## Available Command

```javascript
// Check hex data across both sources
game.reignmaker.checkHexData(hexId);
// hexId: Hex identifier in dot notation (e.g., '50.18')
```

## Usage Examples

```javascript
// Check a specific hex
game.reignmaker.checkHexData('50.18');

// Check multiple hexes
game.reignmaker.checkHexData('6.19');
game.reignmaker.checkHexData('7.20');
game.reignmaker.checkHexData('8.21');
```

## What It Shows

The command displays data from both sources side-by-side:

### [KINGMAKER] Data
- **claimed** - Whether hex is claimed
- **features** - Array of features (roads, worksites, etc.)
- **camp** - Whether hex has a camp
- **HAS ROAD IN KINGMAKER** - Boolean road check

### [KINGDOM STORE] Data
- **terrain** - Terrain type
- **travel** - Travel difficulty
- **hasRoad** - Road status (boolean)
- **features** - Feature array
- **claimedBy** - Kingdom ownership ID

## Example Output

```
========== HEX 50.18 DATA CHECK ==========

[KINGMAKER] Hex 50.18 (key 50018):
  claimed: true
  features: [{ type: 'road', direction: 'ne' }, { type: 'worksite', resource: 'lumber' }]
  camp: false
  HAS ROAD IN KINGMAKER: true

[KINGDOM STORE] Hex 50.18:
  terrain: plains
  travel: normal
  hasRoad: true
  features: [{ type: 'road', direction: 'ne' }, { type: 'worksite', resource: 'lumber' }]
  claimedBy: 1

========== END HEX DATA CHECK ==========
```

## Use Cases

- **Debug sync issues** - Compare data after import/sync operations
- **Verify road status** - Confirm roads exist in both sources
- **Check claim status** - Verify hex ownership matches
- **Troubleshoot features** - Ensure worksites/features are synced correctly
- **Validate imports** - Confirm initial Kingmaker data import worked

## Understanding Hex Keys

**Reignmaker format:** Dot notation (e.g., `'50.18'`)
**Kingmaker format:** Integer key (e.g., `50018`)

The utility automatically converts between formats:
```javascript
// Reignmaker: '50.18' (row 50, col 18)
// Kingmaker:  50018   (row * 1000 + col)
```

## Troubleshooting

### "Kingmaker Not Available" Message
**Cause:** Kingmaker module not loaded or initialized  
**Fix:** 
1. Enable Kingmaker module in Foundry
2. Reload the world
3. Ensure Kingmaker has initialized (check console for startup messages)

### "No hex state in Kingmaker" Message
**Cause:** Hex hasn't been explored/claimed in Kingmaker  
**Fix:** This is normal for unexplored hexes. Kingmaker only tracks hexes that have been interacted with.

### "Not found in Kingdom Store" Message
**Cause:** Hex hasn't been imported to Reignmaker yet  
**Fix:** Run the territory sync:
```javascript
await game.reignmaker.territoryService.syncFromKingmaker();
```

### Mismatched Data
**Cause:** Out-of-sync data between modules  
**Symptoms:** 
- Road exists in Kingmaker but not Kingdom Store
- Claimed status differs between sources
- Features don't match

**Fix:**
```javascript
// Re-sync territory data
await game.reignmaker.territoryService.syncFromKingmaker();

// Then check again
game.reignmaker.checkHexData('50.18');
```

## Development Notes

### Data Flow
```
Kingmaker (source) → syncFromKingmaker() → Kingdom Store (derived)
```

**Important:** Kingmaker is read-only during gameplay. Don't write to Kingmaker directly - always update Kingdom Store, which may then update Kingmaker through defined sync operations.

### Coordinate Systems
- **Kingmaker:** Uses integer keys (`row * 1000 + col`)
- **Reignmaker:** Uses dot notation (`'row.col'`)
- This utility handles conversion automatically

### When to Use This Tool

**Use during:**
- Initial module setup and import
- Debugging territory issues
- Verifying action results (claim hex, build roads, etc.)
- After major updates to either module

**Don't use for:**
- Normal gameplay (use Hex Inspector instead)
- Performance-critical operations (it's a diagnostic tool)

---

**Remember:** This is a **development and diagnostic tool**. Use it to troubleshoot sync issues between Kingmaker and Reignmaker data sources.
