/**
 * BountyEditorHandlers - Handles bounty (commodity) editing on map hexes
 * Allows adding/removing up to 4 commodity items per hex
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

export type CommodityType = 'food' | 'lumber' | 'stone' | 'ore' | 'gold';

const MAX_COMMODITIES_PER_HEX = 4;

export class BountyEditorHandlers {
  /**
   * Add one commodity to a hex
   * - Increments count for this commodity type (up to max 4 total items per hex)
   */
  async addCommodity(hexId: string, commodityType: CommodityType): Promise<void> {
    logger.info(`[BountyEditorHandlers] Adding ${commodityType} to hex ${hexId}`);
    
    await updateKingdom((kingdom) => {
      const hex = kingdom.hexes.find(h => h.id === hexId);
      
      if (!hex) {
        logger.warn(`[BountyEditorHandlers] Hex ${hexId} not found`);
        return;
      }
      
      // Initialize commodities if not present
      if (!hex.commodities) {
        hex.commodities = {};
      }
      
      // Count total commodities on this hex
      const totalCommodities = Object.values(hex.commodities).reduce((sum, count) => sum + count, 0);
      
      // Check if we can add more
      if (totalCommodities >= MAX_COMMODITIES_PER_HEX) {
        logger.warn(`[BountyEditorHandlers] Hex ${hexId} already has ${MAX_COMMODITIES_PER_HEX} commodities`);
        ui.notifications?.warn(`This hex already has ${MAX_COMMODITIES_PER_HEX} commodities (maximum)`);
        return;
      }
      
      // Add one to this commodity type
      const currentCount = hex.commodities[commodityType] || 0;
      hex.commodities[commodityType] = currentCount + 1;
      logger.info(`[BountyEditorHandlers] Added ${commodityType} to hex ${hexId} (now ${currentCount + 1})`);
    });
  }
  
  /**
   * Remove one commodity from a hex
   * - Decrements count for this commodity type
   * - Removes the type entirely if count reaches 0
   */
  async removeCommodity(hexId: string, commodityType: CommodityType): Promise<void> {
    logger.info(`[BountyEditorHandlers] Removing ${commodityType} from hex ${hexId}`);
    
    await updateKingdom((kingdom) => {
      const hex = kingdom.hexes.find(h => h.id === hexId);
      
      if (!hex || !hex.commodities) {
        logger.warn(`[BountyEditorHandlers] No commodities to remove from hex ${hexId}`);
        return;
      }
      
      const currentCount = hex.commodities[commodityType] || 0;
      
      if (currentCount <= 0) {
        logger.warn(`[BountyEditorHandlers] No ${commodityType} to remove from hex ${hexId}`);
        return;
      }
      
      // Decrement count
      const newCount = currentCount - 1;
      
      if (newCount <= 0) {
        // Remove this commodity type entirely
        delete hex.commodities[commodityType];
        logger.info(`[BountyEditorHandlers] Removed ${commodityType} from hex ${hexId} (none left)`);
      } else {
        hex.commodities[commodityType] = newCount;
        logger.info(`[BountyEditorHandlers] Removed ${commodityType} from hex ${hexId} (now ${newCount})`);
      }
      
      // Clean up empty commodities object
      if (Object.keys(hex.commodities).length === 0) {
        delete hex.commodities;
      }
    });
  }
  
  /**
   * Clear all commodities from a hex
   */
  async clearCommodities(hexId: string): Promise<void> {
    logger.info(`[BountyEditorHandlers] Clearing all commodities from hex ${hexId}`);
    
    await updateKingdom((kingdom) => {
      const hex = kingdom.hexes.find(h => h.id === hexId);
      
      if (!hex) {
        logger.warn(`[BountyEditorHandlers] Hex ${hexId} not found`);
        return;
      }
      
      delete hex.commodities;
    });
  }
}
