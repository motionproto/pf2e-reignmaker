/**
 * foundSettlement execution function
 *
 * Extracted from prepare/commit pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Execute settlement founding
 *
 * @param settlementData - Settlement configuration data
 */
export async function foundSettlementExecution(
  settlementData: {
    name: string;
    location: { x: number; y: number };
    grantFreeStructure?: boolean;
  }
): Promise<void> {
  logger.info(`🏘️ [foundSettlementExecution] Creating ${settlementData.name}`);

  const { createSettlement, SettlementTier } = await import('../../models/Settlement');

  // Create settlement object
  const newSettlement = createSettlement(
    settlementData.name,
    settlementData.location,
    SettlementTier.VILLAGE
  );

  // Add free structure slot if granted (critical success)
  if (settlementData.grantFreeStructure) {
    // TODO: Implement free structure slot grant logic
    // This might involve adding a temporary modifier or increasing settlement capacity
    logger.info(`✨ [foundSettlementExecution] Granting free structure slot to ${settlementData.name}`);
  }

  // Add settlement to kingdom
  await updateKingdom(kingdom => {
    if (!kingdom.settlements) {
      kingdom.settlements = [];
    }
    kingdom.settlements.push(newSettlement);
  });

  logger.info(`✅ [foundSettlementExecution] Successfully founded ${settlementData.name}`);
}
