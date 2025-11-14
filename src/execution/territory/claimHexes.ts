/**
 * claimHexes execution function
 *
 * Extracted from claim-hexes custom implementation - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { PLAYER_KINGDOM } from '../../types/ownership';

/**
 * Execute hex claiming
 *
 * @param hexIds - Array of hex IDs to claim
 */
export async function claimHexesExecution(hexIds: string[]): Promise<void> {
  logger.info(`🗺️ [claimHexesExecution] Claiming ${hexIds.length} hex(es): ${hexIds.join(', ')}`);

  if (!hexIds || hexIds.length === 0) {
    logger.warn('[claimHexesExecution] No hexes provided');
    return;
  }

  // Update Kingdom Store directly (Kingdom Store is the source of truth, NOT Kingmaker)
  await updateKingdom(kingdom => {
    logger.info('[claimHexesExecution] Current hexes count:', kingdom.hexes?.length);

    for (const hexId of hexIds) {
      const hex = kingdom.hexes.find((h: any) => h.id === hexId);
      if (hex) {
        logger.info(`[claimHexesExecution] Claiming hex ${hexId}, was: ${hex.claimedBy}, setting to: ${PLAYER_KINGDOM}`);
        hex.claimedBy = PLAYER_KINGDOM;  // Use the constant, not hardcoded value
      } else {
        logger.warn(`[claimHexesExecution] Hex ${hexId} not found in Kingdom Store`);
      }
    }

    // Update kingdom size (count of claimed hexes)
    const newSize = kingdom.hexes.filter((h: any) => h.claimedBy === PLAYER_KINGDOM).length;
    logger.info(`[claimHexesExecution] Updating kingdom size from ${kingdom.size} to ${newSize}`);
    kingdom.size = newSize;
  });

  // Ensure PIXI container is visible (scene control active)
  const { ReignMakerMapLayer } = await import('../../services/map/core/ReignMakerMapLayer');
  const mapLayer = ReignMakerMapLayer.getInstance();
  mapLayer.showPixiContainer();

  // ✅ REACTIVE OVERLAYS: Kingdom Store change automatically triggers overlay updates
  // No need to manually call showOverlay() - the reactive subscriptions handle it!
  // Territory and border overlays subscribe to claimedHexes store and auto-redraw.

  logger.info(`✅ [claimHexesExecution] Successfully claimed ${hexIds.length} hex(es)`);
}
