/**
 * WaterwayLookup - Efficient hex-to-waterway detection service
 * 
 * Builds lookup maps from kingdom waterway data (rivers, lakes, swamps, waterfalls, crossings)
 * to quickly determine what waterway features are present on each hex.
 * 
 * Reactive: Automatically rebuilds when kingdom data changes.
 */

import type { KingdomData, RiverPath, WaterFeature, RiverCrossing } from '../../actors/KingdomActor';
import { kingdomData } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { getEdgeIdForDirection, edgeNameToIndex } from '../../utils/edgeUtils';
import type { EdgeDirection } from '../../models/Hex';

export type WaterwayType = 'river' | 'lake' | 'swamp';

/**
 * Per-hex waterway data
 */
interface HexWaterwayData {
  waterways: Set<WaterwayType>;
  crossings: Set<string>;  // Set of crossing types ('bridge', 'ford')
  waterfalls: WaterFeature[];  // Waterfalls on this hex's edges
}

/**
 * River flow direction between two hexes
 * Stores which direction the river flows (from -> to)
 */
interface RiverFlowEdge {
  fromHex: string;  // "hexI,hexJ"
  toHex: string;    // "hexI,hexJ"
  pathId: string;   // Which path this edge belongs to
}

/**
 * WaterwayLookup - Provides fast hex-based waterway queries
 */
export class WaterwayLookup {
  // Map: "hexI,hexJ" → HexWaterwayData
  private hexLookup: Map<string, HexWaterwayData> = new Map();
  
  // Map: "hexI1,hexJ1->hexI2,hexJ2" → RiverFlowEdge
  // Stores flow direction between adjacent river hexes
  private flowEdges: Map<string, RiverFlowEdge> = new Map();
  
  private unsubscribe: (() => void) | null = null;
  
  constructor() {
    // Subscribe to kingdom data changes for automatic reactivity
    this.unsubscribe = kingdomData.subscribe(kingdom => {
      this.buildLookup(kingdom);
    });
  }
  
  /**
   * Get hex key for lookup
   */
  private getHexKey(hexI: number, hexJ: number): string {
    return `${hexI},${hexJ}`;
  }
  
  /**
   * Get or create hex data
   */
  private getOrCreateHexData(hexKey: string): HexWaterwayData {
    if (!this.hexLookup.has(hexKey)) {
      this.hexLookup.set(hexKey, {
        waterways: new Set(),
        crossings: new Set(),
        waterfalls: []
      });
    }
    return this.hexLookup.get(hexKey)!;
  }
  
  /**
   * Build lookup maps from kingdom data
   * Called automatically when kingdom data changes
   */
  private buildLookup(kingdom: KingdomData): void {
    this.hexLookup.clear();
    this.flowEdges.clear();
    
    // Build river lookup (from sequential paths)
    if (kingdom.rivers?.paths) {
      this.buildRiverLookup(kingdom.rivers.paths);
    }
    
    // Build lake lookup
    if (kingdom.waterFeatures?.lakes) {
      this.buildFeatureLookup(kingdom.waterFeatures.lakes, 'lake');
    }
    
    // Build swamp lookup
    if (kingdom.waterFeatures?.swamps) {
      this.buildFeatureLookup(kingdom.waterFeatures.swamps, 'swamp');
    }
    
    // Build waterfall lookup (segment-based, now in rivers.waterfalls)
    if (kingdom.rivers?.waterfalls) {
      this.buildWaterfallLookup(kingdom.rivers.waterfalls, kingdom.rivers.paths);
    }
    
    // Build crossing lookup (for bridges/fords, segment-based)
    if (kingdom.rivers?.crossings) {
      this.buildCrossingLookup(kingdom.rivers.crossings, kingdom.rivers.paths);
    }
    
    // Lookup built successfully (logging removed - this is normal operation)
  }
  
  /**
   * Build river lookup from river paths
   * A hex has a river if ANY path point has matching hexI/hexJ
   * For edge points, mark BOTH hexes that share the edge
   * Also builds flow direction edges between sequential points
   */
  private buildRiverLookup(paths: RiverPath[]): void {
    for (const path of paths) {
      // Sort points by order to get flow direction
      const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
      
      for (let i = 0; i < sortedPoints.length; i++) {
        const point = sortedPoints[i];
        
        // Always mark the primary hex
        const hexKey = this.getHexKey(point.hexI, point.hexJ);
        const hexData = this.getOrCreateHexData(hexKey);
        hexData.waterways.add('river');
        
        // If edge point, also mark the adjacent hex sharing this edge
        if (point.edge && !point.isCenter) {
          const adjacentHex = this.getAdjacentHexForEdge(point.hexI, point.hexJ, point.edge);
          if (adjacentHex) {
            const adjKey = this.getHexKey(adjacentHex.i, adjacentHex.j);
            const adjData = this.getOrCreateHexData(adjKey);
            adjData.waterways.add('river');
          }
        }
        
        // Build flow edge to next point (if exists)
        if (i < sortedPoints.length - 1) {
          const nextPoint = sortedPoints[i + 1];
          const fromKey = this.getHexKey(point.hexI, point.hexJ);
          const toKey = this.getHexKey(nextPoint.hexI, nextPoint.hexJ);
          const edgeKey = `${fromKey}->${toKey}`;
          
          this.flowEdges.set(edgeKey, {
            fromHex: fromKey,
            toHex: toKey,
            pathId: path.id
          });
        }
      }
    }
  }
  
  /**
   * Get the adjacent hex that shares a specific edge
   * Uses canonical edge system for exact accuracy
   */
  private getAdjacentHexForEdge(hexI: number, hexJ: number, edge: string): { i: number; j: number } | null {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return null;
    
    // Use canonical edge system to get both hexes that share this edge
    const edgeIndex = edgeNameToIndex(edge as EdgeDirection);
    const canonicalId = getEdgeIdForDirection(hexI, hexJ, edgeIndex, canvas);
    
    // Edge of map - no neighbor in this direction
    if (!canonicalId) return null;
    
    // Parse canonical ID to get both hexes
    // Format: "hexI:hexJ:edge,hexI2:hexJ2:edge2"
    const parts = canonicalId.split(',');
    if (parts.length !== 2) return null;
    
    for (const part of parts) {
      const [i, j] = part.split(':').map(Number);
      // Return the OTHER hex (not the one we started with)
      if (i !== hexI || j !== hexJ) {
        return { i, j };
      }
    }
    
    return null;
  }
  
  /**
   * Build feature lookup (lakes or swamps)
   */
  private buildFeatureLookup(features: WaterFeature[], type: WaterwayType): void {
    for (const feature of features) {
      const hexKey = this.getHexKey(feature.hexI, feature.hexJ);
      const hexData = this.getOrCreateHexData(hexKey);
      hexData.waterways.add(type);
    }
  }
  
  /**
   * Build waterfall lookup (segment-based)
   * Waterfalls block naval travel but not swimmers
   * 
   * @param waterfalls - Array of segment-based waterfall features
   * @param paths - River paths for segment resolution
   */
  private buildWaterfallLookup(waterfalls: Array<{ id: string; pathId: string; segmentIndex: number; position: number }>, paths: RiverPath[]): void {
    for (const waterfall of waterfalls) {
      // Find the path this waterfall belongs to
      const path = paths.find(p => p.id === waterfall.pathId);
      if (!path) {
        logger.warn(`[WaterwayLookup] Waterfall ${waterfall.id} references missing path ${waterfall.pathId}`);
        continue;
      }
      
      // Get segment points (sorted by order)
      const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
      const point1 = sortedPoints[waterfall.segmentIndex];
      const point2 = sortedPoints[waterfall.segmentIndex + 1];
      
      if (!point1 || !point2) {
        logger.warn(`[WaterwayLookup] Waterfall ${waterfall.id} has invalid segment index ${waterfall.segmentIndex}`);
        continue;
      }
      
      // Mark both hexes in the segment as having a waterfall
      const hex1Key = this.getHexKey(point1.hexI, point1.hexJ);
      const hex2Key = this.getHexKey(point2.hexI, point2.hexJ);
      
      // Create WaterFeature-like object for compatibility with existing code
      const waterfallFeature: WaterFeature = {
        id: waterfall.id,
        hexI: point1.hexI,
        hexJ: point1.hexJ
      };
      
      this.getOrCreateHexData(hex1Key).waterfalls.push(waterfallFeature);
      
      // Only add to second hex if it's different from first
      if (hex1Key !== hex2Key) {
        const waterfallFeature2: WaterFeature = {
          id: waterfall.id,
          hexI: point2.hexI,
          hexJ: point2.hexJ
        };
        this.getOrCreateHexData(hex2Key).waterfalls.push(waterfallFeature2);
      }
    }
  }
  
  /**
   * Build crossing lookup (bridges/fords, segment-based)
   * Crossings allow grounded armies to cross water
   * 
   * @param crossings - Array of segment-based crossing features
   * @param paths - River paths for segment resolution
   */
  private buildCrossingLookup(crossings: RiverCrossing[], paths: RiverPath[]): void {
    for (const crossing of crossings) {
      // Find the path this crossing belongs to
      const path = paths.find(p => p.id === crossing.pathId);
      if (!path) {
        // Silently skip orphaned crossings (paths were deleted but crossing wasn't cleaned up)
        // This is harmless - the crossing just won't be rendered or used for pathfinding
        continue;
      }
      
      // Get segment points (sorted by order)
      const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
      const point1 = sortedPoints[crossing.segmentIndex];
      const point2 = sortedPoints[crossing.segmentIndex + 1];
      
      if (!point1 || !point2) {
        logger.warn(`[WaterwayLookup] Crossing ${crossing.id} has invalid segment index ${crossing.segmentIndex}`);
        continue;
      }
      
      // Mark both hexes in the segment as having a crossing
      const hex1Key = this.getHexKey(point1.hexI, point1.hexJ);
      const hex2Key = this.getHexKey(point2.hexI, point2.hexJ);
      
      this.getOrCreateHexData(hex1Key).crossings.add(crossing.type);
      
      // Only add to second hex if it's different from first
      if (hex1Key !== hex2Key) {
        this.getOrCreateHexData(hex2Key).crossings.add(crossing.type);
      }
    }
  }
  
  /**
   * Check if a hex has a waterfall on a specific edge
   * Waterfalls block naval travel but not swimmers
   */
  hasWaterfall(hexI: number, hexJ: number, edge?: string): boolean {
    const hexKey = this.getHexKey(hexI, hexJ);
    const hexData = this.hexLookup.get(hexKey);
    
    if (!hexData) return false;
    
    // If edge specified, check that specific edge
    if (edge) {
      return hexData.waterfalls.some(w => w.edge === edge);
    }
    
    // Otherwise, check if hex has any waterfalls
    return hexData.waterfalls.length > 0;
  }

  /**
   * Check if hex has a river
   */
  hasRiver(hexI: number, hexJ: number): boolean {
    const hexKey = this.getHexKey(hexI, hexJ);
    return this.hexLookup.get(hexKey)?.waterways.has('river') ?? false;
  }
  
  /**
   * Check if hex has a lake
   */
  hasLake(hexI: number, hexJ: number): boolean {
    const hexKey = this.getHexKey(hexI, hexJ);
    return this.hexLookup.get(hexKey)?.waterways.has('lake') ?? false;
  }
  
  /**
   * Check if hex has a swamp
   */
  hasSwamp(hexI: number, hexJ: number): boolean {
    const hexKey = this.getHexKey(hexI, hexJ);
    return this.hexLookup.get(hexKey)?.waterways.has('swamp') ?? false;
  }
  
  /**
   * Check if hex has any crossing (bridge or ford)
   * Allows grounded armies to cross water
   */
  hasCrossing(hexI: number, hexJ: number, edge?: string): boolean {
    const hexKey = this.getHexKey(hexI, hexJ);
    const hexData = this.hexLookup.get(hexKey);
    
    if (!hexData) return false;
    
    // For now, just check if any crossings exist
    // TODO: Edge-specific crossing check when crossings have edge data
    return hexData.crossings.size > 0;
  }
  
  /**
   * Get all waterway types present on a hex
   */
  getWaterwayTypes(hexI: number, hexJ: number): Set<WaterwayType> {
    const hexKey = this.getHexKey(hexI, hexJ);
    return this.hexLookup.get(hexKey)?.waterways ?? new Set();
  }
  
  /**
   * Check if hex has any water feature (river, lake, or swamp)
   */
  hasAnyWater(hexI: number, hexJ: number): boolean {
    return this.hasRiver(hexI, hexJ) || 
           this.hasLake(hexI, hexJ) || 
           this.hasSwamp(hexI, hexJ);
  }
  
  /**
   * Check if movement between two hexes is upstream
   * Returns true if moving against river flow (+1 cost penalty)
   * Returns false if moving with flow, or not on same river path
   * 
   * @param fromHexI - Source hex row
   * @param fromHexJ - Source hex column
   * @param toHexI - Destination hex row
   * @param toHexJ - Destination hex column
   * @returns true if upstream, false otherwise
   */
  isUpstream(fromHexI: number, fromHexJ: number, toHexI: number, toHexJ: number): boolean {
    // Check if both hexes have rivers
    if (!this.hasRiver(fromHexI, fromHexJ) || !this.hasRiver(toHexI, toHexJ)) {
      return false;
    }
    
    const fromKey = this.getHexKey(fromHexI, fromHexJ);
    const toKey = this.getHexKey(toHexI, toHexJ);
    
    // Check if there's a downstream flow edge from -> to (moving with flow)
    const downstreamKey = `${fromKey}->${toKey}`;
    if (this.flowEdges.has(downstreamKey)) {
      return false; // Moving downstream
    }
    
    // Check if there's an upstream flow edge to -> from (moving against flow)
    const upstreamKey = `${toKey}->${fromKey}`;
    if (this.flowEdges.has(upstreamKey)) {
      return true; // Moving upstream
    }
    
    // Not on same river path, or not adjacent in path
    return false;
  }
  
  /**
   * Cleanup store subscription
   * Call when service is no longer needed
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      logger.debug('[WaterwayLookup] Store subscription cleaned up');
    }
  }
}

// Export singleton instance
export const waterwayLookup = new WaterwayLookup();
