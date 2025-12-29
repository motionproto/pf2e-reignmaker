/**
 * Hex Utility Functions
 * Common operations for working with hexagonal grids
 */

/**
 * Get adjacent hexes for a given hex
 * Uses Foundry's grid API - must be called when on a hex grid scene
 *
 * @param i - Hex row coordinate
 * @param j - Hex column coordinate
 * @returns Array of adjacent hex coordinates, or empty array if not on hex grid
 */
export function getAdjacentHexes(
  i: number,
  j: number
): Array<{ i: number; j: number }> {
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    return [];
  }

  // Use Foundry's getAdjacentOffsets API
  return canvas.grid.getAdjacentOffsets({ i, j }) || [];
}
