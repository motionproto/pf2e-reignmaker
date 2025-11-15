/**
 * fortifyHex execution function
 *
 * Extracted from fortify-hex custom implementation - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Fortification tier data (loaded from JSON)
 */
interface FortificationTier {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  cost: Record<string, number>;
  maintenance: number;
  benefits: {
    ac: number;
    initiative: number;
  };
  description: string;
  special?: string;
}

/**
 * Execute fortification building/upgrading
 *
 * @param hexId - Hex ID where fortification should be built/upgraded
 * @param tier - Target fortification tier (1-4)
 */
export async function fortifyHexExecution(hexId: string, tier: 1 | 2 | 3 | 4): Promise<void> {
  logger.info(`🏰 [fortifyHexExecution] Building/upgrading fortification on hex ${hexId} to tier ${tier}`);

  if (!hexId) {
    logger.warn('[fortifyHexExecution] No hex provided');
    return;
  }

  // Load fortification tier data
  const fortificationDataModule = await import('../../../data/player-actions/fortify-hex.json');
  const fortificationData = fortificationDataModule.default || fortificationDataModule;
  const tierConfig = fortificationData.tiers[tier - 1] as FortificationTier;

  if (!tierConfig) {
    logger.error(`[fortifyHexExecution] Invalid tier: ${tier}`);
    return;
  }

  const cost = tierConfig.cost;

  // Update Kingdom Store - Deduct cost and set fortification
  await updateKingdom(kingdom => {
    // Deduct resource costs
    for (const [resource, amount] of Object.entries(cost)) {
      kingdom.resources[resource] = Math.max(0, (kingdom.resources[resource] || 0) - amount);
      logger.info(`[fortifyHexExecution] Deducted ${amount} ${resource}, new balance: ${kingdom.resources[resource]}`);
    }

    // Update hex fortification
    const hex = kingdom.hexes.find((h: any) => h.id === hexId);
    if (hex) {
      logger.info(`[fortifyHexExecution] Setting fortification tier ${tier} on hex ${hexId}`);
      hex.fortification = {
        tier: tier,
        maintenancePaid: true,
        turnBuilt: kingdom.currentTurn  // No maintenance required on turn built
      };
    } else {
      logger.warn(`[fortifyHexExecution] Hex ${hexId} not found in Kingdom Store`);
    }
  });

  // Ensure PIXI container is visible (scene control active)
  const { ReignMakerMapLayer } = await import('../../services/map/core/ReignMakerMapLayer');
  const mapLayer = ReignMakerMapLayer.getInstance();
  mapLayer.showPixiContainer();

  // ✅ REACTIVE OVERLAYS: Kingdom Store change automatically triggers overlay updates
  // No need to manually call showOverlay() - the reactive subscriptions handle it!
  // Fortification overlays subscribe to kingdom data and auto-redraw.

  logger.info(`✅ [fortifyHexExecution] Successfully built/upgraded fortification to ${tierConfig.name} on hex ${hexId}`);
}
