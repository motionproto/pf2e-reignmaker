/**
 * ResourceRenderer - Renders bounty/commodity icons on map hexes
 * Shows bonus resources available on hexes (from hex.commodities)
 */

import { BOUNTY_ICONS } from '../types';
import { ICON_SHADOW_COLOR } from '../../../view/kingdom/utils/presentation';
import { logger } from '../../../utils/Logger';
import { getResourceColor } from '../../../view/kingdom/utils/presentation';

/**
 * Calculate geometric positions for bounty icons
 * 1 icon: center
 * 2 icons: side-by-side horizontally
 * 3 icons: triangle (top, bottom-left, bottom-right)
 * 4 icons: diamond (top, left, right, bottom)
 */
function calculateIconPositions(count: number, spacing: number = 24): Array<{x: number, y: number}> {
  switch (count) {
    case 1:
      return [{x: 0, y: 0}];
    
    case 2:
      return [
        {x: -spacing/2, y: 0},
        {x: spacing/2, y: 0}
      ];
    
    case 3:
      return [
        {x: 0, y: -spacing},              // top
        {x: -spacing, y: spacing/2},      // bottom left
        {x: spacing, y: spacing/2}        // bottom right
      ];
    
    case 4:
      return [
        {x: 0, y: -spacing},              // top
        {x: -spacing, y: 0},              // left
        {x: spacing, y: 0},               // right
        {x: 0, y: spacing}                // bottom
      ];
    
    default:
      return [{x: 0, y: 0}];
  }
}

/**
 * Draw bounty icons on hexes
 * Places commodity icon sprites at hex centers using geometric layouts
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
      
      // Calculate total number of icons to render (sum of all amounts)
      const totalIcons = bounties.reduce((sum, [_, amount]) => sum + amount, 0);
      
      // Get geometric positions for all icons (48px spacing)
      const positions = calculateIconPositions(totalIcons, 48);
      
      logger.debug(`[ResourceRenderer] Hex ${id}: ${bounties.length} resource types, ${totalIcons} total icons`);
      
      let currentIconIndex = 0;
      
      // Render each bounty resource
      for (const [resource, amount] of bounties) {
        logger.debug(`[ResourceRenderer]   - ${resource}: ${amount}x`);
        // Skip if no bounty for this resource
        if (amount <= 0) continue;
        
        // Get icon path for this resource type
        const iconPath = BOUNTY_ICONS[resource];
        if (!iconPath) {
          logger.warn(`[ResourceRenderer] No bounty icon found for resource: ${resource}`);
          continue;
        }
        
        // Render multiple icons based on amount (e.g., food: 2 renders 2 food icons)
        for (let count = 0; count < amount; count++) {
          // Get position for this icon
          const pos = positions[currentIconIndex];
          
          // Load texture and create sprite for webp icons
          const texture = await PIXI.Assets.load(iconPath);
          
          // Create shadow sprite (darker, offset copy)
          const shadowSprite = new PIXI.Sprite(texture);
          shadowSprite.anchor.set(0.5, 0.5);
          shadowSprite.position.set(
            center.x + pos.x + 3, 
            center.y + pos.y + 3
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
            center.x + pos.x, 
            center.y + pos.y
          );
          sprite.scale.set(scale, scale);
          layer.addChild(sprite);
          
          // Move to next icon position
          currentIconIndex++;
          successCount++;
        } // End inner loop (amount)
      }
      
    } catch (error) {
      logger.error(`[ResourceRenderer] Failed to draw bounty icons for hex ${id}:`, error);
    }
  }

  return successCount;
}
