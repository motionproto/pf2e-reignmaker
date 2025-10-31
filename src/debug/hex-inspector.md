# Hex Inspector

Interactive tool for viewing hex properties from the Kingdom Store.

## Purpose

Click on any hex on the map to see detailed information about its properties, including terrain, claims, features, settlements, and adjacent hexes.

## Prerequisites

1. Load Foundry VTT with the Reignmaker module enabled
2. Open a scene with the Kingmaker map
3. Open browser console (F12 → Console tab)

## Available Commands

```javascript
// Enable hex inspection mode (click hexes to see data)
game.reignmaker.hexInspector.enable();

// Disable hex inspection mode
game.reignmaker.hexInspector.disable();
```

## Usage Flow

```javascript
// 1. Enable inspector
game.reignmaker.hexInspector.enable();

// 2. Click on any hex on the map
// Console displays detailed hex information

// 3. When finished inspecting
game.reignmaker.hexInspector.disable();
```

## What It Shows

When you click a hex, the console displays:

### 🗺️ Hex Properties
- **ID** - Hex identifier (e.g., "50.18")
- **Row/Col** - Grid coordinates
- **Terrain** - Terrain type (plains, forest, hills, etc.)
- **Travel** - Travel difficulty type
- **Claimed By** - Kingdom ownership (null = wilderness)
- **Has Road** - Whether hex has roads
- **Fortified** - Fortification level
- **Name** - Custom hex name (if any)

### 🏗️ Worksite (if present)
- **Type** - Worksite resource type

### 💎 Commodities (if present)
- Resource amounts available in hex

### 🏛️ Features (if present)
- **Type** - Feature type
- **Name** - Feature name
- **Tier** - Feature tier
- **Linked** - Whether linked to settlement
- **Settlement ID** - Associated settlement (if any)

### 🏘️ Settlement (if present)
- **Name** - Settlement name
- **ID** - Settlement identifier
- **Tier** - Settlement tier (village/town/city/metropolis)
- **Level** - Settlement level
- **Owned By** - Settlement owner

### 🧭 Adjacent Hexes
- Lists all neighboring hexes with:
  - Hex ID
  - Terrain type
  - Claimed status
  - Road status
  - Settlement (if any)

### 📦 Raw Hex Object
- Complete hex data object for debugging

## Example Output

```
═══════════════════════════════════════════════════
📍 HEX INSPECTOR: 50.18
═══════════════════════════════════════════════════

🗺️  HEX PROPERTIES:
   ID: 50.18
   Row: 50   Col: 18
   Terrain: plains
   Travel: normal
   Claimed By: 1
   Has Road: true
   Fortified: 0
   Name: (unnamed)

🏘️  SETTLEMENT:
   Name: Tuskwater
   ID: settlement-1
   Tier: town
   Level: 5
   Owned By: 1

🧭 ADJACENT HEXES (Foundry API):
   [0] 49.18 (forest) → claimed, road
   [1] 50.17 (plains) → claimed
   [2] 51.18 (hills)
   [3] 50.19 (plains) → claimed, road
   [4] 49.19 (forest)
   [5] 51.19 (plains)

📦 RAW HEX OBJECT:
{ id: '50.18', row: 50, col: 18, ... }

═══════════════════════════════════════════════════
```

## Use Cases

- **Debug hex claiming** - Verify which kingdom owns a hex
- **Check road status** - Confirm road placement
- **Inspect settlements** - View settlement data and location
- **Verify features** - Check worksites, commodities, special features
- **Analyze adjacency** - See neighboring hex relationships
- **Troubleshoot sync** - Compare expected vs actual hex data

## Troubleshooting

### "Canvas not available" Error
**Cause:** No scene is loaded  
**Fix:** Load a scene with the Kingmaker map

### "Hex not found in kingdom data" Warning
**Cause:** Hex hasn't been imported from Kingmaker yet  
**Fix:** This is normal for unexplored/unimported hexes. Only imported hexes appear in the Kingdom Store.

### Inspector doesn't respond to clicks
**Cause:** Inspector not enabled or conflicting click handlers  
**Fix:** 
1. Ensure you ran `enable()` command
2. Try disabling and re-enabling
3. Reload the module if persists

## Development Notes

### Data Source
- Reads from `KingdomStore.kingdomData.hexes`
- Does NOT modify any data (read-only)

### Click Handling
- Uses Foundry's canvas stage click events
- Converts click position to hex offset coordinates
- Safe to use alongside other canvas interactions

### Performance
- Minimal overhead (only logs on click)
- No continuous polling or rendering
- Can be left enabled during normal gameplay

---

**Remember:** This is a **development tool only**. It's safe to use during gameplay but intended for debugging and verification purposes.
