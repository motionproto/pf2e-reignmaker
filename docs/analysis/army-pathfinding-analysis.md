# Army Pathfinding System Analysis

**Date:** 2025-12-20
**Status:** Analysis & Recommendations

## Executive Summary

The army pathfinding system has a sophisticated architecture but the river barrier detection is currently not functioning correctly. The core issue is that barrier segments need to be both **properly computed** and **correctly checked during pathfinding**.

---

## System Architecture Overview

### Data Flow

```
User selects army (ArmyDeploymentPanel)
  ↓
armyMovementMode.activateForArmy(armyId, startHexId)
  ↓
pathfindingService.getReachableHexes(startHexId, maxMovement, traits)
  ↓ (for each neighbor)
pathfindingService.getMovementCost(neighborHex, traits, fromHexId)
  ↓ (if grounded, non-swimming)
waterwayLookup.doesMovementCrossRiver(fromI, fromJ, toI, toJ)
  ↓
Read kingdom.rivers.barrierSegments (stored array)
  ↓
lineSegmentsIntersect(movementLine, riverSegment)
  ↓
Return blocked or cost
```

### Key Files

| File | Purpose |
|------|---------|
| `src/services/army/ArmyDeploymentPanel.ts` | UI for army selection and path plotting |
| `src/services/army/movementMode.ts` | Interactive movement handler (hover preview, click to add waypoint) |
| `src/services/pathfinding/index.ts` | A* pathfinding with terrain costs |
| `src/services/pathfinding/WaterwayLookup.ts` | River crossing detection |
| `src/utils/barrierSegmentUtils.ts` | Computes barrier segments from river paths |
| `src/utils/geometryUtils.ts` | Line intersection algorithm |

---

## Detailed Analysis

### 1. Barrier Segment Generation

**Location:** `src/utils/barrierSegmentUtils.ts:21-71`

Barrier segments are computed from river paths when rivers are edited:

```typescript
export function computeBarrierSegments(
  paths: RiverPath[],
  crossings: RiverCrossing[] | undefined,
  canvas: any
): BarrierSegment[]
```

**Current Implementation:**
- Creates a `crossingPointSet` from all crossings
- For each path, sorts points by order and creates segments between consecutive points
- Marks segments with `hasCrossing: true` if either endpoint has a crossing

**Potential Issues:**
1. **Existing kingdoms lack segments** - Kingdoms created before this system was implemented have no `barrierSegments` stored. Rivers must be re-edited once to generate initial segments.

2. **Canvas dependency** - The function requires `canvas.grid` to be ready for coordinate conversion. If called before canvas is ready, it returns empty array.

3. **Crossing detection granularity** - A crossing at one endpoint marks the ENTIRE segment as passable. This might be too permissive.

### 2. Segment Storage

**Location:** `src/actors/KingdomActor.ts`

Segments are stored in kingdom data:
```typescript
rivers?: {
  paths: RiverPath[];
  crossings?: RiverCrossing[];
  waterfalls?: RiverWaterfall[];
  barrierSegments?: BarrierSegment[];  // Pre-computed barrier lines
};
```

**Data Structure:**
```typescript
interface BarrierSegment {
  start: { x: number; y: number };  // Pixel coordinates
  end: { x: number; y: number };
  hasCrossing: boolean;
}
```

### 3. Pathfinding Integration

**Location:** `src/services/pathfinding/index.ts:202-219`

River crossing is checked during movement cost calculation:

```typescript
// RIVER CROSSING CHECK (for grounded, non-swimming, non-amphibious units)
const shouldCheckRiver = fromHexId && !canSwim && !hasBoats;

if (shouldCheckRiver) {
  const crossesRiver = waterwayLookup.doesMovementCrossRiver(fromHexI, fromHexJ, hexI, hexJ);
  if (crossesRiver) {
    logger.info(`[Pathfinding] Movement ${fromHexId} → ${hexId} BLOCKED by river crossing`);
    return Infinity;  // Movement blocked by river
  }
}
```

**Critical Observation:** The `fromHexId` parameter is only passed during A* pathfinding and reachability calculation, NOT when calling `getMovementCost` directly. This is correct behavior.

### 4. River Crossing Detection

**Location:** `src/services/pathfinding/WaterwayLookup.ts:421-456`

```typescript
doesMovementCrossRiver(fromHexI, fromHexJ, toHexI, toHexJ): boolean {
  const kingdom = get(kingdomData);  // Fresh data from store
  const segments = kingdom?.rivers?.barrierSegments;

  if (!segments || segments.length === 0) {
    return false;  // No barrier segments stored
  }

  const fromCenter = canvas.grid.getCenterPoint({ i: fromHexI, j: fromHexJ });
  const toCenter = canvas.grid.getCenterPoint({ i: toHexI, j: toHexJ });

  for (const segment of segments) {
    if (segment.hasCrossing) continue;  // Skip crossings

    if (lineSegmentsIntersect(fromCenter, toCenter, segment.start, segment.end)) {
      return true;  // Blocked
    }
  }
  return false;
}
```

### 5. Line Intersection Algorithm

**Location:** `src/utils/geometryUtils.ts:20-51`

Uses cross-product method:
```typescript
// Check if intersection is within both segments (0 <= t,u <= 1)
// Use small epsilon to avoid edge cases at exact endpoints
const epsilon = 1e-10;
return t > epsilon && t < 1 - epsilon && u > epsilon && u < 1 - epsilon;
```

**Potential Issue:** The strict inequality (`>` and `<` instead of `>=` and `<=`) means intersections exactly at segment endpoints are NOT detected. This could cause edge cases where movement paths that should be blocked are allowed.

---

## Identified Problems

### Problem 1: Missing Initial Barrier Segments

**Symptom:** Rivers don't block movement at all.

**Cause:** `kingdom.rivers.barrierSegments` is undefined or empty.

**Verification:**
```javascript
// In browser console
game.reignmaker.getKingdomData().rivers?.barrierSegments
// If undefined or [], segments were never computed
```

**Fix:** Rivers need to be edited once (add/remove any point) to trigger `updateBarrierSegments()`.

### Problem 2: Canvas Not Ready During Computation

**Symptom:** Barrier segments are empty even after editing rivers.

**Cause:** `computeBarrierSegments()` is called before canvas is ready.

**Verification:** Check console for warning:
```
[BarrierSegments] Canvas not ready, cannot compute segments
```

### Problem 3: Stale Kingdom Data (Previously Fixed)

**History:** The `doesMovementCrossRiver` function was using cached `this.lastKingdomData` instead of fresh `get(kingdomData)`. This was already fixed in the previous session.

### Problem 4: Line Intersection Epsilon Edge Cases

**Symptom:** Some river crossings are not detected.

**Cause:** Movement paths that touch river segments exactly at endpoints are not detected due to strict epsilon comparison.

**Impact:** Low - most movement paths will intersect segments in the middle, not at endpoints.

### Problem 5: Crossing Marks Entire Segment

**Current Behavior:** If a crossing (bridge/ford) exists at point A, and a segment goes from A to B, the ENTIRE segment A-B is marked as passable.

**Expected Behavior:** Only movement paths that actually cross AT the crossing point should be allowed. Movement that crosses the same segment elsewhere should still be blocked.

**Impact:** Medium - crossings may allow passage through more of the river than intended.

---

## Recommendations

### Immediate Fixes

#### 1. Add Migration/Initialization for Barrier Segments

When the module loads or a scene is activated, check if rivers exist but barrier segments don't, and compute them:

```typescript
// In module initialization or scene ready hook
async function ensureBarrierSegments(): Promise<void> {
  const kingdom = getKingdomData();
  const hasRivers = kingdom.rivers?.paths?.length > 0;
  const hasSegments = kingdom.rivers?.barrierSegments?.length > 0;

  if (hasRivers && !hasSegments) {
    const canvas = (globalThis as any).canvas;
    if (canvas?.grid) {
      const segments = computeBarrierSegments(
        kingdom.rivers.paths,
        kingdom.rivers.crossings,
        canvas
      );
      await updateKingdom(k => {
        if (!k.rivers) k.rivers = { paths: [] };
        k.rivers.barrierSegments = segments;
      });
      logger.info(`[Migration] Computed ${segments.length} barrier segments for existing rivers`);
    }
  }
}
```

#### 2. Add Debug Logging Toggle

Add a debug mode that logs barrier segment checks:

```typescript
doesMovementCrossRiver(...): boolean {
  const DEBUG = false; // Or read from settings

  if (DEBUG) {
    logger.info(`[WaterwayLookup] Checking movement ${fromHexI}.${fromHexJ} → ${toHexI}.${toHexJ}`);
    logger.info(`[WaterwayLookup] Barrier segments count: ${segments?.length || 0}`);
  }

  // ... rest of function
}
```

#### 3. Add Console Debug Commands

```typescript
// Register debug commands
game.reignmaker.debugBarrierSegments = () => {
  const kingdom = getKingdomData();
  const segments = kingdom.rivers?.barrierSegments || [];
  console.log(`Barrier segments: ${segments.length}`);
  segments.forEach((s, i) => {
    console.log(`  [${i}] (${s.start.x.toFixed(0)},${s.start.y.toFixed(0)}) → (${s.end.x.toFixed(0)},${s.end.y.toFixed(0)}) crossing=${s.hasCrossing}`);
  });
};

game.reignmaker.testRiverBlocking = (fromHex: string, toHex: string) => {
  const [fromI, fromJ] = fromHex.split('.').map(Number);
  const [toI, toJ] = toHex.split('.').map(Number);
  const blocked = waterwayLookup.doesMovementCrossRiver(fromI, fromJ, toI, toJ);
  console.log(`Movement ${fromHex} → ${toHex}: ${blocked ? 'BLOCKED' : 'allowed'}`);
};
```

### Architecture Improvements

#### 1. Consider Relaxed Epsilon for Endpoint Detection

If edge cases are problematic, consider:
```typescript
// Allow intersection at endpoints (inclusive)
return t >= 0 && t <= 1 && u >= 0 && u <= 1;
```

However, this may cause false positives when segments share endpoints.

#### 2. Point-Based Crossing Detection

Instead of marking entire segments as passable, check if the intersection point is near a crossing:

```typescript
interface BarrierSegment {
  start: Point;
  end: Point;
  crossingPoints: Point[];  // Actual crossing locations on this segment
}

// In doesMovementCrossRiver:
const intersection = getLineSegmentIntersection(movementStart, movementEnd, segment.start, segment.end);
if (intersection) {
  // Check if intersection is near any crossing point
  const nearCrossing = segment.crossingPoints.some(c =>
    distance(intersection, c) < CROSSING_RADIUS
  );
  if (!nearCrossing) {
    return true; // Blocked
  }
}
```

#### 3. Visual Debug Overlay

Add a debug overlay that draws:
- Red lines for blocking barrier segments
- Green lines for passable segments (with crossings)
- Blue line for current movement path being tested

---

## Testing Checklist

### Manual Testing

1. **Basic River Blocking:**
   - [ ] Create a river with 3+ points
   - [ ] Place army on one side
   - [ ] Verify army cannot path to hexes across river
   - [ ] Verify unreachable hexes show red X on hover

2. **Bridge/Ford Crossing:**
   - [ ] Add a bridge to a river segment
   - [ ] Verify army can cross at that point
   - [ ] Verify army still cannot cross elsewhere on same river

3. **Flying/Swimming Units:**
   - [ ] Create army with fly speed
   - [ ] Verify it ignores rivers completely
   - [ ] Create army with swim speed
   - [ ] Verify it can cross rivers

4. **Data Persistence:**
   - [ ] Edit rivers, check segments are stored
   - [ ] Reload scene, verify segments persist
   - [ ] Verify pathfinding still works after reload

### Automated Testing

```javascript
// Test barrier segment computation
const kingdom = game.reignmaker.getKingdomData();
console.assert(kingdom.rivers?.barrierSegments?.length > 0, 'Barrier segments should exist');

// Test blocking
const blocked = game.reignmaker.waterwayLookup.doesMovementCrossRiver(50, 18, 51, 18);
console.log('Movement blocked:', blocked);
```

---

## Appendix: Full Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RIVER EDITING FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User clicks on map (river editor mode)                                     │
│         ↓                                                                    │
│  RiverEditorHandlers.handleRiverClick()                                     │
│         ↓                                                                    │
│  updateKingdom() - adds point to path                                       │
│         ↓                                                                    │
│  RiverEditorHandlers.updateBarrierSegments()                                │
│         ↓                                                                    │
│  computeBarrierSegments(paths, crossings, canvas)                           │
│         ↓                                                                    │
│  updateKingdom() - stores barrierSegments                                   │
│         ↓                                                                    │
│  kingdomData store updated → WaterwayLookup.buildLookup() triggered         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PATHFINDING FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User selects army (Deploy Army action)                                     │
│         ↓                                                                    │
│  ArmyDeploymentPanel.selectArmy(armyId)                                     │
│         ↓                                                                    │
│  armyMovementMode.activateForArmy(armyId, startHexId)                       │
│         ↓                                                                    │
│  getArmyMovementTraits(army) → {canFly, canSwim, hasBoats, amphibious}     │
│         ↓                                                                    │
│  pathfindingService.getReachableHexes(startHexId, maxMovement, traits)      │
│         ↓                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  FOR EACH NEIGHBOR HEX:                                              │    │
│  │         ↓                                                            │    │
│  │  getMovementCost(neighborHex, traits, currentHex)                    │    │
│  │         ↓                                                            │    │
│  │  IF grounded (no fly/swim/boats):                                    │    │
│  │         ↓                                                            │    │
│  │  waterwayLookup.doesMovementCrossRiver(currentI,J, neighborI,J)      │    │
│  │         ↓                                                            │    │
│  │  get(kingdomData) → fresh kingdom data                               │    │
│  │         ↓                                                            │    │
│  │  kingdom.rivers.barrierSegments                                      │    │
│  │         ↓                                                            │    │
│  │  FOR EACH SEGMENT (if !hasCrossing):                                 │    │
│  │         ↓                                                            │    │
│  │  canvas.grid.getCenterPoint() → hex centers                          │    │
│  │         ↓                                                            │    │
│  │  lineSegmentsIntersect(movementLine, riverSegment)                   │    │
│  │         ↓                                                            │    │
│  │  IF intersection: return Infinity (BLOCKED)                          │    │
│  │  ELSE: return terrain cost (1, 2, or 3)                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         ↓                                                                    │
│  Map<hexId, cost> of reachable hexes returned                               │
│         ↓                                                                    │
│  Render movement range overlay (green tint)                                 │
│         ↓                                                                    │
│  User hovers hex → pathfindingService.findPath() → render path preview      │
│         ↓                                                                    │
│  User clicks hex → add waypoint → update plottedPath                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Conclusion

The current line-line intersection approach has fundamental limitations when rivers flow INSIDE hexes (e.g., from center to edge):

1. **Collinear movement/river:** When movement starts at a hex center where a river also starts, lines are collinear - no intersection detected
2. **Shared endpoints:** The epsilon-based intersection excludes endpoint matches, missing cases where movement ends at river start

---

## Recommended Approach: Grid Traversal

**Parked for implementation.** The current line-line intersection approach should be replaced with grid traversal algorithms.

### The Correct Approach

Instead of "does line A intersect line B in global space", the approach should be:

1. **Traverse the cells** the movement line passes through (Bresenham or Amanatides & Woo)
2. **For each cell**, check barriers local to that cell
3. **Handle within-cell geometry** properly (entry/exit edges, river segments)

### Recommended Reading

- [Amanatides & Woo Fast Voxel Traversal](http://www.cse.yorku.ca/~amana/research/grid.pdf) - Original paper
- [M4XC Implementation Guide](https://m4xc.dev/articles/amanatides-and-woo/) - Detailed walkthrough
- [Bresenham's Line Algorithm](https://en.wikipedia.org/wiki/Bresenham's_line_algorithm) - Simpler 2D integer grid approach
- [Grid Intersection on Stack Overflow](https://stackoverflow.com/questions/3270840/find-the-intersection-between-line-and-grid-in-a-fast-manner) - Practical implementations
- [Segment Intersection CP-Algorithms](https://cp-algorithms.com/geometry/segments-intersection.html) - Cross-product orientation tests

### Key Insight

Rivers act as barriers WITHIN hexes. You can enter a hex with a river, but you cannot exit across the river. The barrier check needs to understand:
- Which edge you're entering from
- Which edge you're exiting to
- Whether a river segment blocks that specific traversal

This is fundamentally different from "does global line A cross global line B".
