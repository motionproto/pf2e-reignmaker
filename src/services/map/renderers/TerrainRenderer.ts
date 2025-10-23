/**
 * TerrainRenderer - Renders terrain type overlays on map hexes
 */

import type { HexStyle } from '../types';
import { TERRAIN_OVERLAY_COLORS } from '../../../view/kingdom/utils/presentation';

/**
 * Draw terrain overlay for hexes with terrain type data
 * Colors hexes based on terrain type (forest, plains, mountains, etc.)
 * 
 * @param layer - PIXI container to add graphics to
 * @param hexData - Array of hex IDs with their terrain types
 * @param canvas - Foundry canvas object
 * @param drawHexFn - Function to draw a single hex to a graphics object
 */
export function renderTerrainOverlay(
  layer: PIXI.Container,
  hexData: Array<{ id: string; terrain: string }>,
  canvas: any,
  drawHexFn: (graphics: PIXI.Graphics, hexId: string, style: HexStyle, canvas: any) => boolean
): void {
  console.log(`[TerrainRenderer] 🌄 Rendering terrain overlay for ${hexData.length} hexes...`);

  if (!canvas?.grid) {
    console.warn('[TerrainRenderer] ❌ Canvas grid not available');
    return;
  }

  // Group hexes by terrain type for efficient rendering
  const terrainGroups = new Map<string, string[]>();
  hexData.forEach(({ id, terrain }) => {
    const terrainType = terrain?.toLowerCase() || 'default';
    if (!terrainGroups.has(terrainType)) {
      terrainGroups.set(terrainType, []);
    }
    terrainGroups.get(terrainType)!.push(id);
  });

  console.log(`[TerrainRenderer] Rendering ${terrainGroups.size} terrain types`);

  // Draw each terrain type group
  terrainGroups.forEach((hexIds, terrainType) => {
    const terrainStyle = TERRAIN_OVERLAY_COLORS[terrainType] || TERRAIN_OVERLAY_COLORS['default'];
    
    const graphics = new PIXI.Graphics();
    graphics.name = `Terrain_${terrainType}`;
    graphics.visible = true;

    let successCount = 0;
    hexIds.forEach(hexId => {
      const style: HexStyle = {
        fillColor: terrainStyle.color,
        fillAlpha: terrainStyle.alpha,
        borderWidth: 0 // No borders for terrain overlay
      };
      const drawn = drawHexFn(graphics, hexId, style, canvas);
      if (drawn) successCount++;
    });

    layer.addChild(graphics);
    console.log(`[TerrainRenderer] ✅ Drew ${successCount} ${terrainType} hexes`);
  });

  console.log(`[TerrainRenderer] ✅ Terrain overlay complete`);
}
