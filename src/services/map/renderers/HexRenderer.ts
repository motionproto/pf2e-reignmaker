/**
 * HexRenderer - Core hex drawing utilities for PIXI graphics
 * 
 * Provides low-level hex rendering primitives that can be reused
 * across the map service. Handles coordinate parsing, vertex calculation,
 * and PIXI graphics drawing.
 */

import type { HexStyle } from '../types';
import { logger } from '../../../utils/Logger';

/**
 * Draw a single hex to a PIXI.Graphics object
 * 
 * @param graphics - PIXI.Graphics object to draw into
 * @param hexId - Hex ID in dot notation (e.g., "50.18")
 * @param style - Hex rendering style (fill, border, alpha)
 * @param canvas - Foundry canvas object
 * @returns true if hex was drawn successfully, false otherwise
 */
export function drawSingleHex(
  graphics: PIXI.Graphics,
  hexId: string,
  style: HexStyle,
  canvas: any
): boolean {
  try {
    // Parse dot notation: "50.18" -> {i: 50, j: 18}
    const parts = hexId.split('.');
    if (parts.length !== 2) {
      logger.warn(`[HexRenderer] ⚠️ Invalid hex ID format: ${hexId}`);
      return false;
    }
    
    const i = parseInt(parts[0], 10);
    const j = parseInt(parts[1], 10);
    
    if (isNaN(i) || isNaN(j)) {
      logger.warn(`[HexRenderer] ⚠️ Invalid hex coordinates: ${hexId}`);
      return false;
    }
    
    // Get hex center using Foundry's official API
    const center = canvas.grid.getCenterPoint({i, j});
    
    // Use GridHex class for vertex calculation
    const GridHex = (globalThis as any).foundry.grid.GridHex;
    const hex = new GridHex({i, j}, canvas.grid);
    
    // Get vertices in grid-relative coordinates
    // getShape() returns vertices relative to (0,0), not world coordinates!
    const relativeVertices = canvas.grid.getShape(hex.offset);
    
    if (!relativeVertices || relativeVertices.length === 0) {
      logger.warn(`[HexRenderer] ⚠️ No vertices for hex ${hexId} (i:${i}, j:${j})`);
      return false;
    }
    
    // Apply scaling factor to fix slight gaps between hexes
    const scale = (canvas.grid.sizeY + 2) / canvas.grid.sizeY;
    
    // Translate vertices to world coordinates by adding to hex center
    const worldVertices = relativeVertices.map((v: any) => ({
      x: center.x + (v.x * scale),
      y: center.y + (v.y * scale)
    }));
    
    // Draw fill
    graphics.beginFill(style.fillColor, style.fillAlpha);
    graphics.drawPolygon(worldVertices.flatMap((v: any) => [v.x, v.y]));
    graphics.endFill();
    
    // Draw border if specified
    if (style.borderWidth && style.borderWidth > 0) {
      const borderColor = style.borderColor ?? style.fillColor;
      const borderAlpha = style.borderAlpha ?? 1.0;
      graphics.lineStyle(style.borderWidth, borderColor, borderAlpha);
      graphics.drawPolygon(worldVertices.flatMap((v: any) => [v.x, v.y]));
    }
    
    return true;
  } catch (error) {
    logger.error(`[HexRenderer] ❌ Failed to draw hex ${hexId}:`, error);
    return false;
  }
}

/**
 * Draw multiple hexes with the same style to a PIXI.Graphics object
 * More efficient than calling drawSingleHex multiple times in a loop
 * 
 * @param graphics - PIXI.Graphics object to draw into
 * @param hexIds - Array of hex IDs to draw
 * @param style - Hex rendering style (fill, border, alpha)
 * @param canvas - Foundry canvas object
 * @returns Number of hexes successfully drawn
 */
export function drawMultipleHexes(
  graphics: PIXI.Graphics,
  hexIds: string[],
  style: HexStyle,
  canvas: any
): number {
  if (!canvas?.grid) {
    logger.warn('[HexRenderer] ❌ Canvas grid not available');
    return 0;
  }

  let successCount = 0;
  hexIds.forEach(hexId => {
    const drawn = drawSingleHex(graphics, hexId, style, canvas);
    if (drawn) successCount++;
  });

  return successCount;
}

/**
 * Normalize hex ID format (remove leading zeros for consistent matching)
 * "5.08" -> "5.8", "50.18" -> "50.18"
 * 
 * @param hexId - Hex ID in dot notation
 * @returns Normalized hex ID without leading zeros
 */
export function normalizeHexId(hexId: string): string {
  const parts = hexId.split('.');
  if (parts.length !== 2) return hexId;
  
  const i = parseInt(parts[0], 10);
  const j = parseInt(parts[1], 10);
  
  if (isNaN(i) || isNaN(j)) return hexId;
  
  return `${i}.${j}`;
}

/**
 * Parse hex ID into coordinate components
 * 
 * @param hexId - Hex ID in dot notation (e.g., "50.18")
 * @returns Parsed coordinates or null if invalid
 */
export function parseHexId(hexId: string): { i: number; j: number } | null {
  const parts = hexId.split('.');
  if (parts.length !== 2) {
    return null;
  }
  
  const i = parseInt(parts[0], 10);
  const j = parseInt(parts[1], 10);
  
  if (isNaN(i) || isNaN(j)) {
    return null;
  }
  
  return { i, j };
}

/**
 * Check if a hex ID is valid
 * 
 * @param hexId - Hex ID to validate
 * @returns true if hex ID is valid, false otherwise
 */
export function isValidHexId(hexId: string): boolean {
  return parseHexId(hexId) !== null;
}
