/**
 * FortificationRenderer - Renders fortification icons on map hexes
 */

import { ICON_SHADOW_COLOR } from '../../../view/kingdom/utils/presentation';
import fortificationEarthenImg from '../../../../img/map_icons/fortification_earthen.webp';
import fortificationTowerWoodImg from '../../../../img/map_icons/fortification_tower_wood.webp';
import fortificationTowerStoneImg from '../../../../img/map_icons/fortification_tower_stone.webp';
import fortificationKeepImg from '../../../../img/map_icons/fortification_keep.webp';
import { logger } from '../../../utils/Logger';

/**
 * Fortification icon mapping (tier → image path)
 */
const FORTIFICATION_ICONS: Record<number, string> = {
  1: fortificationEarthenImg,
  2: fortificationTowerWoodImg,
  3: fortificationTowerStoneImg,
  4: fortificationKeepImg
};

/**
 * Draw fortification icons on hexes
 * Places icon sprites at hex centers based on fortification tier
 * Shows red border for unpaid maintenance
 * 
 * @param layer - PIXI container to add sprites to
 * @param fortificationData - Array of hex IDs with their fortification data
 * @param canvas - Foundry canvas object
 */
export async function renderFortificationIcons(
  layer: PIXI.Container,
  fortificationData: Array<{ id: string; tier: number; maintenancePaid: boolean }>,
  canvas: any
): Promise<number> {

  if (!canvas?.grid) {
    logger.warn('[FortificationRenderer] ❌ Canvas grid not available');
    return 0;
  }

  const GridHex = (globalThis as any).foundry.grid.GridHex;
  let successCount = 0;

  // Process each fortification
  for (const { id, tier, maintenancePaid } of fortificationData) {
    try {
      // Get icon path for this tier
      const iconPath = FORTIFICATION_ICONS[tier];
      if (!iconPath) {
        logger.warn(`[FortificationRenderer] No icon found for tier: ${tier}`);
        continue;
      }

      // Parse hex ID
      const parts = id.split('.');
      if (parts.length !== 2) {
        logger.warn(`[FortificationRenderer] ⚠️ Invalid hex ID format: ${id}`);
        continue;
      }

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      
      if (isNaN(i) || isNaN(j)) {
        logger.warn(`[FortificationRenderer] ⚠️ Invalid hex coordinates: ${id}`);
        continue;
      }

      // Get hex center using Foundry's official API
      const center = canvas.grid.getCenterPoint({i, j});

      // Load texture and create sprite
      const texture = await PIXI.Assets.load(iconPath);
      
      // Scale to appropriate size (50% of hex height for fortifications - slightly larger than worksites)
      const hexSize = canvas.grid.sizeY;
      const iconSize = hexSize * 0.5;
      
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
      
      // Add red border indicator if maintenance is unpaid
      if (!maintenancePaid) {
        const borderGraphics = new PIXI.Graphics();
        borderGraphics.lineStyle(3, 0xff0000, 0.8); // Red border, 80% opacity
        borderGraphics.drawCircle(center.x, center.y, iconSize / 2 + 5);
        layer.addChild(borderGraphics);

      }
      
      successCount++;
      
    } catch (error) {
      logger.error(`[FortificationRenderer] Failed to draw fortification icon for hex ${id}:`, error);
    }
  }

  return successCount;
}
