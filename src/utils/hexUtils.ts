/**
 * Hex Utility Functions
 * Common operations for working with hexagonal grids
 */

/**
 * Get adjacent hexes for a given hex
 * Wraps Foundry's canvas.grid.getAdjacentOffsets() with a clearer API
 * 
 * @param i - Hex row coordinate
 * @param j - Hex column coordinate
 * @returns Array of adjacent hex coordinates, or empty array if grid unavailable
 */
export function getAdjacentHexes(
  i: number,
  j: number
): Array<{ i: number; j: number }> {
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    return [];
  }
  
  // Use Foundry's getAdjacentOffsets API (v12+)
  return canvas.grid.getAdjacentOffsets({ i, j });
}
