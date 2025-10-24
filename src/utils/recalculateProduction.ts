/**
 * Worksite Production Recalculation Utility
 * 
 * Provides a helper function to recalculate worksiteProduction whenever hexes change.
 * This maintains data consistency between hexes and the stored production values.
 * 
 * IMPORTANT: Call this function whenever:
 * - Claiming/unclaiming hexes
 * - Adding/removing worksites
 * - Modifying worksite types
 * - Importing from Kingmaker
 */

import { getKingdomActor } from '../stores/KingdomStore';
import { Hex, Worksite, WorksiteType } from '../models/Hex';
import { calculateProduction } from '../services/economics/production';
import { logger } from './Logger';
import type { TerrainType } from '../types/terrain';

/**
 * Recalculate worksiteProduction from current hexes
 * 
 * This function:
 * 1. Reads current hexes from kingdom data
 * 2. Calculates production using the economics service
 * 3. Updates worksiteProduction and worksiteProductionByHex
 * 
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function recalculateWorksiteProduction(): Promise<boolean> {
  try {
    logger.debug('[Production Recalc] Starting worksite production recalculation...');
    
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[Production Recalc] No kingdom actor available');
      return false;
    }
    
    // Get current kingdom data
    const kingdom = actor.getKingdomData();
    if (!kingdom || !kingdom.hexes) {
      logger.warn('[Production Recalc] No kingdom data or hexes available');
      return false;
    }
    
    // Convert stored hex data to Hex instances for calculation
    const hexes: Hex[] = kingdom.hexes.map((hexData: any) => {
      const row = hexData.row ?? parseInt(hexData.id.split('.')[0]);
      const col = hexData.col ?? parseInt(hexData.id.split('.')[1]);
      
      return new Hex(
        row,
        col,
        hexData.terrain as TerrainType,
        hexData.travel || 'open',
        hexData.worksite ? new Worksite(hexData.worksite.type as WorksiteType) : null,
        hexData.hasCommodityBonus || hexData.hasSpecialTrait || false,
        hexData.name || null,
        hexData.claimedBy ?? 0,
        hexData.hasRoad || false,
        hexData.fortified || 0,
        hexData.kingmakerFeatures || hexData.features || []
      );
    });
    
    // Calculate production using economics service
    const result = calculateProduction(hexes, []);
    
    // Update kingdom data with recalculated production
    await actor.updateKingdomData(kingdom => {
      // Convert Map to object for storage
      kingdom.worksiteProduction = Object.fromEntries(result.totalProduction);
      
      // Convert byHex array to storage format
      kingdom.worksiteProductionByHex = result.byHex.map((entry: any) => [
        {
          id: entry.hex.id,
          name: entry.hex.name || `Hex ${entry.hex.id}`,
          terrain: entry.hex.terrain
        },
        entry.production
      ]);
      
      logger.debug('[Production Recalc] Updated worksite production:', {
        totalProduction: kingdom.worksiteProduction,
        hexCount: kingdom.worksiteProductionByHex.length
      });
    });
    
    logger.info('[Production Recalc] ✅ Worksite production recalculated successfully');
    return true;
    
  } catch (error) {
    logger.error('[Production Recalc] ❌ Failed to recalculate worksite production:', error);
    return false;
  }
}

/**
 * Convenience function for use in territory service after hex updates
 * Silently fails if recalculation is not possible
 */
export async function tryRecalculateProduction(): Promise<void> {
  try {
    await recalculateWorksiteProduction();
  } catch (error) {
    // Silent failure - don't block territory operations
    logger.debug('[Production Recalc] Recalculation skipped:', error);
  }
}
