### Goal

Make hex corners fully usable as river connectors in the River Editor:
- Clicking a corner should create/delete `RiverPathPoint` entries with `cornerIndex`.
- Corners should participate in adjacency and double‑click logic like centers/edges.

### Files to touch

- `src/services/map/renderers/RiverConnectorRenderer.ts`
- `src/services/map/editors/RiverEditorHandlers.ts`
- (Optionally) `src/services/map/core/RiverPathNormalizer.ts` if we later want it to consider corners.

### Plan

1. **Extend click detection to return corners**
   - In `RiverConnectorRenderer.getConnectorAtPosition`:
     - Keep existing center and edge checks as-is.
     - After edge checks, add a third pass:
       - Get `vertices = canvas.grid.getVertices({ i: hexI, j: hexJ })`.
       - For each `cornerIndex 0..5`, compute distance from `clickPos` to `vertices[cornerIndex]`.
       - If within a small `CORNER_THRESHOLD` (e.g. 10px), return `{ cornerIndex }`.
     - Extend return type to:
       ```ts
       { edge: EdgeDirection; state: ConnectorState }
       | { center: true; state: CenterConnectorState }
       | { cornerIndex: number }
       | null;
       ```

2. **Teach RiverEditorHandlers to understand corner connectors**
   - In `RiverEditorHandlers.handleRiverClick`:
     - Replace the simple center/edge detection with:
       ```ts
       let isCenter = false;
       let edge: string | undefined;
       let cornerIndex: number | undefined;
       
       if ('center' in connector) isCenter = true;
       else if ('edge' in connector) edge = connector.edge;
       else if ('cornerIndex' in connector) cornerIndex = connector.cornerIndex;
       ```
     - When constructing `RiverPathPoint`, include `cornerIndex`:
       ```ts
       const point: RiverPathPoint = { hexI, hexJ, edge, isCenter, cornerIndex, order: this.currentPathOrder };
       ```
     - Update the log `desc` to describe corners as well (e.g. `"corner 3"`).
   - In `handleRiverRemove`:
     - Mirror the same `connector` interpretation.
     - When searching for the point to delete, include `cornerIndex` in the predicate so only the right connector is removed.

3. **Update double-click & adjacency helpers to include corners**
   - `lastClickConnector` and `isSameConnector`:
     - Extend the shape to also store `cornerIndex?: number`.
     - In `isSameConnector`, include `cornerIndex` in the equality check.
   - `isAdjacentPoint`:
     - Extend parameter types to include `cornerIndex?: number`.
     - Keep existing adjacency rules:
       - Same-hex points are always allowed (center/edge/corner).
       - Edge↔edge adjacency stays canonical-edge-based.
       - Neighbor-hex adjacency via `getAdjacentHexes` remains as-is, now naturally covering corner→edge/center/corner transitions by hex proximity.
     - (No special geometry for corners needed yet; we just treat them as additional connectors on a hex.)

4. **Visual confirmation in the editor**
   - We already render:
     - Green centers
     - Yellow edges
     - Pink corners (deduplicated)
   - No further changes required for visibility; once click handling is wired, you should be able to:
     - Click on pink corners to add river vertices.
     - Ctrl+click on pink corners to delete those vertices (when they’re part of the current path).

5. **(Optional follow-up, not in this change)**  
   - Extend `RiverPathNormalizer` to also consider corners as candidate connection points if we decide rivers should auto-snap through corners they pass over.


