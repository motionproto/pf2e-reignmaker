/**
 * TerrainDifficultyRenderer - Renders terrain difficulty overlays on map hexes
 * Colors hexes based on travel difficulty (open, difficult, greater-difficult)
 */

import type { HexStyle } from '../types';
import { TERRAIN_DIFFICULTY_COLORS } from '../../../styles/colors';
import { getTravelDifficultyFromTerrain, type TravelDifficulty } from '../../../types/terrain';
import { logger } from '../../../utils/Logger';

/**
 * Draw terrain difficulty overlay for hexes with terrain type data
 * Colors hexes based on travel difficulty (green, yellow, crimson)
 * 
 * @param layer - PIXI container to add graphics to
 * @param hexData - Array of hex IDs with their terrain types
 * @param canvas - Foundry canvas object
 * @param drawHexFn - Function to draw a single hex to a graphics object
 */
export function renderTerrainDifficultyOverlay(
  layer: PIXI.Container,
  hexData: Array<{ id: string; terrain: string }>,
  canvas: any,
  drawHexFn: (graphics: PIXI.Graphics, hexId: string, style: HexStyle, canvas: any) => boolean
): void {

  if (!canvas?.grid) {
    logger.warn('[TerrainDifficultyRenderer] ❌ Canvas grid not available');
    return;
  }

  // Group hexes by travel difficulty for efficient rendering
  const difficultyGroups = new Map<TravelDifficulty, string[]>();
  hexData.forEach(({ id, terrain }) => {
    // Convert terrain to travel difficulty
    const difficulty = getTravelDifficultyFromTerrain(terrain as any);
    
    if (!difficultyGroups.has(difficulty)) {
      difficultyGroups.set(difficulty, []);
    }
    difficultyGroups.get(difficulty)!.push(id);
  });

  // Draw each difficulty group
  difficultyGroups.forEach((hexIds, difficulty) => {
    const difficultyStyle = TERRAIN_DIFFICULTY_COLORS[difficulty] || TERRAIN_DIFFICULTY_COLORS['default'];
    
    const graphics = new PIXI.Graphics();
    graphics.name = `TerrainDifficulty_${difficulty}`;
    graphics.visible = true;

    let successCount = 0;
    hexIds.forEach(hexId => {
      const style: HexStyle = {
        fillColor: difficultyStyle.color,
        fillAlpha: difficultyStyle.alpha,
        borderWidth: 0 // No borders for terrain difficulty overlay
      };
      const drawn = drawHexFn(graphics, hexId, style, canvas);
      if (drawn) successCount++;
    });

    layer.addChild(graphics);

  });

}
