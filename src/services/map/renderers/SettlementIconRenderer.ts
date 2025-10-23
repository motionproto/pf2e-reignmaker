/**
 * SettlementIconRenderer - Renders settlement tier icons on map hexes
 * Maps settlement positions to their tier-appropriate icons
 */

import { SETTLEMENT_ICONS } from '../types';

/**
 * Draw settlement icons on hexes
 * Places tier-specific icon sprites at hex centers based on settlement tier
 * 
 * @param layer - PIXI container to add sprites to
 * @param settlementData - Array of settlements with hex ID and tier NAME (Village, Town, City, Metropolis)
 * @param canvas - Foundry canvas object
 */
export async function renderSettlementIcons(
  layer: PIXI.Container,
  settlementData: Array<{ id: string; tier: string }>,
  canvas: any
): Promise<number> {
  console.log(`[SettlementIconRenderer] 🏛️ Rendering settlement icons for ${settlementData.length} hexes...`);
  console.log(`[SettlementIconRenderer] Settlement data:`, settlementData);
  console.log(`[SettlementIconRenderer] SETTLEMENT_ICONS mapping:`, SETTLEMENT_ICONS);

  if (!canvas?.grid) {
    console.warn('[SettlementIconRenderer] ❌ Canvas grid not available');
    return 0;
  }

  const GridHex = (globalThis as any).foundry.grid.GridHex;
  let successCount = 0;

  // Process each settlement
  console.log(`[SettlementIconRenderer] Starting loop over ${settlementData.length} settlements`);
  for (const settlement of settlementData) {
    const { id, tier } = settlement;
    console.log(`[SettlementIconRenderer] Processing settlement:`, { id, tier });
    try {
      // Get icon path for this settlement tier
      const iconPath = SETTLEMENT_ICONS[tier];
      if (!iconPath) {
        console.warn(`[SettlementIconRenderer] No icon found for settlement tier: ${tier}`);
        continue;
      }

      console.log(`[SettlementIconRenderer] Loading icon for settlement at ${id}, tier ${tier}, path: ${iconPath}`);

      // Parse hex ID
      const parts = id.split('.');
      if (parts.length !== 2) {
        console.warn(`[SettlementIconRenderer] ⚠️ Invalid hex ID format: ${id}`);
        continue;
      }

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      
      if (isNaN(i) || isNaN(j)) {
        console.warn(`[SettlementIconRenderer] ⚠️ Invalid hex coordinates: ${id}`);
        continue;
      }

      // Get hex center
      const hex = new GridHex({i, j}, canvas.grid);
      const center = hex.center;

      // Load texture and create sprite
      console.log(`[SettlementIconRenderer] Attempting to load texture from: ${iconPath}`);
      let texture;
      try {
        texture = await PIXI.Assets.load(iconPath);
        console.log(`[SettlementIconRenderer] Texture loaded successfully:`, texture);
      } catch (loadError) {
        console.error(`[SettlementIconRenderer] Failed to load texture from ${iconPath}:`, loadError);
        continue; // Skip this settlement and continue with the rest
      }
      
      // Scale to appropriate size (85% of hex height for settlements)
      const hexSize = canvas.grid.sizeY;
      const iconSize = hexSize * 0.65;
      
      // Create shadow sprite (darker, offset copy)
      const shadowSprite = new PIXI.Sprite(texture);
      shadowSprite.anchor.set(0.5, 0.5);
      shadowSprite.position.set(center.x + 3, center.y + 3); // Offset for shadow
      const scale = iconSize / shadowSprite.height;
      shadowSprite.scale.set(scale, scale);
      shadowSprite.tint = 0x000000; // Black
      shadowSprite.alpha = 0.5; // Semi-transparent
      
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
      console.error(`[SettlementIconRenderer] Failed to draw settlement icon for hex ${id}:`, error);
    }
  }

  console.log(`[SettlementIconRenderer] ✅ Drew ${successCount}/${settlementData.length} settlement icons`);
  return successCount;
}
