/**
 * Edge Utilities - Canonical edge identification using readable hex coordinates
 * 
 * Each edge between two hexes has exactly ONE canonical ID, regardless of which hex you're looking from.
 * This eliminates duplicate edge storage and ensures both hexes always see the same edge state.
 * 
 * Format: "i:j:dir,i:j:dir" (e.g., "4:4:se,5:4:nw")
 * Both hexes sharing the edge are included for clarity and verification.
 */

/**
 * Get opposite edge direction
 * e → w, se → nw, sw → ne, w → e, nw → se, ne → sw
 */
export function getOppositeEdge(edge: string): string {
  const opposites: Record<string, string> = {
    'e': 'w',
    'se': 'nw',
    'sw': 'ne',
    'w': 'e',
    'nw': 'se',
    'ne': 'sw'
  };
  return opposites[edge] || 'e';
}

/**
 * Generate canonical edge ID from two hexes
 * Always returns same ID regardless of which hex you start from
 * 
 * @param hex1 - First hex offset coordinates
 * @param hex2 - Second hex offset coordinates
 * @param canvas - Foundry canvas object
 * @returns Canonical edge ID (e.g., "4:4:se,5:4:nw")
 */
export function getCanonicalEdgeId(
  hex1: { i: number; j: number },
  hex2: { i: number; j: number },
  canvas: any
): string {
  // Determine which hex comes first (canonical ordering)
  let first = hex1;
  let second = hex2;
  
  // Sort by (i, j) coordinates to ensure consistent ordering
  if (hex1.i > hex2.i || (hex1.i === hex2.i && hex1.j > hex2.j)) {
    first = hex2;
    second = hex1;
  }
  
  // Calculate which edge direction connects first → second
  const direction = getEdgeDirectionBetweenHexes(first, second, canvas);
  const oppositeDirection = getOppositeEdge(direction);
  
  // Format: "i:j:dir,i:j:dir"
  return `${first.i}:${first.j}:${direction},${second.i}:${second.j}:${oppositeDirection}`;
}

/**
 * Determine edge direction from hex1 to hex2
 * Returns the edge direction (e, se, sw, w, nw, ne) that connects the hexes
 */
function getEdgeDirectionBetweenHexes(
  hex1: { i: number; j: number },
  hex2: { i: number; j: number },
  canvas: any
): string {
  const neighbors = canvas.grid.getNeighbors(hex1.i, hex1.j);
  
  // Find which neighbor index matches hex2
  for (let i = 0; i < neighbors.length; i++) {
    const [neighborI, neighborJ] = neighbors[i];
    if (neighborI === hex2.i && neighborJ === hex2.j) {
      return edgeIndexToName(i);
    }
  }
  
  throw new Error(`Hexes ${hex1.i}:${hex1.j} and ${hex2.i}:${hex2.j} are not neighbors`);
}

/**
 * Get canonical edge ID for a hex's edge in a specific direction
 * 
 * @param hexI - Hex row coordinate
 * @param hexJ - Hex column coordinate
 * @param direction - Edge direction (0=e, 1=se, 2=sw, 3=w, 4=nw, 5=ne)
 * @param canvas - Foundry canvas object
 * @returns Canonical edge ID in format "i:j:dir,i:j:dir"
 */
export function getEdgeIdForDirection(
  hexI: number,
  hexJ: number,
  direction: number,
  canvas: any
): string | null {
  // Get all neighbors (returned in clockwise order: e, se, sw, w, nw, ne)
  const neighbors = canvas.grid.getNeighbors(hexI, hexJ);
  
  // Pick the neighbor at this direction index
  const neighbor = neighbors[direction];
  if (!neighbor) {
    // Edge of map - no neighbor in this direction (this is expected for boundary hexes)
    return null;
  }
  
  const [neighborI, neighborJ] = neighbor;
  
  // Generate canonical ID using both hex coordinates
  return getCanonicalEdgeId(
    { i: hexI, j: hexJ },
    { i: neighborI, j: neighborJ },
    canvas
  );
}

/**
 * Map edge direction name to index
 * Foundry VTT returns neighbors in order: [w, sw, nw, se, ne, e]
 */
export function edgeNameToIndex(edge: string): number {
  const map: Record<string, number> = {
    'w': 0,
    'sw': 1,
    'nw': 2,
    'se': 3,
    'ne': 4,
    'e': 5,
  };
  return map[edge] ?? 0;
}

/**
 * Map edge index to direction name
 * Foundry VTT returns neighbors in order: [w, sw, nw, se, ne, e]
 */
export function edgeIndexToName(index: number): string {
  const names = ['w', 'sw', 'nw', 'se', 'ne', 'e'];
  return names[index] || 'e';
}

/**
 * Parse canonical edge ID back into hex coordinates and directions
 * Supports both normal edges ("i:j:dir,i:j:dir") and center connectors ("i:j:dir,i:j:c" or "i:j:c,i:j:dir")
 * 
 * @param edgeId - Canonical edge ID (e.g., "4:4:se,5:4:nw" or "4:4:e,4:4:c")
 * @returns Object with both hexes and their edge directions ('c' for center)
 */
export function parseCanonicalEdgeId(
  edgeId: string
): {
  hex1: { i: number; j: number; dir: string };
  hex2: { i: number; j: number; dir: string };
} {
  // Parse "i:j:dir,i:j:dir" (also handles "i:j:c" for center)
  const [hex1Str, hex2Str] = edgeId.split(',');
  const [i1, j1, dir1] = hex1Str.split(':');
  const [i2, j2, dir2] = hex2Str.split(':');
  
  return {
    hex1: { i: parseInt(i1, 10), j: parseInt(j1, 10), dir: dir1 },
    hex2: { i: parseInt(i2, 10), j: parseInt(j2, 10), dir: dir2 }
  };
}

/**
 * Format edge ID for display (alias for readability)
 * 
 * @param edgeId - Canonical edge ID
 * @returns Formatted string for display
 */
export function formatEdgeId(edgeId: string): string {
  return `[${edgeId}]`;
}
