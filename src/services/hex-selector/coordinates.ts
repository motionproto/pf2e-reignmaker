/**
 * Coordinate Conversion Helpers for Hex Selection
 * 
 * Handles conversion between:
 * - Foundry GridHex instances with {i, j} offsets
 * - Dot notation hex IDs (i.j format like "50.18")
 * - Pixel positions
 * 
 * IMPORTANT: Uses dot notation consistently with ReignMakerMapLayer
 */

/**
 * Convert GridHex offset to dot notation hex ID (i.j format)
 * Example: {i: 50, j: 18} -> "50.18"
 */
export function hexToKingmakerId(offset: { i: number; j: number }): string {
  return `${offset.i}.${offset.j}`;
}

/**
 * Convert dot notation hex ID to offset coordinates
 * Example: "50.18" -> {i: 50, j: 18}
 */
export function kingmakerIdToOffset(hexId: string): { i: number; j: number } {
  const [i, j] = hexId.split('.').map(Number);
  return { i, j };
}

/**
 * Convert pixel position to hex offset using canvas grid
 */
export function positionToOffset(x: number, y: number): { i: number; j: number } {
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    throw new Error('Canvas grid not available');
  }
  
  return canvas.grid.getOffset({ x, y });
}

/**
 * Get center point of a hex from its offset
 */
export function offsetToCenterPoint(offset: { i: number; j: number }): { x: number; y: number } {
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    throw new Error('Canvas grid not available');
  }
  
  return canvas.grid.getCenterPoint(offset);
}

/**
 * Get vertices (polygon points) of a hex from its offset
 */
export function getHexVertices(offset: { i: number; j: number }): { x: number; y: number }[] {
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    throw new Error('Canvas grid not available');
  }
  
  return canvas.grid.getVertices(offset);
}
