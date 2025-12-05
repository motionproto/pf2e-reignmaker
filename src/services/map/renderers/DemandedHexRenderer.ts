/**
 * DemandedHexRenderer - Renders demanded hex indicators on map
 * 
 * Uses the ClaimArrow image to indicate hexes that citizens
 * are demanding the kingdom claim.
 */

import { logger } from '../../../utils/Logger';
import { ICON_SHADOW_COLOR } from '../../../view/kingdom/utils/presentation';
import claimArrowImg from '../../../img/map_icons/ClaimArrow.webp';

/**
 * Draw demanded hex indicators on hexes
 * Places a claim arrow sprite at hex centers
 * 
 * @param layer - PIXI container to add sprites to
 * @param hexIds - Array of hex IDs to mark as demanded
 * @param canvas - Foundry canvas object
 */
export async function renderDemandedHexIndicators(
  layer: PIXI.Container,
  hexIds: string[],
  canvas: any
): Promise<number> {
  if (!canvas?.grid) {
    logger.warn('[DemandedHexRenderer] ❌ Canvas grid not available');
    return 0;
  }

  let successCount = 0;

  for (const hexId of hexIds) {
    try {
      // Parse hex ID
      const parts = hexId.split('.');
      if (parts.length !== 2) {
        logger.warn(`[DemandedHexRenderer] ⚠️ Invalid hex ID format: ${hexId}`);
        continue;
      }

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      
      if (isNaN(i) || isNaN(j)) {
        logger.warn(`[DemandedHexRenderer] ⚠️ Invalid hex coordinates: ${hexId}`);
        continue;
      }

      // Get hex center using Foundry's official API
      const center = canvas.grid.getCenterPoint({ i, j });

      // Load texture and create sprite
      const texture = await PIXI.Assets.load(claimArrowImg);
      
      // Scale to appropriate size (75% of hex height for better visibility)
      const hexSize = canvas.grid.sizeY;
      const iconSize = hexSize * 0.75;
      
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
      blurFilter.blur = 8;
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
      logger.error(`[DemandedHexRenderer] Failed to draw indicator for hex ${hexId}:`, error);
    }
  }

  logger.info(`[DemandedHexRenderer] Drew ${successCount} demanded hex indicator(s)`);
  return successCount;
}
