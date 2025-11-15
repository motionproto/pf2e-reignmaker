/**
 * createWorksite execution function
 *
 * Pure execution logic for creating worksites on hexes.
 * Preview logic is handled by pipeline configuration.
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Execute worksite creation on a hex
 *
 * @param hexId - Hex ID where worksite should be created
 * @param worksiteType - Type of worksite to create (Farmstead, Logging Camp, Mine, Quarry)
 */
export async function createWorksiteExecution(hexId: string, worksiteType: string): Promise<void> {
  logger.info(`🏭 [createWorksiteExecution] Creating ${worksiteType} on hex ${hexId}`);

  if (!hexId) {
    logger.warn('[createWorksiteExecution] No hex provided');
    return;
  }

  if (!worksiteType) {
    logger.warn('[createWorksiteExecution] No worksite type provided');
    return;
  }

  // Update Kingdom Store - Set worksite on hex
  await updateKingdom(kingdom => {
    // Find the hex
    const hex = kingdom.hexes.find((h: any) => h.id === hexId);
    
    if (!hex) {
      logger.warn(`[createWorksiteExecution] Hex ${hexId} not found in Kingdom Store`);
      return;
    }

    // Auto-convert Mine to Bog Mine on swamp terrain
    let finalWorksiteType = worksiteType;
    if (worksiteType === 'Mine' && hex.terrain === 'swamp') {
      finalWorksiteType = 'Bog Mine';
      logger.info(`[createWorksiteExecution] Auto-converted to Bog Mine on swamp terrain`);
    }

    // Set worksite
    logger.info(`[createWorksiteExecution] Setting ${finalWorksiteType} on hex ${hexId}`);
    hex.worksite = { type: finalWorksiteType };
  });

  // Recalculate production (worksites affect resource production)
  const { tryRecalculateProduction } = await import('../../utils/recalculateProduction');
  await tryRecalculateProduction();

  // Ensure PIXI container is visible (scene control active)
  const { ReignMakerMapLayer } = await import('../../services/map/core/ReignMakerMapLayer');
  const mapLayer = ReignMakerMapLayer.getInstance();
  mapLayer.showPixiContainer();

  // ✅ REACTIVE OVERLAYS: Kingdom Store change automatically triggers overlay updates
  // No need to manually call showOverlay() - the reactive subscriptions handle it!
  // Worksite overlays subscribe to kingdom data and auto-redraw.

  logger.info(`✅ [createWorksiteExecution] Successfully created ${worksiteType} on hex ${hexId}`);
}
