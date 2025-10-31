# Debug Utilities

This folder contains debug scripts for testing various Reignmaker features in the browser console.

## Prerequisites

1. Load Foundry VTT with the Reignmaker module enabled
2. Open a scene with the Kingmaker map
3. Open browser console (F12 → Console tab)

---

## 🚀 Army Movement Testing (`armyMovement.ts`)

Test army movement pathfinding, reachability calculations, and movement costs.

### Understanding Army IDs

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

### Available Commands

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

### Usage Examples

**⭐ RECOMMENDED: Using Selected Token (Easiest!)**
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

**Alternative: Manual Army/Hex Specification**
```javascript
// Activate movement mode for a specific army
game.reignmaker.testArmyMovement('army-abc123', '6.19');

// Or use the first available army
game.reignmaker.testArmyMovement('test', '6.19');

// Now hover over hexes to see paths, click to move
// When done:
game.reignmaker.deactivateArmyMovement();
```

**Pathfinding Analysis:**
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

### What It Tests

- ✅ Pathfinding algorithm (A* with terrain costs)
- ✅ Movement cost calculations (roads, terrain types)
- ✅ Reachability within movement budget
- ✅ Interactive movement mode UI

---

## 🎯 Hex Center Testing (`hex-center-test.ts`)

Verify the accuracy of hex center point calculations using Foundry's grid API.

### Available Commands

```javascript
// Activate hex center test mode (click hexes to place markers)
game.reignmaker.testHexCenter();

// Clear all test markers from the canvas
game.reignmaker.clearHexCenterTest();

// Deactivate test mode (stop listening for clicks)
game.reignmaker.deactivateHexCenterTest();
```

### Usage Flow

```javascript
// 1. Activate test mode
game.reignmaker.testHexCenter();

// 2. Click on hexes to place red crosshair markers at their centers
// Each marker shows the hex ID (e.g., "50.18")

// 3. Clear markers to test new hexes
game.reignmaker.clearHexCenterTest();

// 4. When finished testing
game.reignmaker.deactivateHexCenterTest();
```

### What It Tests

- ✅ Hex center point accuracy (using `canvas.grid.getCenterPoint()`)
- ✅ Hex offset calculations (i, j coordinates)
- ✅ Visual verification of center positions
- ✅ Grid coordinate system consistency

### Visual Markers

Each marker displays:
- Red crosshair (±20px from center)
- Center dot (4px radius, filled red)
- Outer white ring (6px radius for contrast)
- Hex ID label (above marker)

---

## 🔲 Hex Selector Testing (`hex-selector-test.ts`)

Test the hex selector UI without going through the full action flow.

### Available Command

```javascript
testHexSelector(count, type);
// count: number of hexes to select (default: 3)
// type: 'claim' | 'road' | 'settlement' | 'scout' (default: 'claim')
```

### Usage Examples

```javascript
// Select 3 hexes with claim styling (green)
testHexSelector();

// Select 5 hexes with claim styling
testHexSelector(5);

// Select 2 hexes with road styling (brown)
testHexSelector(2, 'road');

// Select 1 hex with settlement styling (blue)
testHexSelector(1, 'settlement');

// Select 4 hexes with scout styling (yellow)
testHexSelector(4, 'scout');
```

### What It Tests

- ✅ Hex selector dialog UI
- ✅ Color schemes for different action types
- ✅ Multi-hex selection logic
- ✅ Selection confirmation/cancellation
- ✅ Hex ID return values

### Expected Behavior

1. Dialog opens with instructions
2. Click hexes on the map (up to `count`)
3. Selected hexes highlight with color based on `type`
4. Click "Confirm" or "Cancel"
5. Returns array of hex IDs (e.g., `['50.18', '51.19']`) or `null` if cancelled

---

## 🛠️ Common Troubleshooting

### "Canvas not ready" Error
**Cause:** No scene is loaded  
**Fix:** Load a scene with the Kingmaker map

### "No armies found" Error
**Cause:** No armies exist in kingdom data  
**Fix:** Create an army first through the Kingdom UI

### "Selected token is not linked to an army" Error
**Cause:** The selected NPC token doesn't have the `army-metadata` flag  
**Fix:** Link the NPC actor to an army in the Armies tab, or select a different token that's already linked

### "Game not ready" Warning
**Cause:** Foundry VTT not fully initialized  
**Fix:** Wait for Foundry to fully load, then reload the module

### Functions Not Available
**Cause:** Debug utilities not registered  
**Fix:** 
1. Check browser console for registration messages
2. Reload the module/page
3. Ensure `registerDebugUtils()` is called in main initialization

---

## 📋 Development Notes

### Registration

These debug utilities are automatically registered when the module initializes:

- `armyMovement.ts` → `registerDebugUtils()` → `game.reignmaker.*`
- `hex-center-test.ts` → `registerHexCenterTestUtils()` → `game.reignmaker.*`
- `hex-selector-test.ts` → `globalThis.testHexSelector`

### Adding New Debug Scripts

1. Create a new `.ts` file in `src/debug/`
2. Export your debug functions
3. Create a registration function (if using `game.reignmaker` namespace)
4. Call registration in module initialization (`src/main.kingdom.ts` or `src/index.ts`)
5. Document the new script in this README

### Best Practices

- ✅ Use descriptive console logs with emoji indicators (✅ ❌ 🧪 🎯)
- ✅ Provide clear error messages with suggested fixes
- ✅ Show Foundry UI notifications for user feedback
- ✅ Clean up resources (event listeners, PIXI containers) on deactivation
- ✅ Support both interactive and non-interactive testing modes

---

## 🔍 Quick Reference

| Feature | Command | Purpose |
|---------|---------|------------|
| Army Movement (Easy) | `game.reignmaker.testArmyMovementFromSelection()` | ⭐ Select NPC token linked to army, auto-detects everything |
| Army Movement | `game.reignmaker.testArmyMovement('test', '6.19')` | Test pathfinding with manual parameters |
| Pathfinding | `game.reignmaker.testPathfinding('6.19', '8.21', 20)` | Analyze path calculations |
| Hex Centers | `game.reignmaker.testHexCenter()` | Verify center point accuracy |
| Hex Selector | `testHexSelector(3, 'claim')` | Test hex selection UI |

---

**Remember:** These are **development tools only**. They bypass normal game flow and should not be used in production gameplay.
