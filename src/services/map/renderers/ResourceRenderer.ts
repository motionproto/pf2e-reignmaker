/**
 * ResourceRenderer - Renders bounty/commodity icons on map hexes
 * Shows bonus resources available on hexes (from hex.commodities)
 */

import { BOUNTY_ICONS } from '../types';
import { ICON_SHADOW_COLOR } from '../../../view/kingdom/utils/presentation';
import { logger } from '../../../utils/Logger';
import { getResourceColor } from '../../../view/kingdom/utils/presentation';

/**
 * Draw bounty icons on hexes
 * Places commodity icon sprites at hex centers
 * Stacks multiple bounties with 4px offset
 * 
 * @param layer - PIXI container to add sprites to
 * @param bountyData - Array of hex IDs with their commodities
 * @param canvas - Foundry canvas object
 */
export async function renderResourceIcons(
  layer: PIXI.Container,
  bountyData: Array<{ id: string; commodities: Record<string, number> }>,
  canvas: any
): Promise<number> {

  if (!canvas?.grid) {
    logger.warn('[ResourceRenderer] ❌ Canvas grid not available');
    return 0;
  }

  let successCount = 0;

  // Process each hex with bounties
  for (const { id, commodities } of bountyData) {
    try {
      // Parse hex ID
      const parts = id.split('.');
      if (parts.length !== 2) {
        logger.warn(`[ResourceRenderer] ⚠️ Invalid hex ID format: ${id}`);
        continue;
      }

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      
      if (isNaN(i) || isNaN(j)) {
        logger.warn(`[ResourceRenderer] ⚠️ Invalid hex coordinates: ${id}`);
        continue;
      }

      // Get hex center using Foundry's official API
      const center = canvas.grid.getCenterPoint({i, j});
      
      // Scale to appropriate size (45% of hex height)
      const hexSize = canvas.grid.sizeY;
      const iconSize = hexSize * 0.45;
      
      // Get bounty resources as array for stacking
      const bounties = Object.entries(commodities).filter(([_, amount]) => amount > 0);
      
      // Calculate container offset to center the stack
      // Each icon adds 4px to the total width (except the first)
      const stackSpacing = 4;
      const totalStackWidth = (bounties.length - 1) * stackSpacing;
      const containerOffsetX = -totalStackWidth / 2;
      const containerOffsetY = -totalStackWidth / 2;
      
      let stackOffset = 0;
      
      // Render each bounty resource
      for (const [resource, amount] of bounties) {
        // Skip if no bounty for this resource
        if (amount <= 0) continue;
        
        // Get icon path for this resource type
        const iconPath = BOUNTY_ICONS[resource];
        if (!iconPath) {
          logger.warn(`[ResourceRenderer] No bounty icon found for resource: ${resource}`);
          continue;
        }
        
        // Handle gold differently (FA icon vs webp)
        if (resource === 'gold') {
          // Create FontAwesome icon using PIXI.Text
          const goldIcon = new PIXI.Text('', {
            fontFamily: 'Font Awesome 6 Free',
            fontSize: iconSize,
            fill: 0xFFD700, // Gold color
            fontWeight: '900'
          });
          goldIcon.anchor.set(0.5, 0.5);
          goldIcon.position.set(
            center.x + containerOffsetX + stackOffset, 
            center.y + containerOffsetY + stackOffset
          );
          
          // Create shadow for gold icon
          const shadowIcon = new PIXI.Text('', {
            fontFamily: 'Font Awesome 6 Free',
            fontSize: iconSize,
            fill: ICON_SHADOW_COLOR.color,
            fontWeight: '900'
          });
          shadowIcon.anchor.set(0.5, 0.5);
          shadowIcon.position.set(
            center.x + containerOffsetX + stackOffset + 3, 
            center.y + containerOffsetY + stackOffset + 3
          );
          shadowIcon.alpha = ICON_SHADOW_COLOR.alpha;
          
          // Add blur filter to shadow
          const blurFilter = new PIXI.filters.BlurFilter();
          blurFilter.blur = 8;
          shadowIcon.filters = [blurFilter];
          
          layer.addChild(shadowIcon);
          layer.addChild(goldIcon);
        } else {
          // Load texture and create sprite for webp icons
          const texture = await PIXI.Assets.load(iconPath);
          
          // Create shadow sprite (darker, offset copy)
          const shadowSprite = new PIXI.Sprite(texture);
          shadowSprite.anchor.set(0.5, 0.5);
          shadowSprite.position.set(
            center.x + containerOffsetX + stackOffset + 3, 
            center.y + containerOffsetY + stackOffset + 3
          );
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
          sprite.position.set(
            center.x + containerOffsetX + stackOffset, 
            center.y + containerOffsetY + stackOffset
          );
          sprite.scale.set(scale, scale);
          layer.addChild(sprite);
        }
        
        // Increment stack offset for next icon (4px offset)
        stackOffset += 4;
        successCount++;
      }
      
    } catch (error) {
      logger.error(`[ResourceRenderer] Failed to draw bounty icons for hex ${id}:`, error);
    }
  }

  return successCount;
}
