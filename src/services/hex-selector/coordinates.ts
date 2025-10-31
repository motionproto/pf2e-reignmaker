/**
 * Coordinate Conversion Helpers for Hex Selection
 * 
 * Handles conversion between:
 * - Foundry GridHex instances with {i, j} offsets
 * - Dot notation hex IDs (i.j format like "50.18")
 * - Pixel positions
 * 
 * Uses Foundry's native hex coordinate format (no zero-padding)
 */

/**
 * Convert offset coordinates to hex ID (Foundry's native i.j format)
 * Example: {i: 5, j: 8} -> "5.8"
 */
export function offsetToHexId(offset: { i: number; j: number }): string {
  return `${offset.i}.${offset.j}`;
}

/**
 * Convert hex ID to offset coordinates
 * Example: "5.8" -> {i: 5, j: 8}
 */
export function hexIdToOffset(hexId: string): { i: number; j: number } {
  const [i, j] = hexId.split('.').map(Number);
  return { i, j };
}

/**
 * @deprecated Use offsetToHexId instead
 */
export const hexToKingmakerId = offsetToHexId;

/**
 * @deprecated Use hexIdToOffset instead
 */
export const kingmakerIdToOffset = hexIdToOffset;

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
