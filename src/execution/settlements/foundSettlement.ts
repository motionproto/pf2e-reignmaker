/**
 * foundSettlement execution function
 *
 * Extracted from prepare/commit pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom, getKingdomData } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { getAdjacentHexIds } from '../../pipelines/shared/hexValidation';

/**
 * Execute settlement founding
 *
 * @param settlementData - Settlement configuration data
 */
export async function foundSettlementExecution(
  settlementData: {
    name: string;
    location: { x: number; y: number };
    hexId: string;
    freeStructureId?: string;
  }
): Promise<void> {
  logger.info(`🏘️ [foundSettlementExecution] Creating ${settlementData.name} at ${settlementData.hexId}`);

  const { createSettlement, SettlementTier } = await import('../../models/Settlement');

  // Create settlement object
  const newSettlement = createSettlement(
    settlementData.name,
    settlementData.location,
    SettlementTier.VILLAGE
  );

  // Check if this is the first settlement (for auto-claim logic)
  const kingdom = getKingdomData();
  const existingSettlements = (kingdom.settlements || [])
    .filter((s: any) => s.location && s.location.x > 0 && s.location.y > 0);
  const isFirstSettlement = existingSettlements.length === 0;

  // Add settlement to kingdom with hex features
  await updateKingdom(k => {
    if (!k.settlements) {
      k.settlements = [];
    }
    k.settlements.push(newSettlement);
    
    // Set hasRoad flag for settlement hex (settlements count as roads)
    const hex = k.hexes?.find((h: any) => h.id === settlementData.hexId);
    if (hex) {
      hex.hasRoad = true;
      
      // Add hex feature entry for map rendering
      if (!hex.features) {
        hex.features = [];
      }
      hex.features.push({
        type: 'settlement',
        name: newSettlement.name,
        tier: newSettlement.tier,
        linked: true,              // Linked to Settlement object
        settlementId: newSettlement.id  // Link back to Settlement
      });
    }
    
    // First settlement: Automatically claim all adjacent hexes
    if (isFirstSettlement) {
      const adjacentHexIds = getAdjacentHexIds(settlementData.hexId);
      logger.info(`🏰 [foundSettlementExecution] First settlement! Auto-claiming ${adjacentHexIds.length} adjacent hexes`);
      
      adjacentHexIds.forEach(hexId => {
        const hex = k.hexes?.find((h: any) => h.id === hexId);
        if (hex && hex.claimedBy !== PLAYER_KINGDOM) {
          hex.claimedBy = PLAYER_KINGDOM;
        }
      });
      
      // Update kingdom size
      k.size = k.hexes?.filter((h: any) => h.claimedBy === PLAYER_KINGDOM).length || 0;
    }
  });

  // Recalculate production (settlements affect resource production)
  const { tryRecalculateProduction } = await import('../../utils/recalculateProduction');
  await tryRecalculateProduction();

  // Debug logging to verify settlement creation
  logger.info(`✅ Settlement ${settlementData.name} added to kingdom store`);
  const verify = getKingdomData();
  logger.info(`📊 Total settlements in kingdom: ${verify.settlements?.length || 0}`);

  // Add free structure if provided (critical success)
  if (settlementData.freeStructureId) {
    logger.info(`✨ [foundSettlementExecution] Adding free structure to ${settlementData.name}`);
    
    const { settlementStructureManagement } = await import('../../services/structures/management');
    
    const result = await settlementStructureManagement.addStructureToSettlement(
      settlementData.freeStructureId,
      newSettlement.id
    );
    
    if (result.success) {
      logger.info(`✅ [foundSettlementExecution] Added free structure ${settlementData.freeStructureId} to ${settlementData.name}`);
    } else {
      logger.error(`❌ [foundSettlementExecution] Failed to add free structure:`, result.error);
    }
  }

  // Ensure PIXI container is visible for map rendering
  const { ReignMakerMapLayer } = await import('../../services/map/core/ReignMakerMapLayer');
  const mapLayer = ReignMakerMapLayer.getInstance();
  mapLayer.showPixiContainer();

  const firstSettlementMsg = isFirstSettlement ? ' (claimed adjacent hexes)' : '';
  logger.info(`✅ [foundSettlementExecution] Successfully founded ${settlementData.name}${firstSettlementMsg}`);
}
