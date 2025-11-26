/**
 * WaterwayLookup - Efficient hex-to-waterway detection service
 * 
 * Builds lookup maps from kingdom waterway data (rivers, lakes, swamps, waterfalls, crossings)
 * to quickly determine what waterway features are present on each hex.
 * 
 * Reactive: Automatically rebuilds when kingdom data changes.
 * 
 * River Crossing Detection:
 * Uses WaterwayGeometryService for precomputed blocked edges.
 * Movement between hexes is blocked if the movement path intersects a river segment
 * without a crossing (bridge/ford).
 */

import type { KingdomData, RiverPath, WaterFeature, RiverCrossing } from '../../actors/KingdomActor';
import { kingdomData } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { getEdgeIdForDirection, edgeNameToIndex } from '../../utils/edgeUtils';
import type { Point } from '../../utils/geometryUtils';
import { waterwayGeometryService } from './WaterwayGeometryService';
import type { EdgeDirection } from '../../models/Hex';

export type WaterwayType = 'river' | 'lake' | 'swamp';

/**
 * River segment with pixel coordinates
 * Used for geometric intersection testing
 */
export interface RiverSegment {
  start: Point;
  end: Point;
  hasCrossing: boolean;  // If true, river "doesn't exist" here - movement allowed
  pathId: string;
  segmentIndex: number;
}

/**
 * Per-hex waterway data
 */
interface HexWaterwayData {
  waterways: Set<WaterwayType>;
  crossings: Set<string>;  // Set of crossing types ('bridge', 'ford')
  waterfalls: WaterFeature[];  // Waterfalls on this hex's edges
  riverSegments: RiverSegment[];  // River line segments passing through this hex
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
  
  // Track last kingdom data for reference
  private lastKingdomData: KingdomData | null = null;
  
  // Track river data hash to avoid unnecessary rebuilds
  private lastRiverDataHash: string = '';
  
  constructor() {
    // Subscribe to kingdom data changes for automatic reactivity
    this.unsubscribe = kingdomData.subscribe(kingdom => {
      this.lastKingdomData = kingdom;
      this.buildLookup(kingdom);
    });
    
    logger.info(`[WaterwayLookup] Initialized - segments will be read from RiverSegmentStore`);
  }
  
  /**
   * Calculate a simple hash of map data to detect changes
   * Includes rivers, lakes, swamps
   */
  private getRiverDataHash(kingdom: KingdomData): string {
    // Create a simple hash from path count, total points, and crossing count
    const pathCount = kingdom.rivers?.paths?.length || 0;
    const pointCount = kingdom.rivers?.paths?.reduce((sum, p) => sum + p.points.length, 0) || 0;
    const crossingCount = kingdom.rivers?.crossings?.length || 0;
    const waterfallCount = kingdom.rivers?.waterfalls?.length || 0;
    const lakeCount = kingdom.waterFeatures?.lakes?.length || 0;
    const swampCount = kingdom.waterFeatures?.swamps?.length || 0;
    
    return `r${pathCount}-p${pointCount}-c${crossingCount}-w${waterfallCount}-l${lakeCount}-s${swampCount}`;
  }
  
  /**
   * Force rebuild of all waterway data
   * Call this from map editor after making changes
   */
  forceRebuild(): void {
    this.lastRiverDataHash = ''; // Clear hash to force rebuild
    if (this.lastKingdomData) {
      logger.info('[WaterwayLookup] Forcing rebuild of waterway data');
      this.buildLookup(this.lastKingdomData);
    }
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
        waterfalls: [],
        riverSegments: []
      });
    }
    return this.hexLookup.get(hexKey)!;
  }
  
  /**
   * Build lookup maps from kingdom data
   * Called automatically when kingdom data changes
   */
  private buildLookup(kingdom: KingdomData): void {
    // Check if river data actually changed (optimization)
    const currentHash = this.getRiverDataHash(kingdom);
    const riverDataChanged = currentHash !== this.lastRiverDataHash;
    
    // Only clear and rebuild if river/water data changed
    if (!riverDataChanged && this.hexLookup.size > 0) {
      return; // No changes to river data, skip rebuild
    }
    
    this.lastRiverDataHash = currentHash;
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
    
    // Note: River segments are now received from WaterRenderer via callback
    // This ensures canvas is ready when positions are calculated
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
   * Build waterfall lookup (connection-point-based)
   * Waterfalls block naval travel but not swimmers
   * 
   * @param waterfalls - Array of connection-point-based waterfall features
   * @param paths - River paths (unused now, kept for compatibility)
   */
  private buildWaterfallLookup(waterfalls: Array<{ id: string; hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number }>, paths: RiverPath[]): void {
    for (const waterfall of waterfalls) {
      // Mark the hex at the connection point as having a waterfall
      const hexKey = this.getHexKey(waterfall.hexI, waterfall.hexJ);
      
      // Create WaterFeature-like object for compatibility with existing code
      const waterfallFeature: WaterFeature = {
        id: waterfall.id,
        hexI: waterfall.hexI,
        hexJ: waterfall.hexJ
      };
      
      this.getOrCreateHexData(hexKey).waterfalls.push(waterfallFeature);
      
      // If waterfall is on an edge, also mark the adjacent hex that shares that edge
      if (waterfall.edge && !waterfall.isCenter) {
        const adjacentHex = this.getAdjacentHexForEdge(waterfall.hexI, waterfall.hexJ, waterfall.edge);
        if (adjacentHex) {
          const adjKey = this.getHexKey(adjacentHex.i, adjacentHex.j);
          const waterfallFeature2: WaterFeature = {
            id: waterfall.id,
            hexI: adjacentHex.i,
            hexJ: adjacentHex.j
          };
          this.getOrCreateHexData(adjKey).waterfalls.push(waterfallFeature2);
        }
      }
    }
  }
  
  /**
   * Build crossing lookup (bridges/fords, connection-point-based)
   * Crossings allow grounded armies to cross water
   * 
   * @param crossings - Array of connection-point-based crossing features
   * @param paths - River paths (unused now, kept for compatibility)
   */
  private buildCrossingLookup(crossings: RiverCrossing[], paths: RiverPath[]): void {
    for (const crossing of crossings) {
      // Mark the hex at the connection point as having a crossing
      const hexKey = this.getHexKey(crossing.hexI, crossing.hexJ);
      this.getOrCreateHexData(hexKey).crossings.add(crossing.type);
      
      // If crossing is on an edge, also mark the adjacent hex that shares that edge
      if (crossing.edge && !crossing.isCenter) {
        const adjacentHex = this.getAdjacentHexForEdge(crossing.hexI, crossing.hexJ, crossing.edge);
        if (adjacentHex) {
          const adjKey = this.getHexKey(adjacentHex.i, adjacentHex.j);
          this.getOrCreateHexData(adjKey).crossings.add(crossing.type);
        }
      }
    }
  }
  
  // Note: River segments are now received from WaterRenderer via receiveSegmentsFromRenderer()
  // This ensures canvas is ready when positions are calculated
  
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
   * Check if movement between two hexes crosses a river (without a crossing)
   * Uses precomputed blocked edge data from WaterwayGeometryService for O(1) lookup.
   * 
   * Blocked edges are computed by the geometry service when kingdom data changes,
   * independently of rendering.
   * 
   * @param fromHexI - Source hex row
   * @param fromHexJ - Source hex column
   * @param toHexI - Destination hex row
   * @param toHexJ - Destination hex column
   * @returns true if movement crosses a river without a crossing
   */
  doesMovementCrossRiver(fromHexI: number, fromHexJ: number, toHexI: number, toHexJ: number): boolean {
    // Check if geometry has been computed yet
    if (!waterwayGeometryService.isGeometryReady()) {
      logger.debug(`[WaterwayLookup] Geometry not ready yet (canvas may not be initialized)`);
      return false;  // Can't block until we have geometry data
    }
    
    // Convert to hex IDs and do O(1) lookup
    const fromHexId = `${fromHexI}.${fromHexJ}`;
    const toHexId = `${toHexI}.${toHexJ}`;
    
    const blocked = waterwayGeometryService.isEdgeBlocked(fromHexId, toHexId);
    
    if (blocked) {
      logger.info(`[WaterwayLookup] Movement ${fromHexId} → ${toHexId} BLOCKED by river`);
    }
    
    return blocked;
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
