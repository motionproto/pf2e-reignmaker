/**
 * WorksiteRenderer - Renders worksite icons on map hexes
 */

import { WORKSITE_ICONS } from '../types';
import { ICON_SHADOW_COLOR } from '../../../view/kingdom/utils/presentation';
import { logger } from '../../../utils/Logger';

/**
 * Draw worksite icons on hexes
 * Places icon sprites at hex centers based on worksite type
 * 
 * @param layer - PIXI container to add sprites to
 * @param worksiteData - Array of hex IDs with their worksite types
 * @param canvas - Foundry canvas object
 */
export async function renderWorksiteIcons(
  layer: PIXI.Container,
  worksiteData: Array<{ id: string; worksiteType: string }>,
  canvas: any
): Promise<number> {

  if (!canvas?.grid) {
    logger.warn('[WorksiteRenderer] ❌ Canvas grid not available');
    return 0;
  }

  const GridHex = (globalThis as any).foundry.grid.GridHex;
  let successCount = 0;

  // Process each worksite
  for (const { id, worksiteType } of worksiteData) {
    try {
      // Get icon path for this worksite type
      const iconPath = WORKSITE_ICONS[worksiteType];
      if (!iconPath) {
        logger.warn(`[WorksiteRenderer] No icon found for worksite type: ${worksiteType}`);
        continue;
      }

      // Parse hex ID
      const parts = id.split('.');
      if (parts.length !== 2) {
        logger.warn(`[WorksiteRenderer] ⚠️ Invalid hex ID format: ${id}`);
        continue;
      }

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      
      if (isNaN(i) || isNaN(j)) {
        logger.warn(`[WorksiteRenderer] ⚠️ Invalid hex coordinates: ${id}`);
        continue;
      }

      // Get hex center using Foundry's official API
      const center = canvas.grid.getCenterPoint({i, j});

      // Load texture and create sprite
      const texture = await PIXI.Assets.load(iconPath);
      
      // Scale to appropriate size (45% of hex height)
      const hexSize = canvas.grid.sizeY;
      const iconSize = hexSize * 0.45;
      
      // Create shadow sprite (darker, offset copy)
      const shadowSprite = new PIXI.Sprite(texture);
      shadowSprite.anchor.set(0.5, 0.5);
      shadowSprite.position.set(center.x + 3, center.y + 3); // Offset for shadow
      const scale = iconSize / shadowSprite.height;
      shadowSprite.scale.set(scale, scale);
      shadowSprite.tint = ICON_SHADOW_COLOR.color;
      shadowSprite.alpha = ICON_SHADOW_COLOR.alpha;
      
      // Add blur filter to shadow for softer effect
      const blurFilter = new PIXI.filters.BlurFilter();
      blurFilter.blur = 8; // Moderate blur
      shadowSprite.filters = [blurFilter];
      
      layer.addChild(shadowSprite);
      
      // Create main sprite on top
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      sprite.position.set(center.x, center.y);
      sprite.scale.set(scale, scale);
      layer.addChild(sprite);
      
      successCount++;
      
    } catch (error) {
      logger.error(`[WorksiteRenderer] Failed to draw worksite icon for hex ${id}:`, error);
    }
  }

  return successCount;
}
