# Army Pathfinding System

**Status:** ✅ Implemented (Ready for Testing)

## Overview

The Army Pathfinding System provides A* pathfinding for army movement on the hex map, with visual path preview and movement range calculation based on terrain difficulty and roads.

## Features

- **A* Pathfinding** - Optimal path calculation using cube coordinates
- **Movement Range** - Calculates all reachable hexes within 20 movement points
- **Visual Preview** - Shows path with Bezier curves and endpoint indicators
- **Travel Costs** - Respects terrain difficulty and road bonuses
- **Interactive Mode** - Hover to preview, click to move

## Architecture

### Core Components

```
src/services/pathfinding/
├── index.ts           # PathfindingService (A* algorithm)
├── types.ts           # PathResult, CubeCoord, etc.
└── coordinates.ts     # Hex coordinate conversions

src/services/army/
└── movementMode.ts    # ArmyMovementMode (interactive handler)

src/services/map/renderers/
└── ArmyMovementRenderer.ts  # Visual rendering

src/debug/
└── armyMovement.ts    # Debug/testing utilities
```

### Data Flow

```
User clicks army token
  ↓
ArmyMovementMode.activateForArmy()
  ↓
PathfindingService.getReachableHexes() (Dijkstra)
  ↓
Render origin + range overlay
  ↓
User hovers hex
  ↓
PathfindingService.findPath() (A*)
  ↓
Render path preview + endpoint
  ↓
User clicks hex
  ↓
Move army (TODO)
```

## Movement Costs

Based on Pathfinder 2e Kingdom rules:

| Terrain | Base Cost | With Roads |
|---------|-----------|------------|
| Open    | 1         | 1          |
| Difficult | 2       | 1          |
| Greater Difficult | 3 | 2        |

**Roads reduce cost by 1 step (minimum 1)**

## Visual Layers

| Layer ID | Z-Index | Purpose |
|----------|---------|---------|
| `army-movement-range` | 12 | Light green overlay (reachable hexes) |
| `army-movement-path` | 48 | Green lines (path preview) |
| `army-movement-origin` | 49 | Green hex (starting position) |
| `army-movement-hover` | 50 | Circle/X indicator (endpoint) |

## Testing

### Browser Console Commands

```javascript
// Test with first available army at hex 50.18
game.reignmaker.testArmyMovement('test', '50.18');

// Test specific army
game.reignmaker.testArmyMovement('army-xyz-123', '50.18');

// Test pathfinding calculations only
game.reignmaker.testPathfinding('50.18', '52.20', 20);

// Get movement cost for a hex
game.reignmaker.getHexMovementCost('50.18');

// List all reachable hexes from position
game.reignmaker.listReachableHexes('50.18', 20);

// Deactivate movement mode
game.reignmaker.deactivateArmyMovement();
```

### Expected Behavior

1. **Activate Mode:**
   - Origin hex highlighted in green
   - Movement range shown as light green overlay
   - Notification: "Click a hex to move {army} (20 movement range)"

2. **Hover Valid Hex:**
   - Green path lines from origin to target
   - Green circle at endpoint
   - Path uses optimal route (lowest cost)

3. **Hover Invalid Hex:**
   - Red X indicator
   - No path lines
   - Hex is beyond 20 movement range

4. **Click Valid Hex:**
   - Notification shows movement cost
   - Mode deactivates
   - (TODO: Actually move army token)

## Coordinate Systems

### Dot Notation (Storage)
```
"50.18" = row 50, column 18
```

### Offset Coordinates (Foundry)
```
{i: 50, j: 18}
```

### Cube Coordinates (Pathfinding)
```
{x: col, y: -x-z, z: row - (col - (col & 1)) / 2}
```

Cube coordinates used for:
- Distance calculation: `(|dx| + |dy| + |dz|) / 2`
- Neighbor finding (6 directions)
- A* heuristic

## Algorithm Details

### A* Implementation

**Open Set:** Hexes to evaluate (priority queue by f-cost)  
**Closed Set:** Already evaluated hexes  
**g-cost:** Actual cost from start  
**h-cost:** Heuristic (cube distance to target)  
**f-cost:** g + h (total estimated cost)

### Dijkstra for Reachability

Used for calculating movement range (no target):
- Priority queue by actual cost
- Stops at max movement (20)
- Returns all reachable hexes with costs

### Path Reconstruction

Backtrack from target using parent pointers:
```
target → parent → parent → ... → start
```

## Integration Points

### Future: Token Click Hook

```typescript
// In src/hooks/armyActorHooks.ts or similar
Hooks.on('controlToken', async (token, controlled) => {
  if (!controlled) return;
  
  const isArmy = token.actor?.getFlag('pf2e-reignmaker', 'army-metadata');
  if (!isArmy) return;
  
  // Get hex ID from token position
  const hexId = getHexIdFromPosition(token.x, token.y);
  
  // Activate movement mode
  const { armyMovementMode } = await import('../services/army/movementMode');
  await armyMovementMode.activateForArmy(token.actor.id, hexId);
});
```

### Future: Deploy Army Action

```typescript
// Use pathfinding to validate deployment range
const reachable = pathfindingService.getReachableHexes(settlementHex, 20);
if (!reachable.has(targetHex)) {
  ui.notifications.error('Cannot deploy army that far from settlement');
  return;
}
```

## Performance Considerations

### Current Implementation
- **Reachability:** O(n log n) where n = reachable hexes (~300 for 20 movement)
- **Pathfinding:** O(n log n) where n = explored hexes (~100-200 typical)
- **Simple Array Sort:** Used for priority queue (adequate for small n)

### Future Optimizations (if needed)
- Binary heap priority queue
- JPS (Jump Point Search) for uniform-cost grids
- Bidirectional A*

## Known Limitations

1. **No Actual Movement** - Click handler doesn't move tokens yet (TODO)
2. **Single Army** - Can only move one army at a time
3. **No Obstacles** - Doesn't check for blocked hexes (all hexes passable if in data)
4. **Static Cost** - Movement costs don't change during session (need refresh)

## Next Steps

1. **Test Calculations** - Verify costs, paths, reachability
2. **Test Rendering** - Check visual appearance, layers
3. **Implement Token Movement** - Actually move army on click
4. **Add Token Click Hook** - Auto-activate on army selection
5. **Deploy Army Integration** - Use pathfinding in deploy action

## References

- [Red Blob Games: Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/)
- [Red Blob Games: A* Pathfinding](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [PF2e Kingdom Building Rules](https://2e.aonprd.com/Rules.aspx?ID=1839)
