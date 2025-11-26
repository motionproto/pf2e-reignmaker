/**
 * WaterwayGeometryService - Deterministic river geometry calculator
 * 
 * Decouples river segment computation from rendering:
 * - Reads kingdom river/crossing/waterfall data
 * - Computes pixel positions for all segments
 * - Precomputes blocked edges for movement
 * - Provides data to both WaterwayLookup (pathfinding) and WaterRenderer (display)
 * 
 * This service rebuilds geometry when kingdom data changes, ensuring
 * pathfinding doesn't depend on rendering lifecycle.
 */

import type { KingdomData, RiverPath, RiverCrossing } from '../../actors/KingdomActor';
import { kingdomData } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { getEdgeMidpoint, getHexCenter } from '../../utils/riverUtils';
import type { EdgeDirection } from '../../models/Hex';
import { lineSegmentsIntersect, type Point } from '../../utils/geometryUtils';
import { getAdjacentHexes } from '../../utils/hexUtils';
import { writable, derived, get } from 'svelte/store';

/**
 * River segment with pixel coordinates
 */
export interface WaterwaySegment {
  pathId: string;
  segmentIndex: number;
  start: Point;
  end: Point;
  hasCrossing: boolean;
}

/**
 * Computed geometry data
 */
interface WaterwayGeometry {
  segments: WaterwaySegment[];
  blockedEdges: Set<string>;  // Canonical hex pair keys
  isReady: boolean;
}

/**
 * WaterwayGeometryService - Computes river geometry from kingdom data
 */
class WaterwayGeometryService {
  // Internal store for computed geometry
  private geometryStore = writable<WaterwayGeometry>({
    segments: [],
    blockedEdges: new Set(),
    isReady: false
  });
  
  // Derived stores for easy access
  public readonly segments = derived(this.geometryStore, $g => $g.segments);
  public readonly blockedEdges = derived(this.geometryStore, $g => $g.blockedEdges);
  public readonly isReady = derived(this.geometryStore, $g => $g.isReady);
  
  private unsubscribe: (() => void) | null = null;
  private lastKingdomDataHash: string = '';
  
  constructor() {
    // Subscribe to kingdom data changes and rebuild geometry
    this.unsubscribe = kingdomData.subscribe(kingdom => {
      this.rebuild(kingdom);
    });
    
    logger.info('[WaterwayGeometryService] Initialized with reactive kingdom data subscription');
  }
  
  /**
   * Calculate hash of river data to detect changes
   */
  private getRiverDataHash(kingdom: KingdomData): string {
    const pathCount = kingdom.rivers?.paths?.length || 0;
    const pointCount = kingdom.rivers?.paths?.reduce((sum, p) => sum + p.points.length, 0) || 0;
    const crossingCount = kingdom.rivers?.crossings?.length || 0;
    const waterfallCount = kingdom.rivers?.waterfalls?.length || 0;
    
    return `r${pathCount}-p${pointCount}-c${crossingCount}-w${waterfallCount}`;
  }
  
  /**
   * Rebuild geometry from kingdom data
   * Called automatically when kingdom data changes
   */
  rebuild(kingdom: KingdomData): void {
    console.log('[WaterwayGeometryService] rebuild() called');
    const canvas = (globalThis as any).canvas;
    
    // Can't compute geometry without canvas grid
    if (!canvas?.grid) {
      console.warn('[WaterwayGeometryService] Canvas not ready - returning early');
      logger.warn('[WaterwayGeometryService] Canvas not ready - geometry deferred. Waiting for canvas initialization.');
      this.geometryStore.set({
        segments: [],
        blockedEdges: new Set(),
        isReady: false
      });
      return;
    }
    console.log('[WaterwayGeometryService] Canvas is ready');
    
    // Check if river data changed (optimization)
    const currentHash = this.getRiverDataHash(kingdom);
    console.log('[WaterwayGeometryService] Current hash:', currentHash);
    console.log('[WaterwayGeometryService] Last hash:', this.lastKingdomDataHash);
    if (currentHash === this.lastKingdomDataHash) {
      console.log('[WaterwayGeometryService] Hash unchanged - skipping rebuild');
      return; // No changes
    }
    this.lastKingdomDataHash = currentHash;
    
    console.log('[WaterwayGeometryService] ========== REBUILDING GEOMETRY ==========');
    console.log('[WaterwayGeometryService] River paths:', kingdom.rivers?.paths?.length || 0);
    console.log('[WaterwayGeometryService] Hexes:', kingdom.hexes?.length || 0);
    logger.info('[WaterwayGeometryService] Rebuilding geometry from kingdom data');
    
    // Compute segments
    const segments = this.computeSegments(kingdom, canvas);
    console.log('[WaterwayGeometryService] Computed segments:', segments.length);
    
    // Compute blocked edges
    const blockedEdges = this.computeBlockedEdges(kingdom.hexes || [], segments, canvas);
    console.log('[WaterwayGeometryService] Computed blocked edges:', blockedEdges.size);
    
    // Update store
    this.geometryStore.set({
      segments,
      blockedEdges,
      isReady: true
    });
    
    logger.info(`[WaterwayGeometryService] Geometry ready: ${segments.length} segments, ${blockedEdges.size} blocked edges`);
  }
  
  /**
   * Compute river segments with pixel coordinates
   */
  private computeSegments(kingdom: KingdomData, canvas: any): WaterwaySegment[] {
    const segments: WaterwaySegment[] = [];
    
    if (!kingdom.rivers?.paths) {
      return segments;
    }
    
    // Build crossing lookup
    const crossingSet = new Set<string>();
    for (const crossing of kingdom.rivers.crossings || []) {
      if (crossing.pathId && crossing.segmentIndex !== undefined) {
        crossingSet.add(`${crossing.pathId}:${crossing.segmentIndex}`);
      }
    }
    
    // Process each path
    for (const path of kingdom.rivers.paths) {
      const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
      
      // Create segments from consecutive point pairs
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i + 1];
        
        // Get pixel positions for any hex connection point (center, edge, or corner)
        const pos1 = this.getConnectorPosition(p1, canvas);
        const pos2 = this.getConnectorPosition(p2, canvas);
        
        if (!pos1 || !pos2) continue;
        
        // Check if this segment has a crossing
        const crossingKey = `${path.id}:${i}`;
        const hasCrossing = crossingSet.has(crossingKey);
        
        segments.push({
          pathId: path.id,
          segmentIndex: i,
          start: pos1,
          end: pos2,
          hasCrossing
        });
      }
    }
    
    return segments;
  }

  /**
   * Convert a RiverPathPoint into a pixel position using the unified
   * hex connection point model (center, edge, corner).
   */
  private getConnectorPosition(
    point: { hexI: number; hexJ: number; isCenter?: boolean; edge?: string; cornerIndex?: number },
    canvas: any
  ): Point | null {
    if (point.isCenter) {
      return getHexCenter(point.hexI, point.hexJ, canvas) as Point | null;
    }
    
    if (point.edge) {
      return getEdgeMidpoint(point.hexI, point.hexJ, point.edge as EdgeDirection, canvas) as Point | null;
    }
    
    if (point.cornerIndex !== undefined) {
      const vertices = canvas.grid.getVertices({ i: point.hexI, j: point.hexJ });
      if (!vertices || vertices.length <= point.cornerIndex) {
        return null;
      }
      const v = vertices[point.cornerIndex];
      return { x: v.x, y: v.y };
    }
    
    return null;
  }
  
  /**
   * Compute which hex-to-hex edges are blocked by rivers
   * Precomputes intersection tests for O(1) pathfinding lookups
   */
  private computeBlockedEdges(
    hexes: Array<{ id: string }>,
    segments: WaterwaySegment[],
    canvas: any
  ): Set<string> {
    const blockedEdges = new Set<string>();
    
    // Get segments that don't have crossings (only these block movement)
    const blockingSegments = segments.filter(s => !s.hasCrossing);
    
    console.log(`[WaterwayGeometryService] Computing blocked edges: ${hexes.length} hexes, ${blockingSegments.length} blocking segments`);
    
    if (blockingSegments.length === 0) {
      return blockedEdges;
    }
    
    // Track processed edges to avoid duplicate checks
    const processedEdges = new Set<string>();
    
    // For each hex, check movement to all neighbors
    for (const hex of hexes) {
      const parts = hex.id.split('.');
      if (parts.length !== 2) continue;
      
      const hexI = parseInt(parts[0], 10);
      const hexJ = parseInt(parts[1], 10);
      if (isNaN(hexI) || isNaN(hexJ)) continue;
      
      // Get hex center
      const fromCenter = canvas.grid.getCenterPoint({ i: hexI, j: hexJ });
      if (!fromCenter) continue;
      
      // Get all 6 neighbors
      const neighbors = getAdjacentHexes(hexI, hexJ);
      
      for (const neighbor of neighbors) {
        const neighborId = `${neighbor.i}.${neighbor.j}`;
        
        // Create canonical edge key (smaller ID first)
        const edgeKey = hex.id < neighborId 
          ? `${hex.id}->${neighborId}` 
          : `${neighborId}->${hex.id}`;
        
        // Skip if already processed
        if (processedEdges.has(edgeKey)) continue;
        processedEdges.add(edgeKey);
        
        // Get neighbor center
        const toCenter = canvas.grid.getCenterPoint({ i: neighbor.i, j: neighbor.j });
        if (!toCenter) continue;
        
        // Check if movement line intersects any blocking river segment
        for (const segment of blockingSegments) {
          if (lineSegmentsIntersect(fromCenter, toCenter, segment.start, segment.end)) {
            console.log(`[WaterwayGeometryService] BLOCKED: ${hex.id} -> ${neighborId} intersects segment ${segment.pathId}:${segment.segmentIndex}`);
            console.log(`  Movement line: (${fromCenter.x},${fromCenter.y}) -> (${toCenter.x},${toCenter.y})`);
            console.log(`  River segment: (${segment.start.x},${segment.start.y}) -> (${segment.end.x},${segment.end.y})`);
            blockedEdges.add(edgeKey);
            break; // No need to check more segments for this edge
          }
        }
      }
    }
    
    return blockedEdges;
  }
  
  /**
   * Check if a hex-to-hex edge is blocked by a river
   */
  isEdgeBlocked(fromHexId: string, toHexId: string): boolean {
    const geometry = get(this.geometryStore);
    if (!geometry.isReady) {
      return false; // Can't block if geometry not computed
    }
    
    // Create canonical key
    const edgeKey = fromHexId < toHexId 
      ? `${fromHexId}->${toHexId}` 
      : `${toHexId}->${fromHexId}`;
    
    return geometry.blockedEdges.has(edgeKey);
  }
  
  /**
   * Get all segments (for rendering)
   */
  getSegments(): WaterwaySegment[] {
    return get(this.geometryStore).segments;
  }
  
  /**
   * Get all blocked edges (for debugging)
   */
  getBlockedEdges(): Set<string> {
    return get(this.geometryStore).blockedEdges;
  }
  
  /**
   * Check if geometry is ready
   */
  isGeometryReady(): boolean {
    return get(this.geometryStore).isReady;
  }
  
  /**
   * Force rebuild (for editor use)
   */
  forceRebuild(): void {
    console.log('[WaterwayGeometryService] ========== FORCE REBUILD CALLED ==========');
    this.lastKingdomDataHash = ''; // Clear cache
    const kingdom = get(kingdomData);
    console.log('[WaterwayGeometryService] Kingdom has rivers?', !!kingdom.rivers?.paths);
    console.log('[WaterwayGeometryService] Kingdom has hexes?', !!kingdom.hexes);
    this.rebuild(kingdom);
  }
  
  /**
   * Cleanup subscription
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Export singleton instance
export const waterwayGeometryService = new WaterwayGeometryService();

