/**
 * buildRoads execution function
 *
 * Extracted from build-roads custom implementation - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Execute road building
 *
 * @param hexIds - Array of hex IDs where roads should be built
 */
export async function buildRoadsExecution(hexIds: string[]): Promise<void> {
  logger.info(`🛣️ [buildRoadsExecution] Building roads on ${hexIds.length} hex(es): ${hexIds.join(', ')}`);

  if (!hexIds || hexIds.length === 0) {
    logger.warn('[buildRoadsExecution] No hexes provided');
    return;
  }

  // Update Kingdom Store - Deduct cost and set hasRoad flag on each hex
  await updateKingdom(kingdom => {
    // Deduct gold cost (2 gold per action, not per segment)
    const goldCost = 2;
    kingdom.resources.gold = Math.max(0, (kingdom.resources.gold || 0) - goldCost);
    logger.info(`[buildRoadsExecution] Deducted ${goldCost} gold, new balance: ${kingdom.resources.gold}`);
    
    // Mark selected hexes as having roads
    hexIds.forEach(hexId => {
      const hex = kingdom.hexes.find((h: any) => h.id === hexId);
      if (hex) {
        logger.info(`[buildRoadsExecution] Building road on hex ${hexId}`);
        hex.hasRoad = true;
      } else {
        logger.warn(`[buildRoadsExecution] Hex ${hexId} not found in Kingdom Store`);
      }
    });
  });

  // Ensure PIXI container is visible (scene control active)
  const { ReignMakerMapLayer } = await import('../../services/map/core/ReignMakerMapLayer');
  const mapLayer = ReignMakerMapLayer.getInstance();
  mapLayer.showPixiContainer();

  // ✅ REACTIVE OVERLAYS: Kingdom Store change automatically triggers overlay updates
  // No need to manually call showOverlay() - the reactive subscriptions handle it!
  // Road overlays subscribe to kingdom data and auto-redraw.

  logger.info(`✅ [buildRoadsExecution] Successfully built roads on ${hexIds.length} hex(es)`);
}
