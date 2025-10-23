/**
 * TerritoryRenderer - Renders territory fill and outlines
 */

import { DEFAULT_HEX_STYLES } from '../types';
import type { HexStyle } from '../types';
import { generateTerritoryOutline } from '../TerritoryOutline';

/**
 * Draw territory fill hexes
 * 
 * @param layer - PIXI container to add graphics to
 * @param hexIds - Array of hex IDs to fill
 * @param canvas - Foundry canvas object
 * @param drawHexesFn - Function to draw multiple hexes with a style
 */
export function renderTerritoryFill(
  layer: PIXI.Container,
  hexIds: string[],
  canvas: any,
  drawHexesFn: (hexIds: string[], style: HexStyle, layerId: string, zIndex?: number) => void
): void {
  console.log(`[TerritoryRenderer] 🎨 Rendering territory fill for ${hexIds.length} hexes...`);
  
  if (!canvas?.grid) {
    console.warn('[TerritoryRenderer] ❌ Canvas grid not available');
    return;
  }

  // Note: drawHexesFn will handle creating the graphics and adding to layer
  // We just pass through the parameters
  drawHexesFn(hexIds, DEFAULT_HEX_STYLES.kingdomTerritory, 'kingdom-territory', 10);
  
  console.log('[TerritoryRenderer] ✅ Territory fill complete');
}

/**
 * Draw territory outline around claimed hexes
 * Creates a polygonal border around the kingdom territory
 * 
 * @param layer - PIXI container to add graphics to
 * @param hexIds - Array of hex IDs to outline
 */
export function renderTerritoryOutline(
  layer: PIXI.Container,
  hexIds: string[]
): void {
  console.log(`[TerritoryRenderer] 🎨 Drawing territory outline for ${hexIds.length} hexes...`);

  // Generate outline paths
  const outlineResult = generateTerritoryOutline(hexIds);
  
  if (outlineResult.outlines.length === 0) {
    console.warn('[TerritoryRenderer] ⚠️ No outline paths generated');
    return;
  }

  console.log(`[TerritoryRenderer] Generated ${outlineResult.outlines.length} outline path(s)`);

  // Create graphics object for the outline
  const graphics = new PIXI.Graphics();
  graphics.name = 'TerritoryOutline';
  graphics.visible = true;

  // Draw outline with single pass - thick bright blue border
  graphics.lineStyle({
    width: 16,
    color: 0x00D4FF, // Bright electric blue - highly visible
    alpha: 1.0, // Fully opaque
    cap: PIXI.LINE_CAP.ROUND,
    join: PIXI.LINE_JOIN.ROUND
  });

  outlineResult.outlines.forEach((path, pathIndex) => {
    if (path.length === 0) return;

    graphics.moveTo(path[0].start.x, path[0].start.y);

    for (const segment of path) {
      graphics.lineTo(segment.end.x, segment.end.y);
    }

    const firstPoint = path[0].start;
    const lastPoint = path[path.length - 1].end;
    const tolerance = 0.1;
    const isLoop = Math.abs(firstPoint.x - lastPoint.x) < tolerance && 
                   Math.abs(firstPoint.y - lastPoint.y) < tolerance;
    
    if (isLoop) {
      graphics.closePath();
    }

    console.log(`[TerritoryRenderer] Path ${pathIndex}: ${path.length} segments, loop: ${isLoop}`);
  });

  layer.addChild(graphics);

  console.log(`[TerritoryRenderer] ✅ Territory outline drawn with ${outlineResult.debugInfo?.boundaryEdges} boundary edges`);
}
