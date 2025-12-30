# Army Movement System

**Status:** Implemented
**Last Updated:** 2024-12-30

## Overview

The Army Movement System provides hex-based pathfinding for army tokens on the kingdom map. It features a multi-layered architecture with cell-based A* pathfinding, precomputed terrain costs, river blocking detection, and interactive waypoint-based movement.

## Architecture

The system is built on five layers:

| Layer | Purpose | Key File |
|-------|---------|----------|
| **Pathfinding** | A* algorithm on cell grid | `src/services/pathfinding/index.ts` |
| **Navigation Grid** | 8x8 pixel cells for river blocking | `src/services/pathfinding/NavigationGrid.ts` |
| **Movement Graph** | Precomputed hex edges with terrain costs | `src/services/pathfinding/MovementGraph.ts` |
| **Waterway Lookup** | Rivers, crossings, flow direction | `src/services/pathfinding/WaterwayLookup.ts` |
| **Interactive UI** | Path visualization & waypoints | `src/services/army/movementMode.ts` |

## Directory Structure

```
src/services/pathfinding/
├── index.ts                 # PathfindingService - A* algorithm
├── NavigationGrid.ts        # 8x8 cell grid + river detection
├── MovementGraph.ts         # Hex graph + edge costs
├── WaterwayLookup.ts        # Water feature detection
├── WaterwayGeometryService.ts
├── coordinates.ts           # Coordinate conversions
└── types.ts                 # PathResult, HexNode, EdgeData

src/services/army/
├── movementMode.ts          # Interactive movement UI
├── ArmyDeploymentPanel.ts   # Deployment panel component
└── tokenAnimation.ts        # Token movement animation

src/services/map/renderers/
└── ArmyMovementRenderer.ts  # PIXI graphics rendering

src/utils/
├── armyMovementRange.ts     # Movement range calculation
└── armyMovementTraits.ts    # Movement capability detection

src/debug/
└── armyMovement.ts          # Debug/testing utilities
```

## Key Design Decisions

### Cell-Based A* with Hex Costing

The pathfinding uses a fine-grained 8x8 pixel grid for precise river detection, but **charges movement cost only when entering a new hex**. This allows:
- Precise detection of river crossings at cell level
- Correct hex-based movement costs per PF2e rules
- Handling of diagonal movement that might "slip through" rivers

### NavCell Tracking

Armies store `navCellX`/`navCellY` to remember their exact position within a hex. This is critical for:
- Pathfinding to continue from the correct entry point
- Multi-river scenarios where approach direction matters
- Accurate path continuation after waypoints

### Precomputed Movement Graph

`MovementGraph` caches hex nodes and edges with precomputed costs:
- Rebuilds reactively when kingdom data changes (via hash detection)
- Edge data includes terrain costs, river crossings, bridges, waterfalls
- Supports different costs for grounded, flying, and swimming units

## Movement Costs

### Terrain (Land Units)

| Terrain | Base Cost | With Road |
|---------|-----------|-----------|
| Open/Plains | 1 | 1 |
| Difficult | 2 | 1 |
| Greater Difficult | 3 | 2 |
| Lake/Water | Blocked | Blocked |
| Swamp | +1 | +1 |

### Special Movement Types

| Type | Behavior |
|------|----------|
| **Flying** | Cost = 1 for all terrain, ignores rivers |
| **Swimming** | Lake/Swamp cost = 1-2, can traverse water hexes |
| **Boats** | Naval movement on water |
| **Amphibious** | Uses minimum of land and water cost |

### River Crossing

- **Without bridge/ford:** Blocked (cost = infinity)
- **With crossing:** Passable (normal terrain cost applies)
- **Upstream:** +1 penalty when moving against river flow

## Movement Traits

Movement capabilities are read from the linked NPC actor's speed data:

```typescript
interface ArmyMovementTraits {
  canFly: boolean;      // Ignores terrain (cost = 1)
  canSwim: boolean;     // Water hexes cost 1
  hasBoats: boolean;    // Naval movement
  amphibious: boolean;  // Chooses best of land/water
}
```

Movement range = `floor(actor.speed / 2)` (default: 20 if no actor)

## Data Flow

### Movement Activation

```
Token Click
    ↓
ArmyMovementMode.activateForArmy(armyId, hexId)
    ↓
Get navCell position (from army.navCellX/Y or find passable cell)
    ↓
PathfindingService.getReachableHexes() [Dijkstra from current position]
    ↓
Display range overlay (NavigationGrid checks water blocking)
```

### Path Preview (Hover)

```
Mouse hover over hex
    ↓
PathfindingService.findPath(startHex, targetHex, maxMovement)
    ↓
A* on cell grid (8x8 resolution)
    ↓
Hex cost charged only on hex transitions
    ↓
Render path line + endpoint indicator (green circle or red X)
```

### Waypoint System

```
Click on valid hex
    ↓
Add waypoint, update navCell to final cell position
    ↓
Recalculate reachable hexes from new position
    ↓
Remaining movement = original - path cost
```

### Movement Execution

```
Finalize path
    ↓
deployArmyExecution()
    ↓
Animate token along hex path
    ↓
Update army position and navCellX/navCellY in kingdom data
```

## Visual Layers

| Layer | Z-Index | Purpose |
|-------|---------|---------|
| origin | 10000 | Green hex highlight (starting position) |
| range | 9900 | Diagonal stripe overlay (reachable hexes) |
| waypoints | 9800 | Green circles with numbers |
| path | 9700 | Green connecting lines |
| hover | 9600 | Endpoint indicator (circle or X) |
| cellpath | 9500 | Debug A* cell path visualization |

## Console Debug Commands

### Movement Mode

```javascript
// Activate for selected token (easiest method)
game.reignmaker.testArmyMovementFromSelection()

// Activate for specific army at hex
game.reignmaker.testArmyMovement('army-id', '50.18')

// Use first available army at hex
game.reignmaker.testArmyMovement('test', '50.18')

// Deactivate movement mode
game.reignmaker.deactivateArmyMovement()
```

### Pathfinding Tests

```javascript
// Test path between two hexes (no visual)
game.reignmaker.testPathfinding('50.18', '52.20', 20)

// List all reachable hexes from position
game.reignmaker.listReachableHexes('50.18', 20)

// Get movement cost for a single hex
game.reignmaker.getHexMovementCost('50.18')
```

### Movement Graph Inspection

```javascript
// Graph statistics
game.reignmaker.graphStats()

// Inspect hex node data
game.reignmaker.debugHex('5.8')

// Inspect edge between two hexes
game.reignmaker.debugEdge('5.8', '5.9')

// List all blocked edges (rivers without crossings)
game.reignmaker.listBlockedEdges()

// Force rebuild the movement graph
game.reignmaker.rebuildGraph()
```

### Navigation Grid Inspection

```javascript
// Grid statistics
game.reignmaker.navGridStats()

// Check if pixel position is blocked
game.reignmaker.checkBlocking(pixelX, pixelY)

// Check if movement between hexes crosses river
game.reignmaker.checkPathBlocking('5.10', '5.11')
```

## Type Definitions

### PathResult

```typescript
interface PathResult {
  path: string[];           // Hex IDs from start to target
  totalCost: number;        // Total movement cost
  isReachable: boolean;     // Within movement range
  finalNavCell?: {x, y};    // Final cell position (8x8 grid)
  cellPath?: Array<{x,y}>   // Actual A* cell path (debug)
}
```

### HexNode

```typescript
interface HexNode {
  id: string;               // "i.j" format
  terrain: string;          // plains, forest, hills, etc.
  travel: TravelDifficulty; // open/difficult/greater-difficult/water
  hasRoad: boolean;
  hasSettlement: boolean;
  waterType: HexWaterType;  // none/lake/swamp
}
```

### EdgeData

```typescript
interface EdgeData {
  from: string;
  to: string;
  landCost: number;         // Grounded unit cost
  waterCost: number;        // Swimming/naval cost
  flyCost: number;          // Always 1
  crossesRiver: boolean;
  hasCrossing: boolean;
  hasWaterfall: boolean;
  isUpstream: boolean;
}
```

## River Handling

### Navigation Grid Approach

Rivers are rasterized onto an 8x8 pixel cell grid using Bresenham's line algorithm with 3-cell thickness. This allows:
- Precise blocking detection at any point along a river
- Painted passages (crossings) that override blocking
- Legacy crossing support at bridge/ford positions

### Movement Detection

When checking if movement crosses a river:
1. Get cells along the direct line between hex centers
2. Check each cell against the blocking grid
3. If any blocking cell found AND no passage/crossing → blocked

### Water Features

| Feature | Effect |
|---------|--------|
| River | Blocks ground movement between hexes |
| Lake | Entire hex is water terrain (blocks ground) |
| Swamp | +1 movement cost, allows ground movement |
| Bridge/Ford | Allows crossing at specific edge |
| Painted Passage | Overrides river blocking at specific cells |
| Waterfall | Blocks all movement (even flying) |

## Performance Optimizations

1. **Precomputed Graphs** - MovementGraph caches edges/nodes
2. **Hash-based Change Detection** - Avoids unnecessary rebuilds
3. **Cell-based A*** - Fine resolution prevents diagonal slipping
4. **Heuristic Pruning** - Hex distance cuts search space
5. **Cached Layouts** - NavigationGrid caches hex geometry
6. **Lazy Layer Loading** - PIXI layers created on-demand
7. **Texture Caching** - Stripe pattern reused across range overlay

## Integration Points

### Army Actor Link

Armies link to NPC actors via `pf2e-reignmaker.army-metadata` flag. Movement traits are read from the actor's speed data.

### Kingdom Store

The reactive Svelte store manages army state. Movement graph auto-rebuilds when kingdom data changes.

### Deploy Army Execution

`src/execution/armies/deployArmy.ts` handles the actual movement:
- Animates token along path
- Updates army position in kingdom data
- Saves navCellX/navCellY for next movement

## References

- [Red Blob Games: Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/)
- [Red Blob Games: A* Pathfinding](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [PF2e Kingdom Building Rules](https://2e.aonprd.com/Rules.aspx?ID=1839)
