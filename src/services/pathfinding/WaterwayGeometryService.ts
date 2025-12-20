/**
 * WaterwayGeometryService - River barrier segment calculator
 *
 * Computes river segments as barrier lines for pathfinding:
 * - Reads kingdom river/crossing data
 * - Computes pixel positions for all segments
 * - Segments are used for line intersection checks during pathfinding
 *
 * This service rebuilds geometry when kingdom data changes.
 */

import type { KingdomData, RiverPath } from '../../actors/KingdomActor';
import { kingdomData } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { getEdgeMidpoint, getHexCenter } from '../../utils/riverUtils';
import type { EdgeDirection } from '../../models/Hex';
import type { Point } from '../../utils/geometryUtils';
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
  isReady: boolean;
}

/**
 * WaterwayGeometryService - Computes river geometry from kingdom data
 */
class WaterwayGeometryService {
  // Internal store for computed geometry
  private geometryStore = writable<WaterwayGeometry>({
    segments: [],
    isReady: false
  });

  // Derived stores for easy access
  public readonly segments = derived(this.geometryStore, $g => $g.segments);
  public readonly isReady = derived(this.geometryStore, $g => $g.isReady);
  
  private unsubscribe: (() => void) | null = null;
  private lastKingdomDataHash: string = '';
  
  constructor() {
    // Create a derived store that only tracks river data changes
    const riverDataStore = derived(kingdomData, $kingdom => ({
      kingdom: $kingdom,
      hash: this.getRiverDataHash($kingdom)
    }));
    
    // Subscribe to river data changes only (not all kingdom data changes)
    this.unsubscribe = riverDataStore.subscribe(({ kingdom, hash }) => {
      // Only rebuild if hash actually changed
      if (hash !== this.lastKingdomDataHash) {
        this.rebuild(kingdom);
      }
    });
    
    logger.info('[WaterwayGeometryService] Initialized with reactive river data subscription');
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
   * Called automatically when river data changes (not all kingdom data changes)
   */
  rebuild(kingdom: KingdomData): void {
    const canvas = (globalThis as any).canvas;
    
    // Can't compute geometry without canvas grid
    if (!canvas?.grid) {
      logger.warn('[WaterwayGeometryService] Canvas not ready - geometry deferred. Waiting for canvas initialization.');
      this.geometryStore.set({
        segments: [],
        isReady: false
      });
      return;
    }

    // Update hash (checked in derived store now)
    const currentHash = this.getRiverDataHash(kingdom);
    this.lastKingdomDataHash = currentHash;

    // Compute segments (barrier lines)
    const segments = this.computeSegments(kingdom, canvas);

    // Update store
    this.geometryStore.set({
      segments,
      isReady: true
    });

    logger.info(`[WaterwayGeometryService] Geometry ready: ${segments.length} barrier segments`);
  }
  
  /**
   * Compute river segments with pixel coordinates
   */
  private computeSegments(kingdom: KingdomData, canvas: any): WaterwaySegment[] {
    const segments: WaterwaySegment[] = [];
    
    if (!kingdom.rivers?.paths) {
      return segments;
    }
    
    // Build crossing lookup (connection-point-based)
    // Create a set of connection point keys that have crossings
    const crossingPointSet = new Set<string>();
    for (const crossing of kingdom.rivers.crossings || []) {
      // Create key from connection point coordinates
      const key = `${crossing.hexI},${crossing.hexJ},${crossing.edge || ''},${crossing.isCenter || false},${crossing.cornerIndex ?? ''}`;
      crossingPointSet.add(key);
    }
    
    // Helper function to create connection point key
    const getPointKey = (point: any): string => {
      return `${point.hexI},${point.hexJ},${point.edge || ''},${point.isCenter || false},${point.cornerIndex ?? ''}`;
    };
    
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
        
        // Check if either endpoint of this segment has a crossing
        const hasCrossing = crossingPointSet.has(getPointKey(p1)) || crossingPointSet.has(getPointKey(p2));
        
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
   * Get all segments (for rendering and intersection checks)
   */
  getSegments(): WaterwaySegment[] {
    return get(this.geometryStore).segments;
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
    this.lastKingdomDataHash = ''; // Clear cache
    const kingdom = get(kingdomData);
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
