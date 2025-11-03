/**
 * WaterFeatureService - Manages lake and swamp water features
 * 
 * Responsibilities:
 * - Auto-populate swamps from terrain='swamp' hexes
 * - Validate feature placement (mutually exclusive)
 * - Toggle lakes/swamps on/off
 */

import { getKingdomData, updateKingdom } from '../../stores/KingdomStore';
import type { WaterFeature } from '../../actors/KingdomActor';
import { logger } from '../../utils/Logger';

export class WaterFeatureService {
  /**
   * Ensure all hexes with terrain='swamp' have swamp features
   * Called on kingdom load and after terrain changes
   */
  async ensureSwampFeatures(): Promise<void> {
    const kingdom = getKingdomData();
    if (!kingdom.hexes) return;

    logger.info('[WaterFeatureService] Ensuring swamp features for terrain=swamp hexes');

    // Find all hexes with terrain='swamp'
    const swampHexes = kingdom.hexes.filter(h => h.terrain === 'swamp');

    if (swampHexes.length === 0) {
      logger.info('[WaterFeatureService] No swamp terrain hexes found');
      return;
    }

    await updateKingdom(kingdom => {
      // Initialize waterFeatures if not present
      if (!kingdom.waterFeatures) {
        kingdom.waterFeatures = { lakes: [], swamps: [] };
      }

      let added = 0;

      for (const hex of swampHexes) {
        // Check if swamp feature already exists
        const hasSwamp = kingdom.waterFeatures.swamps.some(
          s => s.hexI === hex.row && s.hexJ === hex.col
        );

        if (!hasSwamp) {
          // Add swamp feature
          kingdom.waterFeatures.swamps.push({
            id: crypto.randomUUID(),
            hexI: hex.row,
            hexJ: hex.col
          });
          added++;
        }
      }

      if (added > 0) {
        logger.info(`[WaterFeatureService] ✅ Added ${added} swamp features`);
      } else {
        logger.info('[WaterFeatureService] All swamp terrain hexes already have features');
      }
    });
  }

  /**
   * Toggle lake feature on a hex
   * Removes swamp if present (mutually exclusive)
   * 
   * @returns true if lake was added, false if removed
   */
  async toggleLake(hexI: number, hexJ: number): Promise<boolean> {
    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.waterFeatures) {
        kingdom.waterFeatures = { lakes: [], swamps: [] };
      }

      // Check if lake already exists
      const existingIndex = kingdom.waterFeatures.lakes.findIndex(
        l => l.hexI === hexI && l.hexJ === hexJ
      );

      if (existingIndex !== -1) {
        // Remove existing lake
        kingdom.waterFeatures.lakes.splice(existingIndex, 1);
        logger.info(`[WaterFeatureService] ❌ Removed lake at (${hexI}, ${hexJ})`);
        wasAdded = false;
      } else {
        // Remove swamp if present (mutually exclusive)
        const swampIndex = kingdom.waterFeatures.swamps.findIndex(
          s => s.hexI === hexI && s.hexJ === hexJ
        );
        if (swampIndex !== -1) {
          // Check if this is a terrain='swamp' hex (cannot remove)
          const hex = kingdom.hexes.find(h => h.row === hexI && h.col === hexJ);
          if (hex?.terrain === 'swamp') {
            logger.warn('[WaterFeatureService] Cannot remove swamp feature from terrain=swamp hex');
            return;
          }
          kingdom.waterFeatures.swamps.splice(swampIndex, 1);
          logger.info(`[WaterFeatureService] ⚠️ Removed swamp at (${hexI}, ${hexJ}) (replaced by lake)`);
        }

        // Add lake
        kingdom.waterFeatures.lakes.push({
          id: crypto.randomUUID(),
          hexI,
          hexJ
        });
        logger.info(`[WaterFeatureService] ✅ Added lake at (${hexI}, ${hexJ})`);
        wasAdded = true;
      }
    });

    return wasAdded;
  }

  /**
   * Toggle swamp feature on a hex
   * Removes lake if present (mutually exclusive)
   * Locked if terrain='swamp' (cannot remove)
   * 
   * @returns true if swamp was added, false if removed (or locked)
   */
  async toggleSwamp(hexI: number, hexJ: number): Promise<boolean> {
    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.waterFeatures) {
        kingdom.waterFeatures = { lakes: [], swamps: [] };
      }

      // Check if this is a terrain='swamp' hex (locked)
      const hex = kingdom.hexes.find(h => h.row === hexI && h.col === hexJ);
      const isSwampTerrain = hex?.terrain === 'swamp';

      // Check if swamp already exists
      const existingIndex = kingdom.waterFeatures.swamps.findIndex(
        s => s.hexI === hexI && s.hexJ === hexJ
      );

      if (existingIndex !== -1) {
        // Cannot remove if terrain='swamp'
        if (isSwampTerrain) {
          logger.warn('[WaterFeatureService] ⚠️ Cannot remove swamp feature from terrain=swamp hex (locked)');
          wasAdded = true; // Return true to indicate it's locked
          return;
        }

        // Remove swamp
        kingdom.waterFeatures.swamps.splice(existingIndex, 1);
        logger.info(`[WaterFeatureService] ❌ Removed swamp at (${hexI}, ${hexJ})`);
        wasAdded = false;
      } else {
        // Remove lake if present (mutually exclusive)
        const lakeIndex = kingdom.waterFeatures.lakes.findIndex(
          l => l.hexI === hexI && l.hexJ === hexJ
        );
        if (lakeIndex !== -1) {
          kingdom.waterFeatures.lakes.splice(lakeIndex, 1);
          logger.info(`[WaterFeatureService] ⚠️ Removed lake at (${hexI}, ${hexJ}) (replaced by swamp)`);
        }

        // Add swamp
        kingdom.waterFeatures.swamps.push({
          id: crypto.randomUUID(),
          hexI,
          hexJ
        });
        logger.info(`[WaterFeatureService] ✅ Added swamp at (${hexI}, ${hexJ})`);
        wasAdded = true;
      }
    });

    return wasAdded;
  }

  /**
   * Check if a hex has a lake feature
   */
  hasLake(hexI: number, hexJ: number): boolean {
    const kingdom = getKingdomData();
    return kingdom.waterFeatures?.lakes.some(
      l => l.hexI === hexI && l.hexJ === hexJ
    ) ?? false;
  }

  /**
   * Check if a hex has a swamp feature
   */
  hasSwamp(hexI: number, hexJ: number): boolean {
    const kingdom = getKingdomData();
    return kingdom.waterFeatures?.swamps.some(
      s => s.hexI === hexI && s.hexJ === hexJ
    ) ?? false;
  }
}

/**
 * Singleton instance
 */
export const waterFeatureService = new WaterFeatureService();
