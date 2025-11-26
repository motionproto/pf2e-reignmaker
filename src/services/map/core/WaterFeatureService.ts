/**
 * WaterFeatureService - Manages lake and swamp water features
 * 
 * Responsibilities:
 * - Auto-populate swamps from terrain='swamp' hexes
 * - Validate feature placement (mutually exclusive)
 * - Toggle lakes/swamps on/off
 */

import { getKingdomData, updateKingdom } from '../../../stores/KingdomStore';
import type { WaterFeature } from '../../../actors/KingdomActor';
import { logger } from '../../../utils/Logger';
import { getHexCenter, getEdgeMidpoint } from '../../../utils/riverUtils';
import { getConnectorAtPosition } from '../renderers/RiverConnectorRenderer';

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
        kingdom.waterFeatures = { lakes: [], swamps: [], waterfalls: [] };
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
   * @param hexI - Hex row coordinate
   * @param hexJ - Hex column coordinate
   * @param forceRemove - If true, always remove (Ctrl+click behavior)
   * @returns true if lake was added, false if removed
   */
  async toggleLake(hexI: number, hexJ: number, forceRemove: boolean = false): Promise<boolean> {
    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.waterFeatures) {
        kingdom.waterFeatures = { lakes: [], swamps: [], waterfalls: [] };
      }

      // Check if lake already exists
      const existingIndex = kingdom.waterFeatures.lakes.findIndex(
        l => l.hexI === hexI && l.hexJ === hexJ
      );

      if (existingIndex !== -1 || forceRemove) {
        // Remove existing lake (or any feature if Ctrl+click)
        if (existingIndex !== -1) {
          kingdom.waterFeatures.lakes.splice(existingIndex, 1);
          logger.info(`[WaterFeatureService] ❌ Removed lake at (${hexI}, ${hexJ})`);
        }
        
        // Also remove swamp if Ctrl+click (force remove all water features)
        if (forceRemove) {
          const swampIndex = kingdom.waterFeatures.swamps.findIndex(
            s => s.hexI === hexI && s.hexJ === hexJ
          );
          if (swampIndex !== -1) {
            // Check if this is a terrain='swamp' hex (cannot remove)
            const hex = kingdom.hexes.find(h => h.row === hexI && h.col === hexJ);
            if (hex?.terrain !== 'swamp') {
              kingdom.waterFeatures.swamps.splice(swampIndex, 1);
              logger.info(`[WaterFeatureService] ❌ Removed swamp at (${hexI}, ${hexJ}) (Ctrl+click)`);
            }
          }
        }
        
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
   * Locked if terrain='swamp' (cannot remove unless forceRemove)
   * 
   * @param hexI - Hex row coordinate
   * @param hexJ - Hex column coordinate
   * @param forceRemove - If true, always remove (Ctrl+click behavior)
   * @returns true if swamp was added, false if removed (or locked)
   */
  async toggleSwamp(hexI: number, hexJ: number, forceRemove: boolean = false): Promise<boolean> {
    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.waterFeatures) {
        kingdom.waterFeatures = { lakes: [], swamps: [], waterfalls: [] };
      }

      // Check if this is a terrain='swamp' hex (locked)
      const hex = kingdom.hexes.find(h => h.row === hexI && h.col === hexJ);
      const isSwampTerrain = hex?.terrain === 'swamp';

      // Check if swamp already exists
      const existingIndex = kingdom.waterFeatures.swamps.findIndex(
        s => s.hexI === hexI && s.hexJ === hexJ
      );

      if (existingIndex !== -1 || forceRemove) {
        // Cannot remove if terrain='swamp' (unless forced)
        if (isSwampTerrain && !forceRemove) {
          logger.warn('[WaterFeatureService] ⚠️ Cannot remove swamp feature from terrain=swamp hex (locked)');
          wasAdded = true; // Return true to indicate it's locked
          return;
        }

        // Remove swamp
        if (existingIndex !== -1) {
          kingdom.waterFeatures.swamps.splice(existingIndex, 1);
          logger.info(`[WaterFeatureService] ❌ Removed swamp at (${hexI}, ${hexJ})`);
        }
        
        // Also remove lake if Ctrl+click (force remove all water features)
        if (forceRemove) {
          const lakeIndex = kingdom.waterFeatures.lakes.findIndex(
            l => l.hexI === hexI && l.hexJ === hexJ
          );
          if (lakeIndex !== -1) {
            kingdom.waterFeatures.lakes.splice(lakeIndex, 1);
            logger.info(`[WaterFeatureService] ❌ Removed lake at (${hexI}, ${hexJ}) (Ctrl+click)`);
          }
        }
        
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

  /**
   * Toggle waterfall on a connection point
   * Waterfalls block naval travel but not swimmers
   * Uses connector detection (same as river editing)
   * 
   * @param hexId - Hex ID (e.g., "5.10")
   * @param clickPos - Click position { x, y }
   * @returns true if waterfall was added, false if removed, null if no connector found
   */
  async toggleWaterfall(hexId: string, clickPos: { x: number; y: number }): Promise<boolean | null> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return null;

    // Parse hex ID
    const parts = hexId.split('.');
    if (parts.length !== 2) return null;
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return null;

    // Get connector at click position
    const connector = getConnectorAtPosition(hexI, hexJ, clickPos, canvas);
    if (!connector) {
      logger.info('[WaterFeatureService] ❌ No connector at click position for waterfall');
      return null;
    }

    // Extract connection point data
    let isCenter = false;
    let edge: string | undefined;
    let cornerIndex: number | undefined;

    if ('center' in connector) {
      isCenter = true;
    } else if ('edge' in connector) {
      edge = connector.edge;
    } else if ('cornerIndex' in connector) {
      cornerIndex = connector.cornerIndex;
    }

    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.rivers) {
        kingdom.rivers = { paths: [], crossings: [], waterfalls: [] };
      }
      if (!kingdom.rivers.waterfalls) {
        kingdom.rivers.waterfalls = [];
      }

      // Check if waterfall already exists at this connection point
      const existingIndex = kingdom.rivers.waterfalls.findIndex(
        w => w.hexI === hexI && w.hexJ === hexJ && 
             w.edge === edge && w.isCenter === isCenter && 
             w.cornerIndex === cornerIndex
      );

      if (existingIndex !== -1) {
        // Remove existing waterfall
        kingdom.rivers.waterfalls.splice(existingIndex, 1);
        logger.info(
          `[WaterFeatureService] ❌ Removed waterfall from (${hexI},${hexJ}) ${isCenter ? 'center' : edge || `corner ${cornerIndex}`}`
        );
        wasAdded = false;
      } else {
        // Add waterfall
        kingdom.rivers.waterfalls.push({
          id: crypto.randomUUID(),
          hexI,
          hexJ,
          edge,
          isCenter,
          cornerIndex
        });
        logger.info(
          `[WaterFeatureService] ✅ Added waterfall at (${hexI},${hexJ}) ${isCenter ? 'center' : edge || `corner ${cornerIndex}`}`
        );
        wasAdded = true;
      }
    });

    return wasAdded;
  }

  /**
   * Toggle bridge crossing on a connection point
   * Bridges allow grounded armies to cross water
   * Uses connector detection (same as river editing)
   * 
   * @param hexId - Hex ID (e.g., "5.10")
   * @param clickPos - Click position { x, y }
   * @returns true if bridge was added, false if removed, null if no connector found
   */
  async toggleBridge(hexId: string, clickPos: { x: number; y: number }): Promise<boolean | null> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return null;

    // Parse hex ID
    const parts = hexId.split('.');
    if (parts.length !== 2) return null;
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return null;

    // Get connector at click position
    const connector = getConnectorAtPosition(hexI, hexJ, clickPos, canvas);
    if (!connector) {
      logger.info('[WaterFeatureService] ❌ No connector at click position');
      return null;
    }

    // Extract connection point data
    let isCenter = false;
    let edge: string | undefined;
    let cornerIndex: number | undefined;

    if ('center' in connector) {
      isCenter = true;
    } else if ('edge' in connector) {
      edge = connector.edge;
    } else if ('cornerIndex' in connector) {
      cornerIndex = connector.cornerIndex;
    }

    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.rivers) {
        kingdom.rivers = { paths: [], crossings: [] };
      }
      if (!kingdom.rivers.crossings) {
        kingdom.rivers.crossings = [];
      }

      // Check if bridge already exists at this connection point
      const existingIndex = kingdom.rivers.crossings.findIndex(
        c => c.hexI === hexI && c.hexJ === hexJ && 
             c.edge === edge && c.isCenter === isCenter && 
             c.cornerIndex === cornerIndex && c.type === 'bridge'
      );

      if (existingIndex !== -1) {
        // Remove existing bridge
        kingdom.rivers.crossings.splice(existingIndex, 1);
        logger.info(
          `[WaterFeatureService] ❌ Removed bridge from (${hexI},${hexJ}) ${isCenter ? 'center' : edge || `corner ${cornerIndex}`}`
        );
        wasAdded = false;
      } else {
        // Remove ford if present (mutually exclusive)
        const fordIndex = kingdom.rivers.crossings.findIndex(
          c => c.hexI === hexI && c.hexJ === hexJ && 
               c.edge === edge && c.isCenter === isCenter && 
               c.cornerIndex === cornerIndex && c.type === 'ford'
        );
        if (fordIndex !== -1) {
          kingdom.rivers.crossings.splice(fordIndex, 1);
          logger.info(
            `[WaterFeatureService] ⚠️ Removed ford from (${hexI},${hexJ}) ${isCenter ? 'center' : edge || `corner ${cornerIndex}`} (replaced by bridge)`
          );
        }

        // Add bridge
        kingdom.rivers.crossings.push({
          id: crypto.randomUUID(),
          hexI,
          hexJ,
          edge,
          isCenter,
          cornerIndex,
          type: 'bridge'
        });
        logger.info(
          `[WaterFeatureService] ✅ Added bridge at (${hexI},${hexJ}) ${isCenter ? 'center' : edge || `corner ${cornerIndex}`}`
        );
        wasAdded = true;
      }
    });

    return wasAdded;
  }

  /**
   * Toggle ford crossing on a connection point
   * Fords allow grounded armies to cross water (natural shallow crossing)
   * Uses connector detection (same as river editing)
   * 
   * @param hexId - Hex ID (e.g., "5.10")
   * @param clickPos - Click position { x, y }
   * @returns true if ford was added, false if removed, null if no connector found
   */
  async toggleFord(hexId: string, clickPos: { x: number; y: number }): Promise<boolean | null> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return null;

    // Parse hex ID
    const parts = hexId.split('.');
    if (parts.length !== 2) return null;
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return null;

    // Get connector at click position
    const connector = getConnectorAtPosition(hexI, hexJ, clickPos, canvas);
    if (!connector) {
      logger.info('[WaterFeatureService] ❌ No connector at click position');
      return null;
    }

    // Extract connection point data
    let isCenter = false;
    let edge: string | undefined;
    let cornerIndex: number | undefined;

    if ('center' in connector) {
      isCenter = true;
    } else if ('edge' in connector) {
      edge = connector.edge;
    } else if ('cornerIndex' in connector) {
      cornerIndex = connector.cornerIndex;
    }

    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.rivers) {
        kingdom.rivers = { paths: [], crossings: [] };
      }
      if (!kingdom.rivers.crossings) {
        kingdom.rivers.crossings = [];
      }

      // Check if ford already exists at this connection point
      const existingIndex = kingdom.rivers.crossings.findIndex(
        c => c.hexI === hexI && c.hexJ === hexJ && 
             c.edge === edge && c.isCenter === isCenter && 
             c.cornerIndex === cornerIndex && c.type === 'ford'
      );

      if (existingIndex !== -1) {
        // Remove existing ford
        kingdom.rivers.crossings.splice(existingIndex, 1);
        logger.info(
          `[WaterFeatureService] ❌ Removed ford from (${hexI},${hexJ}) ${isCenter ? 'center' : edge || `corner ${cornerIndex}`}`
        );
        wasAdded = false;
      } else {
        // Remove bridge if present (mutually exclusive)
        const bridgeIndex = kingdom.rivers.crossings.findIndex(
          c => c.hexI === hexI && c.hexJ === hexJ && 
               c.edge === edge && c.isCenter === isCenter && 
               c.cornerIndex === cornerIndex && c.type === 'bridge'
        );
        if (bridgeIndex !== -1) {
          kingdom.rivers.crossings.splice(bridgeIndex, 1);
          logger.info(
            `[WaterFeatureService] ⚠️ Removed bridge from (${hexI},${hexJ}) ${isCenter ? 'center' : edge || `corner ${cornerIndex}`} (replaced by ford)`
          );
        }

        // Add ford
        kingdom.rivers.crossings.push({
          id: crypto.randomUUID(),
          hexI,
          hexJ,
          edge,
          isCenter,
          cornerIndex,
          type: 'ford'
        });
        logger.info(
          `[WaterFeatureService] ✅ Added ford at (${hexI},${hexJ}) ${isCenter ? 'center' : edge || `corner ${cornerIndex}`}`
        );
        wasAdded = true;
      }
    });

    return wasAdded;
  }

}

/**
 * Singleton instance
 */
export const waterFeatureService = new WaterFeatureService();
