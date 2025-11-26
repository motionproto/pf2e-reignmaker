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
   * Toggle waterfall on a river segment
   * Waterfalls block naval travel but not swimmers
   * Uses segment detection (like scissors tool)
   * 
   * @param clickPos - Click position { x, y }
   * @returns true if waterfall was added, false if removed, null if no segment found
   */
  async toggleWaterfall(clickPos: { x: number; y: number }): Promise<boolean | null> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return null;

    const kingdom = getKingdomData();
    const paths = kingdom.rivers?.paths;
    if (!paths || paths.length === 0) return null;

    // Find closest segment using scissors tool pattern
    const segmentResult = this.findClosestSegment(clickPos, paths, canvas);
    if (!segmentResult) return null;

    const { pathId, segmentIndex, position } = segmentResult;

    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.rivers) {
        kingdom.rivers = { paths: [], crossings: [] };
      }
      if (!kingdom.rivers.waterfalls) {
        kingdom.rivers.waterfalls = [];
      }

      // Check if waterfall already exists on this segment
      const existingIndex = kingdom.rivers.waterfalls.findIndex(
        w => w.pathId === pathId && w.segmentIndex === segmentIndex
      );

      if (existingIndex !== -1) {
        // Remove existing waterfall
        kingdom.rivers.waterfalls.splice(existingIndex, 1);
        logger.info(`[WaterFeatureService] ❌ Removed waterfall from path ${pathId}, segment ${segmentIndex}`);
        wasAdded = false;
      } else {
        // Add waterfall
        kingdom.rivers.waterfalls.push({
          id: crypto.randomUUID(),
          pathId,
          segmentIndex,
          position
        });
        logger.info(`[WaterFeatureService] ✅ Added waterfall to path ${pathId}, segment ${segmentIndex}, position ${position.toFixed(2)}`);
        wasAdded = true;
      }
    });

    return wasAdded;
  }

  /**
   * Toggle bridge crossing on a river segment
   * Bridges allow grounded armies to cross water
   * Uses segment detection (like scissors tool)
   * 
   * @param clickPos - Click position { x, y }
   * @returns true if bridge was added, false if removed, null if no segment found
   */
  async toggleBridge(clickPos: { x: number; y: number }): Promise<boolean | null> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return null;

    const kingdom = getKingdomData();
    const paths = kingdom.rivers?.paths;
    if (!paths || paths.length === 0) return null;

    // Find closest segment using scissors tool pattern
    const segmentResult = this.findClosestSegment(clickPos, paths, canvas);
    if (!segmentResult) return null;

    const { pathId, segmentIndex, position } = segmentResult;

    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.rivers) {
        kingdom.rivers = { paths: [], crossings: [] };
      }
      if (!kingdom.rivers.crossings) {
        kingdom.rivers.crossings = [];
      }

      // Check if bridge already exists on this segment
      const existingIndex = kingdom.rivers.crossings.findIndex(
        c => c.pathId === pathId && c.segmentIndex === segmentIndex && c.type === 'bridge'
      );

      if (existingIndex !== -1) {
        // Remove existing bridge
        kingdom.rivers.crossings.splice(existingIndex, 1);
        logger.info(
          `[WaterFeatureService] ❌ Removed bridge from path ${pathId}, segment ${segmentIndex}`
        );
        wasAdded = false;
      } else {
        // Remove ford if present (mutually exclusive)
        const fordIndex = kingdom.rivers.crossings.findIndex(
          c => c.pathId === pathId && c.segmentIndex === segmentIndex && c.type === 'ford'
        );
        if (fordIndex !== -1) {
          kingdom.rivers.crossings.splice(fordIndex, 1);
          logger.info(
            `[WaterFeatureService] ⚠️ Removed ford from path ${pathId}, segment ${segmentIndex} (replaced by bridge)`
          );
        }

        // Add bridge
        kingdom.rivers.crossings.push({
          id: crypto.randomUUID(),
          pathId,
          segmentIndex,
          position,
          type: 'bridge'
        });
        logger.info(
          `[WaterFeatureService] ✅ Added bridge to path ${pathId}, segment ${segmentIndex}, position ${position.toFixed(
            2
          )}`
        );
        wasAdded = true;
      }
    });

    return wasAdded;
  }

  /**
   * Toggle ford crossing on a river segment
   * Fords allow grounded armies to cross water (natural shallow crossing)
   * Uses segment detection (like scissors tool)
   * 
   * @param clickPos - Click position { x, y }
   * @returns true if ford was added, false if removed, null if no segment found
   */
  async toggleFord(clickPos: { x: number; y: number }): Promise<boolean | null> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return null;

    const kingdom = getKingdomData();
    const paths = kingdom.rivers?.paths;
    if (!paths || paths.length === 0) return null;

    // Find closest segment using scissors tool pattern
    const segmentResult = this.findClosestSegment(clickPos, paths, canvas);
    if (!segmentResult) return null;

    const { pathId, segmentIndex, position } = segmentResult;

    let wasAdded = false;

    await updateKingdom(kingdom => {
      if (!kingdom.rivers) {
        kingdom.rivers = { paths: [], crossings: [] };
      }
      if (!kingdom.rivers.crossings) {
        kingdom.rivers.crossings = [];
      }

      // Check if ford already exists on this segment
      const existingIndex = kingdom.rivers.crossings.findIndex(
        c => c.pathId === pathId && c.segmentIndex === segmentIndex && c.type === 'ford'
      );

      if (existingIndex !== -1) {
        // Remove existing ford
        kingdom.rivers.crossings.splice(existingIndex, 1);
        logger.info(
          `[WaterFeatureService] ❌ Removed ford from path ${pathId}, segment ${segmentIndex}`
        );
        wasAdded = false;
      } else {
        // Remove bridge if present (mutually exclusive)
        const bridgeIndex = kingdom.rivers.crossings.findIndex(
          c => c.pathId === pathId && c.segmentIndex === segmentIndex && c.type === 'bridge'
        );
        if (bridgeIndex !== -1) {
          kingdom.rivers.crossings.splice(bridgeIndex, 1);
          logger.info(
            `[WaterFeatureService] ⚠️ Removed bridge from path ${pathId}, segment ${segmentIndex} (replaced by ford)`
          );
        }

        // Add ford
        kingdom.rivers.crossings.push({
          id: crypto.randomUUID(),
          pathId,
          segmentIndex,
          position,
          type: 'ford'
        });
        logger.info(
          `[WaterFeatureService] ✅ Added ford to path ${pathId}, segment ${segmentIndex}, position ${position.toFixed(
            2
          )}`
        );
        wasAdded = true;
      }
    });

    return wasAdded;
  }

  /**
   * Find the closest river segment to a click position
   * Reuses scissors tool pattern from RiverEditorHandlers
   * 
   * @param clickPos - Click position { x, y }
   * @param paths - River paths
   * @param canvas - Foundry canvas
   * @returns Segment info (pathId, segmentIndex, position) or null
   */
  private findClosestSegment(
    clickPos: { x: number; y: number },
    paths: Array<{ id: string; points: Array<{ hexI: number; hexJ: number; edge?: string; isCenter?: boolean; order: number }> }>,
    canvas: any
  ): { pathId: string; segmentIndex: number; position: number } | null {
    let closestPath: typeof paths[0] | null = null;
    let closestSegmentIndex = -1;
    let closestT = 0.5; // Default to middle of segment
    let minDistance = Infinity;
    const CLICK_THRESHOLD = 20; // pixels

    logger.info(`[WaterFeatureService] findClosestSegment: Checking ${paths.length} paths`);

    for (const path of paths) {
      const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
      logger.info(`[WaterFeatureService]   Path ${path.id}: ${sortedPoints.length} points, ${sortedPoints.length - 1} segments`);

      // Check each segment (pair of consecutive points)
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i + 1];

        // Get screen positions - ensure we have valid edge data
        let pos1, pos2;
        
        if (p1.isCenter) {
          pos1 = getHexCenter(p1.hexI, p1.hexJ, canvas);
        } else if (p1.edge) {
          pos1 = getEdgeMidpoint(p1.hexI, p1.hexJ, p1.edge as any, canvas);
        } else {
          logger.warn(`[WaterFeatureService]     Point ${i} missing edge/center data`);
          continue;
        }

        if (p2.isCenter) {
          pos2 = getHexCenter(p2.hexI, p2.hexJ, canvas);
        } else if (p2.edge) {
          pos2 = getEdgeMidpoint(p2.hexI, p2.hexJ, p2.edge as any, canvas);
        } else {
          logger.warn(`[WaterFeatureService]     Point ${i+1} missing edge/center data`);
          continue;
        }

        if (!pos1 || !pos2) {
          logger.warn(`[WaterFeatureService]     Segment ${i} missing positions`);
          continue;
        }

        // Calculate distance from click to line segment
        const result = this.distanceToSegmentWithPosition(clickPos, pos1, pos2);

        logger.info(`[WaterFeatureService]     Segment ${i}: distance=${result.distance.toFixed(1)}px (threshold=${CLICK_THRESHOLD}px)`);

        if (result.distance < minDistance && result.distance < CLICK_THRESHOLD) {
          minDistance = result.distance;
          closestPath = path;
          closestSegmentIndex = i;
          closestT = result.t;
          logger.info(`[WaterFeatureService]       ✅ New closest segment! distance=${result.distance.toFixed(1)}px`);
        }
      }
    }

    if (!closestPath || closestSegmentIndex === -1) {
      logger.info(`[WaterFeatureService]   ❌ No segment found within ${CLICK_THRESHOLD}px threshold (minDistance=${minDistance.toFixed(1)}px)`);
      return null;
    }

    logger.info(`[WaterFeatureService]   ✅ Found segment: path=${closestPath.id}, segment=${closestSegmentIndex}, position=${closestT.toFixed(2)}, distance=${minDistance.toFixed(1)}px`);
    return {
      pathId: closestPath.id,
      segmentIndex: closestSegmentIndex,
      position: closestT
    };
  }

  /**
   * Calculate distance from point to line segment and return position along segment
   * 
   * @param point - Click position
   * @param lineStart - Segment start
   * @param lineEnd - Segment end
   * @returns Distance and t parameter (0.0-1.0 position along segment)
   */
  private distanceToSegmentWithPosition(
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ): { distance: number; t: number } {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // Line segment is a point
      const pdx = point.x - lineStart.x;
      const pdy = point.y - lineStart.y;
      return { distance: Math.sqrt(pdx * pdx + pdy * pdy), t: 0.5 };
    }

    // Calculate projection of point onto line
    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

    // Find closest point on segment
    const closestX = lineStart.x + t * dx;
    const closestY = lineStart.y + t * dy;

    // Return distance to closest point and t parameter
    const distX = point.x - closestX;
    const distY = point.y - closestY;
    return { distance: Math.sqrt(distX * distX + distY * distY), t };
  }
}

/**
 * Singleton instance
 */
export const waterFeatureService = new WaterFeatureService();
