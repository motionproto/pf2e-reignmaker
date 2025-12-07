/**
 * createWorksite execution function
 *
 * Pure execution logic for creating worksites on hexes.
 * Preview logic is handled by pipeline configuration.
 * 
 * Uses domain layer for pure logic, wraps with Foundry store updates.
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { validateCreateWorksite } from '../../pipelines/shared/worksiteValidator';
import { applyCreateWorksite } from '../../domain/territory/worksiteLogic';

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

  // Validate worksite placement
  const validation = await validateCreateWorksite(hexId, worksiteType);
  if (!validation.valid) {
    logger.error(`[createWorksiteExecution] Validation failed: ${validation.message}`);
    ui.notifications?.error(`Cannot create worksite: ${validation.message}`);
    return;
  }

  // Update Kingdom Store using domain layer pure logic
  await updateKingdom(kingdom => {
    // Use domain layer for pure worksite creation logic
    const success = applyCreateWorksite(kingdom, hexId, worksiteType);
    
    if (success) {
      logger.info(`[createWorksiteExecution] Successfully created worksite on hex ${hexId}`);
    } else {
      logger.warn(`[createWorksiteExecution] Hex ${hexId} not found in Kingdom Store`);
    }
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
