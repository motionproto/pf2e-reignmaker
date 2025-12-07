/**
 * claimHexes execution function
 *
 * Extracted from claim-hexes custom implementation - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 * 
 * Uses domain layer for pure logic, wraps with Foundry store updates.
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { applyClaimHexes } from '../../domain/territory/claimHexesLogic';

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

  // Update Kingdom Store using domain layer pure logic
  await updateKingdom(kingdom => {
    logger.info('[claimHexesExecution] Current hexes count:', kingdom.hexes?.length);
    
    // Use domain layer for pure claiming logic
    const result = applyClaimHexes(kingdom, hexIds);
    
    logger.info(`[claimHexesExecution] Claimed ${result.claimedHexIds.length} hex(es), new size: ${result.newSize}`);
  });

  // Ensure PIXI container is visible (scene control active)
  const { ReignMakerMapLayer } = await import('../../services/map/core/ReignMakerMapLayer');
  const mapLayer = ReignMakerMapLayer.getInstance();
  mapLayer.showPixiContainer();

  // Recalculate production (claimed hexes may have worksites)
  const { tryRecalculateProduction } = await import('../../utils/recalculateProduction');
  await tryRecalculateProduction();

  // ✅ REACTIVE OVERLAYS: Kingdom Store change automatically triggers overlay updates
  // No need to manually call showOverlay() - the reactive subscriptions handle it!
  // Territory and border overlays subscribe to claimedHexes store and auto-redraw.

  logger.info(`✅ [claimHexesExecution] Successfully claimed ${hexIds.length} hex(es)`);
}
