# Army Movement Testing

Test army movement pathfinding, reachability calculations, and movement costs.

## Purpose

Interactive tool for testing the army movement system, including:
- Pathfinding algorithm (A* with terrain costs)
- Movement cost calculations (roads, terrain types)
- Reachability within movement budget
- Interactive movement mode UI

## Prerequisites

1. Load Foundry VTT with the Reignmaker module enabled
2. Open a scene with the Kingmaker map
3. Have at least one army created in your kingdom
4. Open browser console (F12 → Console tab)

## Understanding Army IDs

**What is an Army ID?**
- Each army has a unique identifier (UUID) like `'army-abc123'` or `'kDjF92hsPq'`
- Army IDs are stored in kingdom data: `kingdom.armies[].id`

**How to find Army IDs:**

```javascript
// List all armies with their IDs and locations
const kingdom = await game.reignmaker.getKingdomActor().getKingdomData();
kingdom.armies.forEach(army => {
  console.log(`${army.name}: ${army.id} (at hex ${army.location.hexId})`);
});

// Or use this shortcut to just see army names and IDs
const kingdom = await game.reignmaker.getKingdomActor().getKingdomData();
console.table(kingdom.armies.map(a => ({ name: a.name, id: a.id, hex: a.location.hexId })));
```

**💡 TIP: Use `'test'` instead!**
- Don't want to look up IDs? Just use `'test'` as the army ID
- This automatically selects the first available army
- Example: `game.reignmaker.testArmyMovement('test', '6.19')`

## Available Commands

```javascript
// ⭐ EASIEST: Select an army token on the map, then run this
game.reignmaker.testArmyMovementFromSelection();

// Or test army movement mode with specific parameters
game.reignmaker.testArmyMovement('army-id', '6.19');

// Use 'test' to automatically pick the first available army
game.reignmaker.testArmyMovement('test', '6.19');

// Deactivate movement mode
game.reignmaker.deactivateArmyMovement();

// Test pathfinding calculations (non-interactive)
game.reignmaker.testPathfinding('6.19', '8.21', 20);
// Parameters: startHex, targetHex, maxMovement (default: 20)

// Get movement cost for a specific hex
game.reignmaker.getHexMovementCost('6.19');

// List all reachable hexes from a position
game.reignmaker.listReachableHexes('6.19', 20);
// Parameters: startHex, maxMovement (default: 20)
```

## Usage Examples

### ⭐ RECOMMENDED: Using Selected Token (Easiest!)

```javascript
// 1. Select an NPC token linked to an army on the map
// 2. Run the test command
game.reignmaker.testArmyMovementFromSelection();

// The function automatically:
// - Gets the army ID from the NPC actor's army-metadata flag
// - Detects the token's hex location
// - Activates movement mode

// When done:
game.reignmaker.deactivateArmyMovement();
```

**Note:** This requires an NPC token that's already linked to an army (via the Armies tab). If the selected token is not linked, you'll get an error message.

### Alternative: Manual Army/Hex Specification

```javascript
// Activate movement mode for a specific army
game.reignmaker.testArmyMovement('army-abc123', '6.19');

// Or use the first available army
game.reignmaker.testArmyMovement('test', '6.19');

// Now hover over hexes to see paths, click to move
// When done:
game.reignmaker.deactivateArmyMovement();
```

### Pathfinding Analysis

```javascript
// Test if a path exists between two hexes
game.reignmaker.testPathfinding('6.19', '10.23', 15);
// Logs: path hexes, costs, and reachability

// Check cost of a single hex
game.reignmaker.getHexMovementCost('7.20');
// Logs: movement cost (considers terrain, roads, etc.)

// See all hexes reachable within movement range
game.reignmaker.listReachableHexes('6.19', 20);
// Logs: sorted list of hexes with their movement costs
```

## What It Tests

- ✅ Pathfinding algorithm (A* with terrain costs)
- ✅ Movement cost calculations (roads, terrain types)
- ✅ Reachability within movement budget
- ✅ Interactive movement mode UI
- ✅ Token-to-army linking
- ✅ Hex coordinate conversions

## Interactive Movement Mode

When movement mode is active:

1. **Hover over hexes** - See the path and movement cost
2. **Green highlight** - Hex is reachable within movement budget
3. **Red highlight** - Hex is too far away
4. **Click to move** - Move army to the clicked hex (if reachable)
5. **Path visualization** - See the complete path from start to destination

## Troubleshooting

### "Canvas not ready" Error
**Cause:** No scene is loaded  
**Fix:** Load a scene with the Kingmaker map

### "No armies found" Error
**Cause:** No armies exist in kingdom data  
**Fix:** Create an army first through the Kingdom UI

### "Selected token is not linked to an army" Error
**Cause:** The selected NPC token doesn't have the `army-metadata` flag  
**Fix:** 
1. Link the NPC actor to an army in the Armies tab
2. Or select a different token that's already linked
3. Or use manual specification with army ID

### "Game not ready" Warning
**Cause:** Foundry VTT not fully initialized  
**Fix:** Wait for Foundry to fully load, then reload the module

### Functions Not Available
**Cause:** Debug utilities not registered  
**Fix:** 
1. Check browser console for registration messages
2. Reload the module/page
3. Ensure `registerDebugUtils()` is called in main initialization

### Movement mode doesn't deactivate
**Cause:** Event listeners still active  
**Fix:** Run the deactivate command explicitly:
```javascript
game.reignmaker.deactivateArmyMovement();
```

## Development Notes

### Movement Costs

The system calculates movement costs based on:
- **Terrain type** - Different costs for plains, forest, hills, mountains, etc.
- **Roads** - Reduced movement cost on hexes with roads
- **Difficult terrain** - Higher costs for challenging terrain

### Pathfinding Algorithm

- Uses **A* pathfinding** for optimal route finding
- Considers actual terrain costs (not just distance)
- Respects movement budget constraints
- Finds shortest path by movement cost (not hex count)

### Performance

- Pathfinding is fast for typical kingdom sizes (100-500 hexes)
- Movement mode adds hover listeners (minimal overhead)
- Deactivate when not needed to avoid unnecessary event handling

---

**Remember:** This is a **development tool only**. It bypasses normal game flow and should not be used in production gameplay.
