# Canonical Edge System

## Overview

The edge system provides a **single source of truth** for hex edges (shared boundaries between adjacent hexes). This ensures rivers, roads, and other features that cross hex boundaries are always consistent, regardless of which hex you're viewing from.

## The Problem It Solves

**Without canonical edges:**
- Edge between hexes `4:4` and `5:4` could be stored twice (once in each hex)
- No guarantee both hexes agree on the edge's state
- Synchronization bugs when updating edge features
- Duplicate storage and processing

**With canonical edges:**
- Each edge has exactly ONE ID: `4:4:se,5:4:nw`
- Both hexes reference the same edge data
- Updates are automatically consistent
- No duplication

## Edge ID Format

```
i:j:dir,i:j:dir
└─┬─┘ │  └─┬─┘ │
  │   │    │   └─ Second hex's opposite direction
  │   │    └───── Second hex coordinates (row:column)
  │   └──────────Second hex's edge direction
  └──────────────First hex coordinates & edge direction
```

**Example:** `4:4:se,5:4:nw`
- Hex `4:4` views this as its **southeast** edge
- Hex `5:4` views this as its **northwest** edge
- Same physical edge, two perspectives

## Storage Location

**Canonical Map (Single Source of Truth):**
```typescript
kingdom.rivers.edges = {
  "4:4:se,5:4:nw": {
    state: 'flow',
    flowsToHex: { i: 5, j: 4 },
    navigable: true
  }
}
```

**Per-Hex Features (Read-Only Derived Data):**
```typescript
hex.features = [{
  type: 'river',
  segments: [{
    connectors: [
      { edge: 'se', state: 'flow' }  // Derived from canonical map
    ]
  }]
}]
```

## Core Utilities (`src/utils/edgeUtils.ts`)

### 1. Generate Canonical ID from Two Hexes

```typescript
import { getCanonicalEdgeId } from '../utils/edgeUtils';

const edgeId = getCanonicalEdgeId(
  { i: 4, j: 4 },
  { i: 5, j: 4 },
  canvas
);
// Returns: "4:4:se,5:4:nw"
```

### 2. Get Edge ID from One Hex + Direction

```typescript
import { getEdgeIdForDirection, edgeNameToIndex } from '../utils/edgeUtils';

const direction = edgeNameToIndex('se');  // 3
const edgeId = getEdgeIdForDirection(4, 4, direction, canvas);
// Returns: "4:4:se,5:4:nw"
```

### 3. Parse Edge ID Back to Hexes

```typescript
import { parseCanonicalEdgeId } from '../utils/edgeUtils';

const { hex1, hex2 } = parseCanonicalEdgeId("4:4:se,5:4:nw");
// hex1 = { i: 4, j: 4, dir: 'se' }
// hex2 = { i: 5, j: 4, dir: 'nw' }
```

### 4. Get Opposite Direction

```typescript
import { getOppositeEdge } from '../utils/edgeUtils';

getOppositeEdge('se');  // Returns: 'nw'
getOppositeEdge('e');   // Returns: 'w'
```

## Foundry VTT Integration

**Critical:** Foundry returns neighbors in this order: `[w, sw, nw, se, ne, e]`

The system handles this automatically via:
```typescript
// Direction name → Foundry neighbor index
edgeNameToIndex('ne');  // Returns: 4

// Foundry neighbor index → Direction name
edgeIndexToName(4);     // Returns: 'ne'
```

**Never assume a different neighbor order!** Always use these utilities.

## Usage Patterns

### Pattern 1: Store Edge Data (Write)

```typescript
import { getEdgeIdForDirection, edgeNameToIndex } from '../utils/edgeUtils';

// User clicks northeast edge of hex 4:4
const edgeIndex = edgeNameToIndex('ne');
const edgeId = getEdgeIdForDirection(4, 4, edgeIndex, canvas);

// Write to canonical map (single source of truth)
await updateKingdom(kingdom => {
  if (!kingdom.rivers) kingdom.rivers = { edges: {} };
  
  kingdom.rivers.edges[edgeId] = {
    state: 'flow',
    flowsToHex: { i: 3, j: 5 },
    navigable: true
  };
});
```

### Pattern 2: Read Edge Data

```typescript
import { getEdgeIdForDirection } from '../utils/edgeUtils';

// Check if edge has a river
const edgeId = getEdgeIdForDirection(hexI, hexJ, edgeIndex, canvas);
const edgeData = kingdom.rivers.edges[edgeId];

if (edgeData && edgeData.state === 'flow') {
  // This edge has a flowing river
}
```

### Pattern 3: Sync to Per-Hex Features (Rendering)

```typescript
// After updating canonical map, sync to hex features for renderers
const edges: EdgeDirection[] = ['e', 'se', 'sw', 'w', 'nw', 'ne'];
const activeConnectors: RiverConnector[] = [];

for (const edgeDir of edges) {
  const edgeIndex = edgeNameToIndex(edgeDir);
  const edgeId = getEdgeIdForDirection(hexI, hexJ, edgeIndex, canvas);
  const edgeData = kingdom.rivers.edges[edgeId];
  
  if (edgeData) {
    activeConnectors.push({
      edge: edgeDir,
      state: edgeData.state
    });
  }
}

// Now hex.features has connectors for rendering
```

## Key Rules

### ✅ DO:
- **Always write to canonical map first** (`kingdom.rivers.edges`)
- **Use edge utilities** for all edge ID generation
- **Sync both hexes** after updating a shared edge
- **Query canonical map** to check edge state

### ❌ DON'T:
- **Don't write directly to hex features** for edge data
- **Don't assume neighbor order** - use `edgeNameToIndex()`
- **Don't store edge data in both hexes** - use canonical map
- **Don't hardcode direction indices** - always use utilities

## Benefits

1. **No Duplication** - Each edge stored once
2. **Automatic Consistency** - Both hexes see the same state
3. **Easy Updates** - Change one place, both hexes reflect it
4. **Readable IDs** - Human-verifiable edge relationships
5. **Type Safety** - Utilities enforce correct usage

## Debugging Tools

Use the debug modes in Map Overlays toolbar:

```javascript
// Enable edge debug in console
(await import('/modules/pf2e-reignmaker/dist/pf2e-reignmaker.js'))
  .getEditorModeService()
  .toggleDebugEdge();

// Now clicking edges shows:
// 📐 Clicked Edge: 4:4:se,5:4:nw (se)
```

**Format:** `hex1:edge,hex2:edge (clicked_direction)`
- Verifies both hex perspectives
- Shows which edge was physically clicked
- Useful for testing edge detection

## Example: River System

```typescript
// 1. User clicks edge to add river
const edgeId = getEdgeIdForDirection(hexI, hexJ, edgeIndex, canvas);

// 2. Write to canonical map
kingdom.rivers.edges[edgeId] = {
  state: 'flow',
  flowsToHex: { i: neighborI, j: neighborJ },
  navigable: true
};

// 3. Sync to both hexes for rendering
syncCanonicalEdgesToHexFeatures(hexI, hexJ, canvas);
syncCanonicalEdgesToHexFeatures(neighborI, neighborJ, canvas);

// 4. Renderer reads from hex.features (derived data)
// Both hexes now show the river consistently
```

## Migration Notes

If you have old code storing edges per-hex:
1. Read existing edge data from both hexes
2. Generate canonical IDs using `getCanonicalEdgeId()`
3. Merge into `kingdom.rivers.edges` map
4. Update hex features to derive from canonical map
5. Remove duplicate edge storage

---

**Remember:** Canonical map is the source of truth. Hex features are derived for rendering. Always write to canonical, sync to features.
